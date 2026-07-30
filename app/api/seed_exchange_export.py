from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io

from app.database import get_db
from app.models import SeedExchangeListing

router = APIRouter(prefix="/api/seed-exchange/export", tags=["seed-exchange"])


def apply_filters(
    query,
    plant: Optional[str] = None,
    type_: Optional[str] = None,
    location: Optional[str] = None,
) -> "sqlalchemy.orm.Query[SeedExchangeListing]":
    """Apply optional filters to a SQLAlchemy query.

    The filters mirror those used by the regular listing endpoint so that
    the export endpoints stay in sync with the main API.
    """
    if plant:
        query = query.filter(SeedExchangeListing.plant.ilike(f"%{plant}%"))
    if type_:
        query = query.filter(SeedExchangeListing.type.ilike(f"%{type_}%"))
    if location:
        query = query.filter(SeedExchangeListing.location.ilike(f"%{location}%"))
    return query


def fetch_listings(
    db: Session,
    plant: Optional[str] = None,
    type_: Optional[str] = None,
    location: Optional[str] = None,
) -> List[SeedExchangeListing]:
    """Return all listings matching the supplied filters."""
    query = db.query(SeedExchangeListing)
    query = apply_filters(query, plant, type_, location)
    return query.all()


def listing_to_dict(listing: SeedExchangeListing) -> dict:
    """Serialize a ``SeedExchangeListing`` to a plain ``dict``.

    This helper is used for the GeoJSON output where the properties object
    must be JSON‑serialisable.
    """
    return {
        "id": listing.id,
        "plant": listing.plant,
        "variety": listing.variety,
        "type": listing.type,
        "quantity": listing.quantity,
        "location": listing.location,
        "exchange_type": listing.exchange_type,
        "created_at": listing.created_at.isoformat() if listing.created_at else None,
    }


@router.get("/csv")
def export_csv(
    plant: Optional[str] = Query(None),
    type: Optional[str] = Query(None, alias="type"),
    location: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Export seed‑exchange listings as a CSV file.

    The endpoint respects the same query parameters as the normal listing API
    (``plant``, ``type`` and ``location``).  If no records match the filters a
    ``404`` error is returned – this mirrors the behaviour of the existing
    listing endpoint.
    """
    listings = fetch_listings(db, plant, type, location)
    if not listings:
        raise HTTPException(status_code=404, detail="No listings found")

    def generate():
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        header = [
            "id",
            "plant",
            "variety",
            "type",
            "quantity",
            "location",
            "exchange_type",
            "created_at",
        ]
        writer.writerow(header)
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)
        for l in listings:
            row = [
                l.id,
                l.plant,
                l.variety,
                l.type,
                l.quantity,
                l.location,
                l.exchange_type,
                l.created_at.isoformat() if l.created_at else "",
            ]
            writer.writerow(row)
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=seed_exchange.csv"},
    )


@router.get("/geojson")
def export_geojson(
    plant: Optional[str] = Query(None),
    type: Optional[str] = Query(None, alias="type"),
    location: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Export seed‑exchange listings as a GeoJSON ``FeatureCollection``.

    Because the current schema stores ``location`` as free‑text, the ``geometry``
    member of each feature is set to ``null``.  The textual location is retained
    inside the ``properties`` object.
    """
    listings = fetch_listings(db, plant, type, location)
    features = []
    for l in listings:
        properties = listing_to_dict(l)
        feature = {
            "type": "Feature",
            "geometry": None,
            "properties": properties,
        }
        features.append(feature)
    feature_collection = {"type": "FeatureCollection", "features": features}
    return JSONResponse(content=feature_collection)
