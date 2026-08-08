import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from models.biodiversity_model import BiodiversityMLModel, generate_sample_data

def train():
    print("🧠 Training Biodiversity ML Model...")
    
    # Generate data
    print("📊 Generating sample data...")
    df = generate_sample_data(2000)
    
    # Prepare features
    X = []
    y = []
    for _, row in df.iterrows():
        features = {
            'temperature': row['temperature'],
            'humidity': row['humidity'],
            'ph': row['ph'],
            'ec': row['ec'],
            'lat': row['lat'],
            'lng': row['lng'],
            'timestamp': f"2026-{row['month']:02d}-{row['day']:02d}T{row['hour']:02d}:00:00",
            'ndvi': row['ndvi'],
            'evi': row['evi']
        }
        X.append(features)
        y.append(row['species'])
    
    # Train
    model = BiodiversityMLModel()
    results = model.train(X, y)
    
    print(f"\n✅ Training complete!")
    print(f"   Accuracy: {results['accuracy']:.2%}")
    print(f"   Samples: {len(X)}")
    
    # Save
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'biodiversity_model.joblib')
    model.save_model(model_path)
    print(f"📁 Model saved to {model_path}")
    
    return model

if __name__ == "__main__":
    train()
