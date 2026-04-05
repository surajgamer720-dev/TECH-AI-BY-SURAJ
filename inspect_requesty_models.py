import json
import urllib.request

req = urllib.request.Request(
    'https://router.requesty.ai/v1/models',
    headers={
        'Authorization': 'Bearer rqsty-sk-OBMw8zWfTMK7HSdXzAnUIGrD07Il6wXkimEjuTpwl90kEr1kfEmvM+P91xGoY6lafnYo/8xNnERVxsLk7PRsX+AV6AwknSSoRKC8Pi20zQw=',
        'Content-Type': 'application/json',
    },
)
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.load(resp)
models = data.get('data', []) if isinstance(data, dict) else data
free = [m for m in models if isinstance(m, dict) and (float(m.get('input_price', 0)) == 0 or float(m.get('output_price', 0)) == 0)]
print('FREE MODELS', len(free))
for i, m in enumerate(free, 1):
    print(i, m.get('id'), 'input=', m.get('input_price'), 'output=', m.get('output_price'), 'desc=', (m.get('description') or '')[:80])
