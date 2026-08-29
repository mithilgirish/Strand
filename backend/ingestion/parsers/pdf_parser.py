"""
Two-pass extraction:
1. PyMuPDF for text and table extraction
2. Regex patterns for engineering parameter values
Falls back to Unstructured.io if PyMuPDF tables fail.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from loguru import logger

# ── Engineering parameter regex patterns ─────────────────────────────
PARAMETER_PATTERNS: dict[str, re.Pattern] = {
    "ambient_temperature_max": re.compile(
        r"(?:ambient|operating)\s*(?:temperature|temp)[:\s]*(\d+(?:\.\d+)?)\s*°?C",
        re.IGNORECASE,
    ),
    "cooling_capacity": re.compile(
        r"(?:cooling)\s*(?:capacity)[:\s]*(\d+(?:\.\d+)?)\s*(?:kW|KW)",
        re.IGNORECASE,
    ),
    "generator_fuel_consumption": re.compile(
        r"(?:fuel)\s*(?:consumption)[:\s]*(?:≤|<=|<)?\s*(\d+(?:\.\d+)?)\s*(?:l/?hr|litres?\s*(?:per\s*hour)?|L/h)",
        re.IGNORECASE,
    ),
    "ups_redundancy": re.compile(
        r"(?:UPS)\s*(?:redundancy)[:\s]*(N\+\d+|2N|2N\+1)",
        re.IGNORECASE,
    ),
    "floor_loading": re.compile(
        r"(?:floor)\s*(?:loading|load)\s*(?:capacity)?[:\s]*(\d+(?:\.\d+)?)\s*kN/m",
        re.IGNORECASE,
    ),
    "cable_derating": re.compile(
        r"(?:cable)\s*(?:derating)\s*(?:factor)?[:\s]*(\d+(?:\.\d+)?)",
        re.IGNORECASE,
    ),
    "chilled_water_supply_temp": re.compile(
        r"(?:chilled)\s*(?:water)\s*(?:supply)?\s*(?:temperature|temp)[:\s]*(\d+(?:\.\d+)?)\s*°?C",
        re.IGNORECASE,
    ),
    "pdu_efficiency": re.compile(
        r"(?:PDU)\s*(?:efficiency)[:\s]*(?:≥|>=|>)?\s*(\d+(?:\.\d+)?)\s*%",
        re.IGNORECASE,
    ),
    "water_flow": re.compile(
        r"(?:water)\s*(?:flow)\s*(?:rate)?[:\s]*(\d+(?:\.\d+)?)\s*(?:GPM|gpm)",
        re.IGNORECASE,
    ),
    "noise_level": re.compile(
        r"(?:noise|acoustic|sound)\s*(?:level)?[:\s]*(\d+(?:\.\d+)?)\s*(?:dB|dBA)",
        re.IGNORECASE,
    ),
}

# Section reference pattern
SECTION_PATTERN = re.compile(r"§\s*(\d+(?:\.\d+)+)|section\s+(\d+(?:\.\d+)+)", re.IGNORECASE)


def extract_text_from_pdf(file_path: str) -> list[dict]:
    """
    Extract text from a PDF using PyMuPDF.

    Returns:
        List of {page: int, text: str, tables: list[list]}
    """
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(file_path)
        pages = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")

            # If the page is a scanned raster drawing with no vector text, OCR it
            if len(text.strip()) < 10:
                try:
                    import io

                    import pytesseract
                    from PIL import Image

                    pix = page.get_pixmap(dpi=150)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img)
                    if ocr_text.strip():
                        text = ocr_text
                except Exception as ocr_err:
                    logger.debug(f"OCR fallback on page {page_num + 1} skipped: {ocr_err}")

            # Try to extract tables
            tables = []
            try:
                tab_finder = page.find_tables()
                if tab_finder and tab_finder.tables:
                    for table in tab_finder.tables:
                        tables.append(table.extract())
            except BaseException:
                pass  # Tables extraction is best-effort

            pages.append(
                {
                    "page": page_num + 1,
                    "text": text,
                    "tables": tables,
                }
            )

        doc.close()
        return pages

    except ImportError:
        logger.warning("PyMuPDF (fitz) not available, trying fallback")
        return _fallback_extract(file_path)
    except Exception as e:
        logger.error(f"PDF extraction failed for {file_path}: {e}")
        return _fallback_extract(file_path)


def extract_text_from_image(file_path: str) -> list[dict]:
    """Extract text from an image file (PNG, JPG, TIFF) using OCR."""
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)
        return [{"page": 1, "text": text, "tables": []}]
    except Exception as e:
        logger.warning(f"Image OCR extraction failed for {file_path}: {e}")
        return _fallback_extract(file_path)


def _fallback_extract(file_path: str) -> list[dict]:
    """Fallback extraction using basic text reading."""
    try:
        with open(file_path, "rb") as f:
            content = f.read()
        # Basic text extraction attempt
        text = content.decode("utf-8", errors="ignore")
        return [{"page": 1, "text": text, "tables": []}]
    except Exception as e:
        logger.error(f"Fallback extraction also failed: {e}")
        return [{"page": 1, "text": "", "tables": []}]


def extract_parameters_from_pdf(file_path: str) -> dict[str, dict]:
    """
    Extract engineering parameters from a PDF.

    Two-pass extraction:
    1. Regex patterns for known engineering values
    2. Table extraction for structured parameter data

    Returns:
        Dict of {param_name: {value, unit, page, confidence, section}}
    """
    pages = extract_text_from_pdf(file_path)
    parameters: dict[str, dict] = {}

    for page_data in pages:
        page_num = page_data["page"]
        text = page_data["text"]

        # Pass 1: Regex extraction from text
        for param_name, pattern in PARAMETER_PATTERNS.items():
            match = pattern.search(text)
            if match:
                value = match.group(1)
                # Find nearest section reference
                section = _find_nearest_section(text, match.start())

                try:
                    parsed_value = float(value)
                except ValueError:
                    parsed_value = value

                parameters[param_name] = {
                    "value": parsed_value,
                    "unit": _infer_unit(param_name),
                    "page": page_num,
                    "confidence": 0.9,
                    "section": section,
                    "source": "regex",
                }

        # Pass 2: Table extraction
        for table in page_data.get("tables", []):
            table_params = _extract_params_from_table(table, page_num)
            for name, data in table_params.items():
                if name not in parameters:  # regex takes priority
                    parameters[name] = data

    logger.info(f"Extracted {len(parameters)} parameters from {file_path}")
    return parameters


def _extract_params_from_table(table: list[list], page_num: int) -> dict[str, dict]:
    """Extract parameters from a table structure."""
    params = {}
    if not table or len(table) < 2:
        return params

    # Look for Parameter/Value column patterns
    headers = [str(cell).lower().strip() for cell in table[0] if cell]

    param_col = None
    value_col = None
    for i, h in enumerate(headers):
        if "parameter" in h or "item" in h or "description" in h:
            param_col = i
        if "value" in h or "submitted" in h or "actual" in h:
            value_col = i

    if param_col is None or value_col is None:
        # Try first two columns
        if len(headers) >= 2:
            param_col = 0
            value_col = 1
        else:
            return params

    for row in table[1:]:
        if len(row) <= max(param_col, value_col):
            continue
        raw_name = str(row[param_col]).strip()
        raw_value = str(row[value_col]).strip()

        if not raw_name or not raw_value:
            continue

        # Normalise parameter name
        param_name = _normalise_param_name(raw_name)
        if not param_name:
            continue

        # Parse value
        parsed_value, unit = _parse_value_with_unit(raw_value)

        params[param_name] = {
            "value": parsed_value,
            "unit": unit,
            "page": page_num,
            "confidence": 0.85,
            "section": "",
            "source": "table",
        }

    return params


def _normalise_param_name(raw: str) -> str:
    """Normalise a raw parameter description to a snake_case name."""
    mapping = {
        "maximum ambient temperature": "ambient_temperature_max",
        "ambient temperature": "ambient_temperature_max",
        "cooling capacity": "cooling_capacity",
        "fuel consumption": "generator_fuel_consumption",
        "generator fuel consumption": "generator_fuel_consumption",
        "ups redundancy": "ups_redundancy",
        "ups redundancy level": "ups_redundancy",
        "floor loading": "floor_loading",
        "cable derating": "cable_derating",
        "water flow rate": "water_flow",
        "noise level": "noise_level",
        "pdu efficiency": "pdu_efficiency",
        "efficiency": "pdu_efficiency",
        "equipment type": "equipment_type",
        "capacity": "cooling_capacity",
        "output": "output_power",
        "emissions": "emissions_tier",
    }
    normalised = raw.lower().strip()
    return mapping.get(normalised, "")


def _parse_value_with_unit(raw: str) -> tuple[Any, str]:
    """Parse a value string into (numeric_value, unit)."""
    # Try to extract number and unit
    match = re.match(r"([≤≥<>]?\s*)(\d+(?:\.\d+)?)\s*(.*)", raw)
    if match:
        try:
            value = float(match.group(2))
        except ValueError:
            value = raw
        unit = match.group(3).strip()
        return value, unit

    # Non-numeric value
    return raw, ""


def _find_nearest_section(text: str, position: int) -> str:
    """Find the nearest section reference before the given position."""
    matches = list(SECTION_PATTERN.finditer(text[:position]))
    if matches:
        last = matches[-1]
        return last.group(1) or last.group(2) or ""
    return ""


def _infer_unit(param_name: str) -> str:
    """Infer the unit from parameter name."""
    unit_map = {
        "ambient_temperature_max": "°C",
        "cooling_capacity": "kW",
        "generator_fuel_consumption": "l/hr",
        "floor_loading": "kN/m²",
        "cable_derating": "",
        "chilled_water_supply_temp": "°C",
        "pdu_efficiency": "%",
        "water_flow": "GPM",
        "noise_level": "dBA",
    }
    return unit_map.get(param_name, "")
