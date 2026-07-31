"""
Garden IoT Data API

Endpoints for receiving sensor data from Arduino devices and
querying historical stats per garden.
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo import MongoClient
from bson import ObjectId
import os

garden_bp = Blueprint("garden", __name__, url_prefix="/api/garden")

client = MongoClient(os.environ.get("MONGO_URI", "mongodb://localhost:27017"))
db = client[os.environ.get("MONGO_DB", "myzubster")]
sensor_collection = db["sensor_data"]
gardens_collection = db["gardens"]


@garden_bp.route("/data", methods=["POST"])
@jwt_required()
def receive_sensor_data():
    """Receive sensor data from Arduino IoT devices."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400
    required = ["gardenId", "ph", "ec", "temperature", "humidity"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": "Missing fields: " + ", ".join(missing)}), 400
    try:
        ph = float(data["ph"])
        ec = float(data["ec"])
        temp = float(data["temperature"])
        humidity = float(data["humidity"])
    except (ValueError, TypeError):
        return jsonify({"error": "Sensor values must be numeric"}), 400
    if not (0 <= ph <= 14):
        return jsonify({"error": "pH must be between 0 and 14"}), 400
    if humidity < 0 or humidity > 100:
        return jsonify({"error": "Humidity must be 0-100"}), 400
    garden_id = str(data["gardenId"])
    garden = gardens_collection.find_one({"_id": garden_id})
    if not garden:
        return jsonify({"error": "Garden not found"}), 404
    record = {
        "gardenId": garden_id,
        "ph": ph,
        "ec": ec,
        "temperature": temp,
        "humidity": humidity,
        "timestamp": datetime.now(timezone.utc),
    }
    result = sensor_collection.insert_one(record)
    return jsonify({
        "status": "ok",
        "id": str(result.inserted_id),
        "timestamp": record["timestamp"].isoformat(),
    }), 201


@garden_bp.route("/<garden_id>/stats", methods=["GET"])
@jwt_required()
def get_garden_stats(garden_id):
    """Get historical sensor data stats for a garden."""
    limit = request.args.get("limit", 100, type=int)
    if limit > 1000:
        limit = 1000
    sort = request.args.get("sort", "desc")
    direction = -1 if sort == "desc" else 1
    records = list(
        sensor_collection
        .find({"gardenId": str(garden_id)})
        .sort("timestamp", direction)
        .limit(limit)
    )
    if not records:
        return jsonify({"error": "No sensor data found for this garden"}), 404
    avg_ph = sum(r["ph"] for r in records) / len(records)
    avg_ec = sum(r["ec"] for r in records) / len(records)
    avg_temp = sum(r["temperature"] for r in records) / len(records)
    avg_humidity = sum(r["humidity"] for r in records) / len(records)
    return jsonify({
        "gardenId": str(garden_id),
        "count": len(records),
        "averages": {
            "ph": round(avg_ph, 2),
            "ec": round(avg_ec, 2),
            "temperature": round(avg_temp, 2),
            "humidity": round(avg_humidity, 2),
        },
        "latest": {
            "ph": records[0]["ph"],
            "ec": records[0]["ec"],
            "temperature": records[0]["temperature"],
            "humidity": records[0]["humidity"],
            "timestamp": records[0]["timestamp"].isoformat() if isinstance(records[0]["timestamp"], datetime) else str(records[0]["timestamp"]),
        },
        "history": [
            {
                "ph": r["ph"],
                "ec": r["ec"],
                "temperature": r["temperature"],
                "humidity": r["humidity"],
                "timestamp": r["timestamp"].isoformat() if isinstance(r["timestamp"], datetime) else str(r["timestamp"]),
            }
            for r in records
        ],
    }), 200


@garden_bp.route("/<garden_id>/latest", methods=["GET"])
@jwt_required()
def get_latest_reading(garden_id):
    """Get most recent sensor reading for a garden."""
    record = sensor_collection.find_one(
        {"gardenId": str(garden_id)},
        sort=[("timestamp", -1)],
    )
    if not record:
        return jsonify({"error": "No sensor data found"}), 404
    return jsonify({
        "gardenId": str(garden_id),
        "ph": record["ph"],
        "ec": record["ec"],
        "temperature": record["temperature"],
        "humidity": record["humidity"],
        "timestamp": record["timestamp"].isoformat() if isinstance(record["timestamp"], datetime) else str(record["timestamp"]),
    }), 200
