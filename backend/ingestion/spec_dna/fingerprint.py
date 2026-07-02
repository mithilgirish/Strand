# backend/ingestion/spec_dna/fingerprint.py — SHA-256 Spec-DNA ID generator per PRD §5.4
"""
Spec-DNA is a deterministic SHA-256 ID written onto every entity the moment
it's ingested. It serves as the universal lineage identifier across the PKG.

Formula: SHA256(document_source + "|" + section + "|" + parameter_name + "|" + str(parameter_value))
"""
from __future__ import annotations

import hashlib
from typing import Any, Optional


def generate_spec_dna_id(
    document_source: str,
    section: str,
    parameter_name: str,
    parameter_value: Any,
    extra: Optional[str] = None,
) -> str:
    """
    Generate a deterministic Spec-DNA ID (SHA-256) for a PKG entity.

    Args:
        document_source: Source document filename
        section: Section reference (e.g., '6.7.1')
        parameter_name: Parameter name (e.g., 'ambient_temperature_max')
        parameter_value: The parameter value
        extra: Optional extra differentiator (e.g., equipment tag)

    Returns:
        SHA-256 hex digest string (64 chars)
    """
    components = [
        str(document_source).strip(),
        str(section).strip(),
        str(parameter_name).strip(),
        str(parameter_value).strip(),
    ]
    if extra:
        components.append(str(extra).strip())

    fingerprint_input = "|".join(components)
    return hashlib.sha256(fingerprint_input.encode("utf-8")).hexdigest()


def generate_submittal_spec_dna(
    submittal_id: str,
    vendor_name: str,
    equipment_tag: str,
) -> str:
    """Generate Spec-DNA for a VendorSubmittal node."""
    return generate_spec_dna_id(
        document_source=submittal_id,
        section="submittal",
        parameter_name=equipment_tag,
        parameter_value=vendor_name,
    )


def generate_ncr_spec_dna(
    ncr_id: str,
    equipment_tag: str,
    parameter_name: str,
) -> str:
    """Generate Spec-DNA for an NCR node."""
    return generate_spec_dna_id(
        document_source=ncr_id,
        section="ncr",
        parameter_name=parameter_name,
        parameter_value=equipment_tag,
    )
