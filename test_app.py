from app import app, db
import unittest
import csv
import json

class TestApp(unittest.TestCase):
   def setUp(self):
      self.app = app.test_client()
      db.create_all()

   def test_export_csv(self):
      # Create test listing
      listing = Listing(plant='Test Plant', variety='Test Variety', type='Test Type', quantity=10, location='Test Location', exchange_type='Test Exchange Type')
      db.session.add(listing)
      db.session.commit()

      # Test export CSV
      response = self.app.get('/api/seed-exchange/export/csv')
      self.assertEqual(response.status_code, 200)
      self.assertEqual(response.mimetype, 'text/csv')
      reader = csv.DictReader(StringIO(response.data.decode('utf-8')))
      rows = list(reader)
      self.assertEqual(len(rows), 1)
      self.assertEqual(rows[0]['plant'], 'Test Plant')
      self.assertEqual(rows[0]['variety'], 'Test Variety')
      self.assertEqual(rows[0]['type'], 'Test Type')
      self.assertEqual(rows[0]['quantity'], '10')
      self.assertEqual(rows[0]['location'], 'Test Location')
      self.assertEqual(rows[0]['exchange_type'], 'Test Exchange Type')

   def test_export_csv_with_filters(self):
      # Create test listings
      listing1 = Listing(plant='Test Plant 1', variety='Test Variety 1', type='Test Type 1', quantity=10, location='Test Location 1', exchange_type='Test Exchange Type 1')
      listing2 = Listing(plant='Test Plant 2', variety='Test Variety 2', type='Test Type 2', quantity=20, location='Test Location 2', exchange_type='Test Exchange Type 2')
      db.session.add_all([listing1, listing2])
      db.session.commit()

      # Test export CSV with filters
      response = self.app.get('/api/seed-exchange/export/csv', query_string={'plant': 'Test Plant 1'})
      self.assertEqual(response.status_code, 200)
      self.assertEqual(response.mimetype, 'text/csv')
      reader = csv.DictReader(StringIO(response.data.decode('utf-8')))
      rows = list(reader)
      self.assertEqual(len(rows), 1)
      self.assertEqual(rows[0]['plant'], 'Test Plant 1')

   def test_export_geojson(self):
      # Create test listing
      listing = Listing(plant='Test Plant', variety='Test Variety', type='Test Type', quantity=10, location='Test Location', exchange_type='Test Exchange Type')
      db.session.add(listing)
      db.session.commit()

      # Test export GeoJSON
      response = self.app.get('/api/seed-exchange/export/geojson')
      self.assertEqual(response.status_code, 200)
      self.assertEqual(response.mimetype, 'application/json')
      geojson = json.loads(response.data.decode('utf-8'))
      self.assertEqual(geojson['type'], 'FeatureCollection')
      self.assertEqual(len(geojson['features']), 1)
      feature = geojson['features'][0]
      self.assertEqual(feature['type'], 'Feature')
      self.assertEqual(feature['geometry']['type'], 'Point')
      self.assertEqual(feature['properties']['plant'], 'Test Plant')

   def test_export_geojson_with_filters(self):
      # Create test listings
      listing1 = Listing(plant='Test Plant 1', variety='Test Variety 1', type='Test Type 1', quantity=10, location='Test Location 1', exchange_type='Test Exchange Type 1')
      listing2 = Listing(plant='Test Plant 2', variety='Test Variety 2', type='Test Type 2', quantity=20, location='Test Location 2', exchange_type='Test Exchange Type 2')
      db.session.add_all([listing1, listing2])
      db.session.commit()

      # Test export GeoJSON with filters
      response = self.app.get('/api/seed-exchange/export/geojson', query_string={'plant': 'Test Plant 1'})
      self.assertEqual(response.status_code, 200)
      self.assertEqual(response.mimetype, 'application/json')
      geojson = json.loads(response.data.decode('utf-8'))
      self.assertEqual(geojson['type'], 'FeatureCollection')
      self.assertEqual(len(geojson['features']), 1)
      feature = geojson['features'][0]
      self.assertEqual(feature['type'], 'Feature')
      self.assertEqual(feature['geometry']['type'], 'Point')
      self.assertEqual(feature['properties']['plant'], 'Test Plant 1')

if __name__ == '__main__':
   unittest.main()