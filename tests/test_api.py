from fastapi.testclient import TestClient
from backend.api import app
from backend.features import FIELDS

client=TestClient(app)

def test_health():
    r=client.get('/health')
    assert r.status_code==200 and r.json()['model_ready'] is True

def test_metadata():
    r=client.get('/api/metadata')
    assert len(r.json()['fields'])==15

def test_assessment():
    data={f['name']:f['default'] for f in FIELDS}
    r=client.post('/api/assess',json={'answers':data})
    assert r.status_code == 200, r.text
    body=r.json()
    assert 0 <= body['model_score'] <= 1
    assert body['classification'] in (0,1)
    assert len(body['feature_contributions'])==8
    assert body['disclaimer']

def test_validation():
    data={f['name']:f['default'] for f in FIELDS}
    data['GenHlth']=9
    assert client.post('/api/assess',json={'answers':data}).status_code==422
    del data['GenHlth']
    assert client.post('/api/assess',json={'answers':data}).status_code==422
