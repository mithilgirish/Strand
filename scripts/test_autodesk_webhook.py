import requests
import json
import uuid

# Emulate an Autodesk APS webhook payload for a new drawing upload
payload = {
    "version": "1.0",
    "resourceUrn": f"urn:adsk.wipprod:fs.file:vf.O01r_{uuid.uuid4().hex.upper()}?version=1",
    "hook": {
        "hookId": "9f2bdc6a-7d43-4a33-85f2-95f7ef5eb110",
        "tenant": "STRAND_EPC_DEMO",
        "event": "dm.version.added",
        "system": "data",
        "creatorType": "Application",
        "creator": "client_id_XYZ"
    },
    "payload": {
        "project": "STRAND-DC-01",
        "version": 1
    }
}

print(f"[Webhook] Sending mock Autodesk ACC Webhook: dm.version.added")
print(f"[Payload] Payload:\n{json.dumps(payload, indent=2)}\n")

response = requests.post(
    "http://127.0.0.1:8000/api/v1/integrations/autodesk/webhook",
    json=payload
)

print(f"[Status] Response Status: {response.status_code}")
print(f"[Response] Response Body: {json.dumps(response.json(), indent=2)}")
