from main import app
import pytest
from fastapi.testclient import TestClient
from motor import motor_asyncio
client = motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
db = client['garden_data']
collection = db['data']
client_ = TestClient(app)

def test_create_garden_data():
    # Test creating garden data with valid JWT token
    token = client_.post('/token', data={'grant_type': 'password', 'username': '123', 'password': 'password123'})
    response = client_.post('/api/garden/data', headers={'Authorization': f'Bearer {token.json()["access_token"]}'}, json={'gardenId': '123', 'ph': 6.2, 'ec': 1.8, 'temperature': 22.5, 'humidity': 65})
    assert response.status_code == 200
    # Test creating garden data with expired JWT token
    token = client_.post('/token', data={'grant_type': 'password', 'username': '123', 'password': 'password123'})
    response = client_.post('/api/garden/data', headers={'Authorization': f'Bearer {token.json()["access_token"]}'}, json={'gardenId': '123', 'ph': 6.2, 'ec': 1.8, 'temperature': 22.5, 'humidity': 65})
    assert response.status_code == 401

def test_get_garden_stats():
    # Test getting garden stats with valid JWT token
    token = client_.post('/token', data={'grant_type': 'password', 'username': '123', 'password': 'password123'})
    response = client_.get('/api/garden/123/stats', headers={'Authorization': f'Bearer {token.json()["access_token"]}'})
    assert response.status_code == 200
    # Test getting garden stats with expired JWT token
    token = client_.post('/token', data={'grant_type': 'password', 'username': '123', 'password': 'password123'})
    response = client_.get('/api/garden/123/stats', headers={'Authorization': f'Bearer {token.json()["access_token"]}'})
    assert response.status_code == 401