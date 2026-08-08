"""
Test notebook per il modello ML
Equivalente a un Jupyter notebook in Python
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from models.biodiversity_model import BiodiversityMLModel
import json

# Carica il modello
model = BiodiversityMLModel()
model.load_model('../biodiversity_model.joblib')

print("📊 Testing Biodiversity ML Model\n")

# Test prediction
test_data = {
    'temperature': 28.0,
    'humidity': 70.0,
    'ph': 7.5,
    'ec': 2.0,
    'lat': 44.05,
    'lng': 12.56,
    'timestamp': '2026-08-08T15:00:00',
    'ndvi': 0.7,
    'evi': 0.5
}

print("🔮 Test Prediction:")
prediction = model.predict(test_data)
print(f"   Species: {prediction['prediction']}")
print(f"   Confidence: {prediction['confidence']:.2%}")

# Test biodiversity index
biodiversity_data = {
    'species': ['apis_mellifera', 'bombus_terrestris', 'papilio_machaon', 'vanessa_cardui'],
    'counts': [20, 10, 5, 3],
    'abundance': 38
}

print("\n🌿 Biodiversity Index:")
index = model.predict_biodiversity_index(biodiversity_data)
print(f"   Index: {index['biodiversity_index']:.1f}")
print(f"   Species count: {index['species_count']}")
print(f"   Shannon index: {index['shannon_index']:.3f}")

# Report
print("\n📊 Model Report:")
report = model.generate_report()
print(f"   Accuracy: {report['accuracy']:.2%}")
print("   Feature Importance:")
for feature, importance in report['feature_importance'].items():
    print(f"     {feature}: {importance:.3f}")
