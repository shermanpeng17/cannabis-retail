import requests
from requests.auth import HTTPBasicAuth

pload = {'username': 'sherman.peng@sfgov.org', 'password': 'j1gs@w317!f'}

# r = requests.get('https://data.sfgov.org/resource/j3r2-k585.json', data=pload)
r = requests.get('https://data.sfgov.org/resource/j3r2-k585.json', auth=HTTPBasicAuth('sherman.peng@sfgov.org', 'j1gs@w317!'))

print(r.text)