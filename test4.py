import requests
prompt = "e.g. Show me a list of all shipments with delay greater than 5 days, along with a formula card of our average submittal R0 score."
print(requests.post('http://localhost:8000/api/v1/dashboard/build', json={'prompt': prompt, 'project_id':'demo-123'}).text)
