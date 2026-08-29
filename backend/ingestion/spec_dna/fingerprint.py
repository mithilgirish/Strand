# backend/ingestion/spec_dna/fingerprint.py — SHA-256 Spec-DNA ID generator per PRD §5.4
"""
Spec-DNA is a deterministic SHA-256 ID written onto every entity the moment
it's ingested. It serves as the universal lineage identifier across the PKG.

Formula: SHA256(JSON(parameter_name, parameter_value, document_source, section))
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Optional


def generate_spec_dna_id(
    parameter_name: str,
    parameter_value: Any,
    document_source: str,
    section: str,
    extra: str | None = None,
) -> str:
    """
    Generate a deterministic Spec-DNA ID (SHA-256) for a PKG entity.

    Args:
        parameter_name: Parameter name (e.g., 'ambient_temperature_max')
        parameter_value: The parameter value
        document_source: Source document filename
        section: Section reference (e.g., '6.7.1')
        extra: Optional extra differentiator (e.g., equipment tag)

    Returns:
        SHA-256 hex digest prefix (16 chars)
    """
    payload = {
        "param": str(parameter_name).strip(),
        "value": str(parameter_value).strip(),
        "source": str(document_source).strip(),
        "section": str(section).strip(),
    }
    if extra:
        payload["extra"] = str(extra).strip()

    fingerprint_input = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(fingerprint_input.encode("utf-8")).hexdigest()[:16]


def generate_submittal_spec_dna(
    submittal_id: str,
    vendor_name: str,
    equipment_tag: str,
) -> str:
    """Generate Spec-DNA for a VendorSubmittal node."""
    return generate_spec_dna_id(
        parameter_name=equipment_tag,
        parameter_value=vendor_name,
        document_source=submittal_id,
        section="submittal",
    )


def generate_ncr_spec_dna(
    ncr_id: str,
    equipment_tag: str,
    parameter_name: str,
) -> str:
    """Generate Spec-DNA for an NCR node."""
    return generate_spec_dna_id(
        parameter_name=parameter_name,
        parameter_value=equipment_tag,
        document_source=ncr_id,
        section="ncr",
    )
