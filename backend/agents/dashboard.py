import json
import re
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from backend.config import settings

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

async def generate_dashboard_config(user_prompt: str) -> dict:
    # Use the configured LLM provider key — defaults to GROQ if OPENAI not set
    api_key = getattr(settings, 'OPENAI_API_KEY', None) or getattr(settings, 'GROQ_API_KEY', None)
    if not api_key:
        raise ValueError("No LLM API key configured (OPENAI_API_KEY or GROQ_API_KEY required)")

    llm = ChatOpenAI(
        model_name=getattr(settings, 'LLM_MODEL', 'gpt-4o'),
        temperature=0.0,
        openai_api_key=api_key
    )
    
    # Escape braces in system prompt so LangChain template doesn't misinterpret them
    safe_system_prompt = DASHBOARD_AGENT_PROMPT.replace('{', '{{').replace('}', '}}')
    
    prompt = PromptTemplate.from_template(
        safe_system_prompt + "\n\nUser Request: {{request}}\nJSON Configuration:"
    )
    
    chain = prompt | llm
    
    response = await chain.ainvoke({"request": user_prompt})
    content = response.content.strip()
    
    # Clean up potential markdown blocks using regex for robustness
    content = re.sub(r'^```(?:json)?\s*', '', content)
    content = re.sub(r'\s*```$', '', content)
    content = content.strip()
        
    try:
        return json.loads(content)
    except Exception as e:
        raise ValueError(f"Dashboard agent returned invalid JSON: {e}. Raw output: {content[:200]}")
