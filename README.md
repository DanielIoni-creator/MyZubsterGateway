# MyZubsterGateway

## Development setup via Docker Compose

You can easily spin up the Gateway, MongoDB, and wallet stubs (Tari/Monero) using Docker Compose.

1. Install Docker and Docker Compose.
2. Run the environment:
   ```bash
   docker-compose up -d
   ```
3. The Gateway will be available at `http://localhost:10000`. MongoDB is on `27017`.
4. To stop the environment:
   ```bash
   docker-compose down
   ```
