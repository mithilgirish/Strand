import requests
query = "MATCH (s:VendorSubmittal {tenant_id: $tenant_id})-[:VIOLATES]->(c:ContractClause {parameter_name: 'Guardian', parameter_value: 'critical'}) RETURN count(*) as value"
resp = requests.post('http://localhost:8000/api/v1/dashboards/query', json={'query': query})
print(resp.status_code)
print(resp.text)
