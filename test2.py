import requests
prompt = "Create a critical warnings dashboard. Show me a data grid of all equipment shipments that are delayed by more than 5 days. Include a second data grid of all construction tasks that are currently marked as at_risk. Finally, add a formula card showing the total count of critical Guardian violations, and an R0 Gauge displaying the average contagion score across all submittals."
print(requests.post('http://localhost:8000/api/v1/dashboard/build', json={'prompt': prompt, 'project_id':'demo-123'}).text)
