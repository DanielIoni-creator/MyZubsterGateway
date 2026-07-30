from flask import Flask, jsonify, request, send_file
from flask_sqlalchemy import SQLAlchemy
import csv
import json
from io import StringIO

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/test.db'
db = SQLAlchemy(app)

class Listing(db.Model):
   id = db.Column(db.Integer, primary_key=True)
   plant = db.Column(db.String(100), nullable=False)
   variety = db.Column(db.String(100), nullable=False)
   type = db.Column(db.String(100), nullable=False)
   quantity = db.Column(db.Integer, nullable=False)
   location = db.Column(db.String(100), nullable=False)
   exchange_type = db.Column(db.String(100), nullable=False)

   def to_dict(self):
      return {
         'id': self.id,
         'plant': self.plant,
         'variety': self.variety,
         'type': self.type,
         'quantity': self.quantity,
         'location': self.location,
         'exchange_type': self.exchange_type
      }

@app.route('/api/seed-exchange/export/csv', methods=['GET'])
def export_csv():
   listings = Listing.query
   if 'plant' in request.args:
      listings = listings.filter_by(plant=request.args['plant'])
   if 'type' in request.args:
      listings = listings.filter_by(type=request.args['type'])
   if 'location' in request.args:
      listings = listings.filter_by(location=request.args['location'])

   output = StringIO()
   writer = csv.DictWriter(output, fieldnames=['id', 'plant', 'variety', 'type', 'quantity', 'location', 'exchange_type'])
   writer.writeheader()
   for listing in listings:
      writer.writerow(listing.to_dict())
   return send_file(
      output,
      as_attachment=True,
      attachment_filename='listings.csv',
      mimetype='text/csv'
   )

@app.route('/api/seed-exchange/export/geojson', methods=['GET'])
def export_geojson():
   listings = Listing.query
   if 'plant' in request.args:
      listings = listings.filter_by(plant=request.args['plant'])
   if 'type' in request.args:
      listings = listings.filter_by(type=request.args['type'])
   if 'location' in request.args:
      listings = listings.filter_by(location=request.args['location'])

   features = []
   for listing in listings:
      feature = {
         'type': 'Feature',
         'geometry': {
            'type': 'Point',
            'coordinates': [0, 0]  # Replace with actual coordinates
         },
         'properties': listing.to_dict()
      }
      features.append(feature)

   geojson = {
      'type': 'FeatureCollection',
      'features': features
   }

   return jsonify(geojson)

if __name__ == '__main__':
   app.run(debug=True)