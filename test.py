import requests
print(requests.post('http://localhost:8000/api/v1/dashboard/build', json={'prompt':'test', 'project_id':'test'}).text)
