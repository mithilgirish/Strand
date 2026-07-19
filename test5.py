import requests
import json
with open('data/vendor_submittal_cooling_tower.pdf', 'rb') as f:
    files = {'file': ('vendor_submittal_cooling_tower.pdf', f, 'application/pdf')}
    data = {'submittal_id': 'DEMO-CT-01'}
    resp = requests.post('http://localhost:8000/api/v1/guardian/analyze', files=files, data=data)
print(resp.status_code)
print(json.dumps(resp.json(), indent=2))
