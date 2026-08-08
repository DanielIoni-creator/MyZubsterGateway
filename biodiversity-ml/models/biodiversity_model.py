"""
Biodiversity ML Model for EVA IONI
Classifies and monitors biodiversity using ML
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import json
from datetime import datetime

class BiodiversityMLModel:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.species_map = {}
        self.feature_importance = {}
        self.trained = False
        
    def load_data(self, data_path):
        """Load biodiversity data from CSV or JSON"""
        if data_path.endswith('.csv'):
            self.data = pd.read_csv(data_path)
        elif data_path.endswith('.json'):
            with open(data_path, 'r') as f:
                self.data = pd.DataFrame(json.load(f))
        else:
            raise ValueError("Unsupported file format. Use CSV or JSON.")
        
        return self.data
    
    def prepare_features(self, data):
        """Prepare features for training"""
        features = []
        
        # Environmental features
        if 'temperature' in data:
            features.append(data['temperature'])
        if 'humidity' in data:
            features.append(data['humidity'])
        if 'ph' in data:
            features.append(data['ph'])
        if 'ec' in data:
            features.append(data['ec'])
            
        # Spatial features
        if 'lat' in data and 'lng' in data:
            features.append(data['lat'])
            features.append(data['lng'])
            
        # Temporal features
        if 'timestamp' in data:
            dt = pd.to_datetime(data['timestamp'])
            features.append(dt.month)
            features.append(dt.day)
            features.append(dt.hour)
            
        # Vegetation indices (simulated)
        if 'ndvi' in data:
            features.append(data['ndvi'])
        if 'evi' in data:
            features.append(data['evi'])
            
        return np.array(features).reshape(1, -1)
    
    def train(self, X, y, test_size=0.2):
        """Train the model"""
        # Prepare features
        X_processed = []
        for row in X:
            if isinstance(row, dict):
                X_processed.append(self.prepare_features(row))
            else:
                X_processed.append(row)
        
        X_processed = np.array(X_processed)
        if len(X_processed.shape) == 3:
            X_processed = X_processed.reshape(X_processed.shape[0], -1)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y, test_size=test_size, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Feature importance
        self.feature_importance = dict(zip(
            ['temperature', 'humidity', 'ph', 'ec', 'lat', 'lng', 
             'month', 'day', 'hour', 'ndvi', 'evi'],
            self.model.feature_importances_
        ))
        
        self.trained = True
        self.accuracy = accuracy
        
        return {
            'accuracy': accuracy,
            'feature_importance': self.feature_importance,
            'report': classification_report(y_test, y_pred)
        }
    
    def predict(self, data):
        """Predict species or biodiversity index"""
        if not self.trained:
            raise ValueError("Model not trained yet")
        
        X = self.prepare_features(data)
        X_scaled = self.scaler.transform(X)
        
        # Get prediction and probabilities
        prediction = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)
        
        return {
            'prediction': prediction[0],
            'confidence': float(max(probabilities[0])),
            'probabilities': {
                self.model.classes_[i]: float(probabilities[0][i])
                for i in range(len(self.model.classes_))
            }
        }
    
    def predict_biodiversity_index(self, data):
        """Calculate biodiversity index from data"""
        # Simulated biodiversity index calculation
        # In real scenario, this would be more complex
        
        species_count = len(set(data.get('species', [])))
        abundance = data.get('abundance', 0)
        
        # Shannon index simulation
        if species_count > 0:
            shannon = -sum(
                (count / abundance) * np.log(count / abundance)
                for count in data.get('counts', [1])
                if count > 0
            ) if abundance > 0 else 0
        else:
            shannon = 0
        
        # Biodiversity index (0-100)
        index = min(100, (species_count * 10 + shannon * 20))
        
        return {
            'biodiversity_index': index,
            'species_count': species_count,
            'shannon_index': shannon,
            'abundance': abundance
        }
    
    def save_model(self, path):
        """Save model to file"""
        if not self.trained:
            raise ValueError("Model not trained yet")
        
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'feature_importance': self.feature_importance,
            'accuracy': self.accuracy,
            'classes': self.model.classes_
        }, path)
        
    def load_model(self, path):
        """Load model from file"""
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self.feature_importance = data['feature_importance']
        self.accuracy = data['accuracy']
        self.trained = True
        
        return self
    
    def generate_report(self):
        """Generate biodiversity report"""
        if not self.trained:
            return {'error': 'Model not trained yet'}
        
        return {
            'model': 'RandomForestClassifier',
            'accuracy': self.accuracy,
            'feature_importance': self.feature_importance,
            'trained_at': datetime.now().isoformat(),
            'status': 'ready'
        }

# Create a simple training script
def generate_sample_data(n_samples=1000):
    """Generate synthetic biodiversity data for testing"""
    np.random.seed(42)
    
    species = ['apis_mellifera', 'bombus_terrestris', 'papilio_machaon',
               'vanessa_cardui', 'pieris_brassicae']
    
    data = []
    for _ in range(n_samples):
        species_choice = np.random.choice(species)
        temp = np.random.normal(25, 5)
        humidity = np.random.normal(60, 15)
        ph = np.random.normal(7, 1)
        ec = np.random.normal(1.5, 0.5)
        lat = np.random.uniform(44, 45)
        lng = np.random.uniform(12, 13)
        month = np.random.randint(1, 13)
        day = np.random.randint(1, 29)
        hour = np.random.randint(6, 21)
        
        data.append({
            'species': species_choice,
            'temperature': temp,
            'humidity': humidity,
            'ph': ph,
            'ec': ec,
            'lat': lat,
            'lng': lng,
            'month': month,
            'day': day,
            'hour': hour,
            'ndvi': np.random.uniform(0.2, 0.8),
            'evi': np.random.uniform(0.1, 0.6)
        })
    
    return pd.DataFrame(data)

if __name__ == "__main__":
    # Test the model
    print("🧠 Testing Biodiversity ML Model...")
    
    # Generate sample data
    df = generate_sample_data(1000)
    
    # Prepare features and labels
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
    
    # Train model
    model = BiodiversityMLModel()
    results = model.train(X, y)
    
    print(f"✅ Accuracy: {results['accuracy']:.2%}")
    print("\n📊 Feature Importance:")
    for feature, importance in results['feature_importance'].items():
        print(f"   {feature}: {importance:.3f}")
    
    # Save model
    model.save_model('biodiversity_model.joblib')
    print("\n✅ Model saved to biodiversity_model.joblib")
    
    # Test prediction
    test_data = {
        'temperature': 26.5,
        'humidity': 65.0,
        'ph': 7.2,
        'ec': 1.8,
        'lat': 44.05,
        'lng': 12.56,
        'timestamp': '2026-08-08T14:30:00',
        'ndvi': 0.65,
        'evi': 0.45
    }
    
    prediction = model.predict(test_data)
    print(f"\n🔮 Prediction: {prediction['prediction']}")
    print(f"Confidence: {prediction['confidence']:.2%}")
    
    # Calculate biodiversity index
    biodiversity_data = {
        'species': ['apis_mellifera', 'bombus_terrestris', 'papilio_machaon'],
        'counts': [15, 8, 3],
        'abundance': 26
    }
    index = model.predict_biodiversity_index(biodiversity_data)
    print(f"\n🌿 Biodiversity Index: {index['biodiversity_index']:.1f}")
