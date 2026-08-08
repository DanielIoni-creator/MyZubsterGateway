from flask import Flask, jsonify, request
from flask_cors import CORS
import sys
import os

# Aggiungi models al path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from models.biodiversity_model import BiodiversityMLModel

app = Flask(__name__)
CORS(app)

# Carica il modello
model_path = os.path.join(os.path.dirname(__file__), '..', 'biodiversity_model.joblib')
model = BiodiversityMLModel()

if os.path.exists(model_path):
    model.load_model(model_path)
    print("✅ Model loaded successfully")
else:
    print("⚠️ Model not found, training...")
    from models.biodiversity_model import generate_sample_data
    df = generate_sample_data(1000)
    
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
    
    model.train(X, y)
    model.save_model(model_path)
    print("✅ Model trained and saved")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'biodiversity-ml-model',
        'version': '1.0.0',
        'model': 'trained' if model.trained else 'not_ready'
    })

@app.route('/api/biodiversity/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        prediction = model.predict(data)
        return jsonify({
            'success': True,
            'prediction': prediction
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/biodiversity/index', methods=['POST'])
def biodiversity_index():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        index = model.predict_biodiversity_index(data)
        return jsonify({
            'success': True,
            'index': index
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/biodiversity/report', methods=['GET'])
def report():
    try:
        report = model.generate_report()
        return jsonify({
            'success': True,
            'report': report
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8086, debug=True)
