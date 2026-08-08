# MyZubster Gateway SDK

Developer SDK libraries for the MyZubster Gateway API.

## Available SDKs

| Language | Path | Installation |
|----------|------|---------------|
| Python | `sdk/python/` | `pip install myzubster` (or copy `myzubster.py`) |
| JavaScript | `sdk/javascript/` | `npm install myzubster-sdk` (or require `index.js`) |
| Go | `sdk/go/` | `go get github.com/MyZubster-Ecosystem/MyZubsterGateway/sdk/go` |

## Quick Start

### Python

```python
from myzubster import MyZubsterClient

client = MyZubsterClient()
client.login("username", "password")

# Register an animal
client.register_animal(name="Buddy", animal_type="dog")

# Check API health
health = client.get_health()
print(health)

# Get swap rate
rate = client.get_swap_rate("XMR", "MYZ", 0.1)
print(rate)

# Get bounties
bounties = client.get_bounties()
print(bounties)
```

### JavaScript

```javascript
const { MyZubsterClient } = require('./sdk/javascript');

const client = new MyZubsterClient();
await client.login('username', 'password');

// Register an animal
await client.registerAnimal({ name: 'Buddy', type: 'dog' });

// Check API health
const health = await client.getHealth();
console.log(health);

// Get swap rate
const rate = await client.getSwapRate('XMR', 'MYZ', 0.1);
console.log(rate);
```

### Go

```go
package main

import (
    "fmt"
    "github.com/MyZubster-Ecosystem/MyZubsterGateway/sdk/go"
)

func main() {
    client := myzubster.NewClient("https://myzubsterapp.onrender.com")
    client.Login("username", "password")
    
    // Register an animal
    result, _ := client.RegisterAnimal("Buddy", "dog")
    fmt.Println(result)
    
    // Check API health
    health, _ := client.GetHealth()
    fmt.Println(health)
}
```

## API Endpoints Covered

| Method | Endpoint | SDK Method |
|--------|----------|------------|
| POST | `/api/auth/register` | `register()` |
| POST | `/api/auth/login` | `login()` |
| GET | `/api/auth/profile` | `getProfile()` |
| GET | `/api/health` | `getHealth()` |
| GET | `/api/info` | `getInfo()` |
| POST | `/api/animals/register` | `registerAnimal()` |
| GET | `/api/animals` | `listAnimals()` |
| GET | `/api/animals/:id` | `getAnimal()` |
| POST | `/api/plants/register` | `registerPlant()` |
| POST | `/api/robot/create` | `createRobot()` |
| POST | `/api/robot/assign` | `assignJob()` |
| POST | `/api/robot/job/complete` | `completeJob()` |
| GET | `/api/swap/rate` | `getSwapRate()` |
| POST | `/api/swap/execute` | `executeSwap()` |
| GET | `/api/bounties` | `getBounties()` |
| GET | `/api/rewards` | `getRewards()` |

## Error Handling

All SDKs raise/throw a `MyZubsterError` exception with:
- `statusCode` - HTTP status code
- `message` - Error message from the API

## Authentication

All SDKs use JWT token-based authentication. Call `login()` first, and the token is automatically included in subsequent requests.

## Base URL

The default base URL is `https://myzubsterapp.onrender.com`. You can override it:

- Python: `MyZubsterClient(base_url="https://custom-url.com")`
- JavaScript: `new MyZubsterClient({ baseUrl: 'https://custom-url.com' })`
- Go: `myzubster.NewClient("https://custom-url.com")`

## License

MIT
