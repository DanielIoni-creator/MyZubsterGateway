"""
MyZubster Gateway Python SDK
A Python client library for the MyZubster Gateway API.

Installation:
    pip install myzubster

Usage:
    from myzubster import MyZubsterClient
    
    client = MyZubsterClient()
    client.login("username", "password")
    client.register_animal(name="Buddy", animal_type="dog")
"""
import requests
from typing import Optional, Dict, Any


class MyZubsterError(Exception):
    """Exception raised for MyZubster API errors."""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"[{status_code}] {message}")


class MyZubsterClient:
    """Client for the MyZubster Gateway API."""
    
    def __init__(self, base_url: str = "https://myzubsterapp.onrender.com"):
        self.base_url = base_url.rstrip("/")
        self.token: Optional[str] = None
        self.session = requests.Session()
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        if self.token:
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        response = self.session.request(method, url, **kwargs)
        data = response.json() if response.content else {}
        if not response.ok:
            raise MyZubsterError(response.status_code, data.get("error", response.text))
        return data
    
    def login(self, username: str, password: str) -> Dict:
        """Authenticate and store JWT token."""
        data = self._request("POST", "/api/auth/login", json={"username": username, "password": password})
        self.token = data.get("token")
        return data
    
    def register(self, username: str, password: str, email: str) -> Dict:
        """Register a new user."""
        return self._request("POST", "/api/auth/register", json={"username": username, "password": password, "email": email})
    
    def get_profile(self) -> Dict:
        """Get current user profile."""
        return self._request("GET", "/api/auth/profile")
    
    def get_health(self) -> Dict:
        """Check API health status."""
        return self._request("GET", "/api/health")
    
    def get_info(self) -> Dict:
        """Get gateway information."""
        return self._request("GET", "/api/info")
    
    def register_animal(self, name: str, animal_type: str, **extra) -> Dict:
        """Register a new animal."""
        data = {"name": name, "type": animal_type, **extra}
        return self._request("POST", "/api/animals/register", json=data)
    
    def list_animals(self) -> Dict:
        """List all animals."""
        return self._request("GET", "/api/animals")
    
    def get_animal(self, animal_id: str) -> Dict:
        """Get animal details."""
        return self._request("GET", f"/api/animals/{animal_id}")
    
    def register_plant(self, name: str, plant_type: str, **extra) -> Dict:
        """Register a new plant."""
        data = {"name": name, "type": plant_type, **extra}
        return self._request("POST", "/api/plants/register", json=data)
    
    def list_plants(self) -> Dict:
        """List all plants."""
        return self._request("GET", "/api/plants")
    
    def create_robot(self, robot_id: str, name: str, wallet_address: str) -> Dict:
        """Create a new robot."""
        return self._request("POST", "/api/robot/create", json={"robotId": robot_id, "name": name, "walletAddress": wallet_address})
    
    def assign_job(self, robot_id: str, job_id: str, client_id: str, amount: float, currency: str = "MYZ") -> Dict:
        """Assign a job to a robot."""
        return self._request("POST", "/api/robot/assign", json={"robotId": robot_id, "jobId": job_id, "clientId": client_id, "amount": amount, "currency": currency})
    
    def complete_job(self, robot_id: str, job_id: str, result: str) -> Dict:
        """Mark a robot job as complete."""
        return self._request("POST", "/api/robot/job/complete", json={"robotId": robot_id, "jobId": job_id, "result": result})
    
    def get_swap_rate(self, from_currency: str, to_currency: str, amount: float) -> Dict:
        """Get XMR/MYZ swap rate."""
        return self._request("GET", "/api/swap/rate", params={"from": from_currency, "to": to_currency, "amount": amount})
    
    def execute_swap(self, from_currency: str, to_currency: str, amount: float, user_id: str) -> Dict:
        """Execute a currency swap."""
        return self._request("POST", "/api/swap/execute", json={"from": from_currency, "to": to_currency, "amount": amount, "userId": user_id})
    
    def get_bounties(self) -> Dict:
        """List all open bounties."""
        return self._request("GET", "/api/bounties")
    
    def get_rewards(self, user_id: str) -> Dict:
        """Get reward history for a user."""
        return self._request("GET", "/api/rewards", params={"userId": user_id})
