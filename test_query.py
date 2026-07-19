import requests
import json
data = {
    "query": "MATCH (sh:Shipment {tenant_id: $tenant_id}) WHERE sh.risk_flag = 'High' RETURN count(sh) as high_risk"
}
resp = requests.post('http://localhost:8000/api/v1/dashboards/query', json=data)
print(resp.status_code)
print(json.dumps(resp.json(), indent=2))
