import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import SeedExchangeListing

client = TestClient(app)

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """Create a fresh in‑memory database for each test function.

    The project already provides a ``Base`` and ``engine`` that are configured
    for the test environment (usually an SQLite database).  By recreating the
    schema before each test we guarantee isolation.
    """
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_export_csv():
    db = SessionLocal()
    listing = SeedExchangeListing(
        plant="Tomato",
        variety="Cherry",
        type="Vegetable",
        quantity=10,
        location="Garden",
        exchange_type="Give",
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    db.close()

    response = client.get("/api/seed-exchange/export/csv")
    assert response.status_code == 200
    content = response.content.decode()
    lines = content.strip().splitlines()
    # header line
    assert lines[0] == "id,plant,variety,type,quantity,location,exchange_type,created_at"
    # ensure our record appears somewhere in the CSV output
    assert any("Tomato" in line for line in lines)


def test_export_geojson():
    db = SessionLocal()
    listing = SeedExchangeListing(
        plant="Lettuce",
        variety="Romaine",
        type="Vegetable",
        quantity=5,
        location="Backyard",
        exchange_type="Swap",
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    db.close()

    response = client.get("/api/seed-exchange/export/geojson")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert isinstance(data["features"], list)
    assert len(data["features"]) == 1
    feature = data["features"][0]
    assert feature["geometry"] is None
    props = feature["properties"]
    assert props["plant"] == "Lettuce"
    assert props["exchange_type"] == "Swap"
