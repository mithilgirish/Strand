import json
import re
from langchain_core.messages import HumanMessage

# System prompt as specified in custom_plan.md Appendix
# NOTE: Curly braces inside this prompt are DOUBLED ({{ }}) to escape LangChain's template syntax
DASHBOARD_AGENT_PROMPT = """
You are a senior EPC business intelligence AI agent for STRAND (Hyperscale Data Center Risk Platform).
Your job is to translate human requests into a single structured JSON object conforming to the STRAND Dashboard JSON Schema.

You must only return a valid JSON object. Do not include markdown formatting or explanations.

### AVAILABLE WIDGETS
1. R0Gauge: Represents the current maximum R0 risk score (float 0.0 - 10.0). Expects a single numerical result.
2. PredictiveTrendChart: Expects time-series rows with columns `date`, `value`, and `predicted`.
3. FormulaCard: Displays a single calculated value.
4. DataGrid: Displays a clean list of records.

### NEO4J SCHEMA CONTEXT
Nodes:
- (c:ContractClause {{spec_dna_id, section, parameter_name, parameter_value, unit}})
- (s:VendorSubmittal {{submittal_id, equipment_tag, status, r0_score, violation_count}})
- (sh:Shipment {{shipment_id, equipment_tag, current_status, delay_days, risk_flag}})

Edges:
- (s)-[:VIOLATES]->(c)
- (sh)-[:FULFILLED_BY]->(po)

### DATA ACCESS RULES
Every query MUST match on nodes containing tenant_id: $tenant_id.
Never generate write keywords (CREATE, MERGE, SET, DELETE, DETACH).

Output format must be exactly:
{{
  "dashboard_name": "Name of Dashboard",
  "layout": [
    {{ "id": "widget_1", "type": "R0Gauge", "x": 0, "y": 0, "w": 4, "h": 2 }}
  ],
  "queries": {{
    "widget_1": "MATCH (s:VendorSubmittal {{tenant_id: $tenant_id}}) RETURN max(s.r0_score) as value"
  }}
}}
"""

def _has_configured_llm() -> bool:
    from backend.llm.client import has_configured_llm

    return has_configured_llm()


def _fallback_dashboard_config(user_prompt: str) -> dict:
    name = user_prompt.strip()[:60] or "Operations Dashboard"
    return {
        "dashboard_name": name.title(),
        "layout": [
            {"id": "widget_r0", "type": "R0Gauge", "title": "Maximum R0", "x": 0, "y": 0, "w": 4, "h": 2},
            {"id": "widget_shipments", "type": "DataGrid", "title": "Critical Shipments", "x": 4, "y": 0, "w": 8, "h": 3},
        ],
        "queries": {
            "widget_r0": "MATCH (s:VendorSubmittal {tenant_id: $tenant_id}) RETURN max(s.r0_score) as value",
            "widget_shipments": (
                "MATCH (sh:Shipment {tenant_id: $tenant_id}) "
                "WHERE coalesce(sh.delay_days, 0) > 0 OR sh.risk_flag = true "
                "RETURN sh.shipment_id as shipment_id, sh.equipment_tag as equipment_tag, "
                "sh.current_status as status, sh.delay_days as delay_days "
                "ORDER BY delay_days DESC LIMIT 25"
            ),
        },
    }


async def generate_dashboard_config(user_prompt: str) -> dict:
    if not _has_configured_llm():
        return _fallback_dashboard_config(user_prompt)

    from backend.llm.client import get_llm

    llm = get_llm()
    prompt = f"{DASHBOARD_AGENT_PROMPT}\n\nUser Request: {user_prompt}\nJSON Configuration:"
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    content = response.content.strip()
    
    # Clean up potential markdown blocks using regex for robustness
    content = re.sub(r'^```(?:json)?\s*', '', content)
    content = re.sub(r'\s*```$', '', content)
    content = content.strip()
        
    try:
        return json.loads(content)
    except Exception as e:
        raise ValueError(f"Dashboard agent returned invalid JSON: {e}. Raw output: {content[:200]}")
