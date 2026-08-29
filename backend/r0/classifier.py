def r0_to_severity(r0: float) -> str:
    """
    Map R0 score to severity label.

    R0 < 1.0  → Minor
    R0 < 2.5  → Major
    R0 < 5.0  → Critical
    R0 >= 5.0 → Systemic
    """
    if r0 < 1.0:
        return "Minor"
    elif r0 < 2.5:
        return "Major"
    elif r0 < 5.0:
        return "Critical"
    else:
        return "Systemic"


def severity_to_action(severity: str) -> str:
    """Map severity to recommended action."""
    return {
        "Minor": "Monitor — no immediate action required",
        "Major": "Escalate to engineering lead within 48 hours",
        "Critical": "Immediate corrective action required — stop work if safety-related",
        "Systemic": "HALT — systemic failure across multiple subsystems, executive escalation",
    }.get(severity, "Unknown severity level")


def r0_to_action(r0: float) -> str:
    """Map R0 score directly to the recommended action from the baseline plan."""
    if r0 < 1.0:
        return "Monitor — resolve within standard cycle"
    if r0 < 2.5:
        return "Escalate to discipline lead within 48h"
    if r0 < 5.0:
        return "PM escalation — same day action required"
    return "EMERGENCY — senior team, 24h resolution window"
