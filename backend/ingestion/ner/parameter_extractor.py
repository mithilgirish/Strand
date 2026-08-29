"""
Two-pass parameter extraction:
1. Regex primary patterns for known engineering values (temperatures, pressures, flows)
2. spaCy NER fallback for entities not caught by regex

Per PRD: regex is the primary pass, NER is fallback — not the other way around.
"""

from __future__ import annotations

import re
from typing import Any

from loguru import logger

# ── Engineering parameter extraction patterns ────────────────────────
ENGINEERING_PATTERNS = [
    # Temperature values
    {
        "name": "temperature",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*°?\s*(?:C|Celsius|centigrade)",
            re.IGNORECASE,
        ),
        "unit": "°C",
        "param_prefix": "temp",
    },
    # Power/capacity values
    {
        "name": "power",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*(?:kW|KW|kilowatt)",
            re.IGNORECASE,
        ),
        "unit": "kW",
        "param_prefix": "power",
    },
    # Flow rates
    {
        "name": "flow_rate",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*(?:GPM|gpm|gallons?\s*per\s*minute)",
            re.IGNORECASE,
        ),
        "unit": "GPM",
        "param_prefix": "flow",
    },
    # Fuel consumption
    {
        "name": "fuel",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*(?:l/?h|l/?hr|litres?\s*per\s*hour|L/h)",
            re.IGNORECASE,
        ),
        "unit": "l/hr",
        "param_prefix": "fuel",
    },
    # Pressure
    {
        "name": "pressure",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*(?:kPa|psi|bar|Pa)",
            re.IGNORECASE,
        ),
        "unit": "kPa",
        "param_prefix": "pressure",
    },
    # Voltage
    {
        "name": "voltage",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*(?:VDC|VAC|V|volts?)",
            re.IGNORECASE,
        ),
        "unit": "V",
        "param_prefix": "voltage",
    },
    # Percentage
    {
        "name": "efficiency",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*%",
            re.IGNORECASE,
        ),
        "unit": "%",
        "param_prefix": "efficiency",
    },
    # Resistance
    {
        "name": "resistance",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*(?:Ohm|ohm|Ω)",
            re.IGNORECASE,
        ),
        "unit": "Ohm",
        "param_prefix": "resistance",
    },
    # Noise level
    {
        "name": "noise",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*(?:dB|dBA)",
            re.IGNORECASE,
        ),
        "unit": "dBA",
        "param_prefix": "noise",
    },
    # Vibration
    {
        "name": "vibration",
        "pattern": re.compile(
            r"(\d+(?:\.\d+)?)\s*(?:mm/s)",
            re.IGNORECASE,
        ),
        "unit": "mm/s",
        "param_prefix": "vibration",
    },
]


def extract_engineering_entities(text: str, page: int = 1) -> list[dict[str, Any]]:
    """
    Extract engineering parameter entities from text.

    Pass 1: Regex patterns (primary)
    Pass 2: spaCy NER (fallback, if available)

    Returns:
        List of extracted entities with value, unit, page, confidence
    """
    entities = []

    # Pass 1: Regex extraction
    for pattern_def in ENGINEERING_PATTERNS:
        for match in pattern_def["pattern"].finditer(text):
            try:
                value = float(match.group(1))
            except ValueError:
                value = match.group(1)

            # Get surrounding context for parameter identification
            start = max(0, match.start() - 80)
            end = min(len(text), match.end() + 30)
            context = text[start:end].strip()

            entities.append(
                {
                    "value": value,
                    "unit": pattern_def["unit"],
                    "type": pattern_def["name"],
                    "param_prefix": pattern_def["param_prefix"],
                    "page": page,
                    "confidence": 0.9,
                    "context": context,
                    "source": "regex",
                    "position": match.start(),
                }
            )

    # Pass 2: spaCy NER fallback
    spacy_entities = _spacy_ner_extract(text, page)
    for ent in spacy_entities:
        # Only add if not already found by regex (avoid duplicates)
        if not any(abs(e["position"] - ent.get("position", -1)) < 10 for e in entities):
            entities.append(ent)

    logger.debug(f"Extracted {len(entities)} entities from page {page}")
    return entities


def _spacy_ner_extract(text: str, page: int) -> list[dict]:
    """
    spaCy NER fallback extraction.
    Attempts to load spaCy; returns empty list if not available.
    """
    try:
        import spacy

        nlp = spacy.load("en_core_web_sm")
        doc = nlp(text)

        entities = []
        for ent in doc.ents:
            if ent.label_ in ("QUANTITY", "CARDINAL", "PERCENT"):
                entities.append(
                    {
                        "value": ent.text,
                        "unit": "",
                        "type": ent.label_.lower(),
                        "param_prefix": "ner",
                        "page": page,
                        "confidence": 0.7,
                        "context": text[max(0, ent.start_char - 40) : ent.end_char + 20],
                        "source": "spacy_ner",
                        "position": ent.start_char,
                    }
                )
        return entities

    except (ImportError, OSError):
        # spaCy not available or model not downloaded — this is expected
        return []
