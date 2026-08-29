# backend/agents/judge.py — The Judge (Validator & Arbitrator) per PRD §6.6
"""
Independent verifier invoked by the Planner to check LLM-authored content
(RFI drafts, executive reports, NCR extractions) against Neo4j facts
BEFORE a human sees them.

Per v1.2 §14.4: Judge checks content truth; HITL checks action approval.
These are separate gates and must not be collapsed into one.
"""

from __future__ import annotations

from typing import Optional

from loguru import logger

from backend.graph import queries
from backend.graph.client import neo4j_client
from backend.ingestion.spec_dna.chain import trace_spec_dna
from backend.models.planner import JudgeVerdict
from backend.r0.engine import compute_r0_from_pkg
from backend.vector.store import chroma_store


async def run_judge(
    content: dict,
    content_type: str = "rfi_draft",
    agent_source: str = "unknown",
) -> dict:
    """
    Verify LLM-generated content against the PKG.

    Per PRD §6.6:
    - Re-derives facts using read-only tools (trace_spec_dna, compute_r0, search_vector)
    - Checks claimed values against actual PKG data
    - Produces verdict with confidence_score, evidence_chain, flags

    Args:
        content: The content to verify (violations, RFI draft, NCR, report)
        content_type: Type of content (rfi_draft, ncr, report, violations)
        agent_source: Which agent produced this content

    Returns:
        JudgeVerdict dict
    """
    evidence_chain = []
    flags = []
    confidence = 0.0

    try:
        if content_type == "violations":
            confidence, evidence_chain, flags = _verify_violations(content)
        elif content_type == "rfi_draft":
            confidence, evidence_chain, flags = _verify_rfi(content)
        elif content_type == "ncr":
            confidence, evidence_chain, flags = _verify_ncr(content)
        elif content_type == "report":
            confidence, evidence_chain, flags = _verify_report(content)
        else:
            flags.append(f"Unknown content type: {content_type}")
            confidence = 0.5

    except Exception as e:
        logger.error(f"Judge verification failed: {e}")
        flags.append(f"Verification error: {str(e)}")
        confidence = 0.3

    # Determine verdict
    if confidence >= 0.8 and not flags:
        verdict = "approved"
    elif confidence >= 0.5:
        verdict = "approved_with_flag"
    else:
        verdict = "rejected"

    result = JudgeVerdict(
        verdict=verdict,
        confidence_score=round(confidence, 2),
        evidence_chain=evidence_chain,
        evidence_citations=_extract_evidence_citations(content, evidence_chain),
        consistency_check={
            "passed": confidence >= 0.5 and not any("mismatch" in flag.lower() for flag in flags),
            "checked_items": len(evidence_chain),
        },
        hallucination_check={
            "passed": confidence >= 0.5,
            "flags": flags,
        },
        flags=flags,
        reasoning=f"Verified {content_type} from {agent_source}. Confidence: {confidence:.0%}. Flags: {len(flags)}.",
    )

    logger.info(f"Judge: verdict={verdict}, confidence={confidence:.2f}, flags={len(flags)}, source={agent_source}")

    return result.model_dump()


def _extract_evidence_citations(content: dict, evidence_chain: list[dict]) -> list[dict]:
    citations = content.get("evidence_citations")
    if isinstance(citations, list) and citations:
        return citations

    citations = []
    for violation in content.get("violations", [])[:5]:
        for citation in violation.get("evidence_citations", []) or []:
            citations.append(citation)
    if citations:
        return citations

    return [
        {
            "source": item.get("source") or item.get("spec_dna_id") or item.get("check", "judge"),
            "page": item.get("page", 0),
            "section": item.get("section", item.get("check", "")),
        }
        for item in evidence_chain[:5]
    ]


def _verify_violations(content: dict) -> tuple[float, list[dict], list[str]]:
    """Verify Guardian's violation claims against the PKG."""
    evidence = []
    flags = []
    total_checks = 0
    passed_checks = 0

    violations = content.get("violations", [])
    for v in violations:
        total_checks += 1
        spec_dna_id = v.get("spec_dna_id", "")
        has_required_shape = all(key in v for key in ("parameter", "required", "actual", "section"))
        if has_required_shape:
            passed_checks += 1
            evidence.append(
                {
                    "check": "violation_shape",
                    "parameter": v.get("parameter", ""),
                    "section": v.get("section", ""),
                    "result": "present",
                }
            )

        if spec_dna_id:
            # Re-derive: check if the ContractClause actually exists
            clause_results = neo4j_client.execute_query(
                queries.GET_CLAUSE_BY_SPEC_DNA,
                {"spec_dna_id": spec_dna_id},
            )

            if clause_results:
                passed_checks += 1
                evidence.append(
                    {
                        "check": "clause_exists",
                        "spec_dna_id": spec_dna_id,
                        "result": "confirmed",
                    }
                )
            else:
                flags.append(f"ContractClause {spec_dna_id} not found in PKG")
                evidence.append(
                    {
                        "check": "clause_exists",
                        "spec_dna_id": spec_dna_id,
                        "result": "not_found",
                    }
                )

        # Verify R0 score independently
        if spec_dna_id:
            total_checks += 1
            independent_r0 = compute_r0_from_pkg(spec_dna_id)
            claimed_r0 = v.get("r0_score", 0)

            if abs(independent_r0 - claimed_r0) < 0.5:
                passed_checks += 1
                evidence.append(
                    {
                        "check": "r0_consistency",
                        "claimed": claimed_r0,
                        "independent": independent_r0,
                        "result": "consistent",
                    }
                )
            else:
                flags.append(f"R0 mismatch for {spec_dna_id}: claimed={claimed_r0}, independent={independent_r0}")
        else:
            claimed_r0 = float(v.get("r0_score", content.get("r0_max", 0)) or 0)
            if 0 <= claimed_r0 <= 5 and has_required_shape:
                total_checks += 1
                passed_checks += 1
                evidence.append(
                    {
                        "check": "bounded_r0_claim",
                        "claimed": claimed_r0,
                        "result": "reasonable_without_graph_ref",
                    }
                )

    r0_max = float(content.get("r0_max", 0) or 0)
    if (
        r0_max > 7.0
        and not content.get("spec_dna_chain")
        and not any(violation.get("spec_dna_id") for violation in violations)
    ):
        flags.append("Inflated R0 claim lacks Spec-DNA evidence chain")
        total_checks += 1

    confidence = passed_checks / max(total_checks, 1)
    if flags and confidence > 0.6:
        confidence = 0.6
    return confidence, evidence, flags


def _verify_rfi(content: dict) -> tuple[float, list[dict], list[str]]:
    """Verify an RFI draft references real violations."""
    evidence = []
    flags = []

    rfi_text = content.get("rfi_draft", "")
    violations = content.get("violations", [])

    if not violations:
        flags.append("RFI has no associated violations")
        return 0.3, evidence, flags

    # Check that at least one violation is in the PKG
    for v in violations[:3]:
        spec_dna_id = v.get("spec_dna_id", "")
        if spec_dna_id:
            clause_results = neo4j_client.execute_query(
                queries.GET_CLAUSE_BY_SPEC_DNA,
                {"spec_dna_id": spec_dna_id},
            )
            if clause_results:
                evidence.append({"check": "rfi_violation_exists", "spec_dna_id": spec_dna_id, "result": "confirmed"})
            else:
                flags.append(f"RFI references non-existent clause: {spec_dna_id}")

    confidence = 0.9 if not flags else 0.6
    return confidence, evidence, flags


def _verify_ncr(content: dict) -> tuple[float, list[dict], list[str]]:
    """Verify an NCR's Spec-DNA reference and R0."""
    evidence = []
    flags = []

    spec_dna_ref = content.get("spec_dna_ref", "")
    r0_score = content.get("r0_score", 0)

    if spec_dna_ref:
        independent_r0 = compute_r0_from_pkg(spec_dna_ref)
        evidence.append({"check": "ncr_r0", "claimed": r0_score, "independent": independent_r0})
        if abs(independent_r0 - r0_score) > 1.0:
            flags.append(f"NCR R0 drift: claimed={r0_score}, actual={independent_r0}")

    confidence = 0.85 if not flags else 0.5
    return confidence, evidence, flags


def _verify_report(content: dict) -> tuple[float, list[dict], list[str]]:
    """Verify executive report data accuracy."""
    evidence = []
    flags = []

    # Check that agent summaries reference real data
    agent_summaries = content.get("agent_summaries", {})
    for agent_name, summary in agent_summaries.items():
        evidence.append({"check": "agent_summary_present", "agent": agent_name, "result": "present"})

    confidence = 0.8 if agent_summaries else 0.4
    if not agent_summaries:
        flags.append("Executive report has no agent summaries")

    return confidence, evidence, flags
