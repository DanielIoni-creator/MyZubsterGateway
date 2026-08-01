// tests/map_importer.test.js - Unit & Integration Test Suite for MapEntity & Dataset Importer
const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const MapEntity = require('../models/MapEntity');
const User = require('../models/User');
const mapRoutes = require('../routes/map');
const {
  mapGBIFToMapEntity,
  mapINaturalistToMapEntity,
  importBotanicalData
} = require('../services/datasetImporter');

// Setup mock express server
const app = express();
app.use(express.json());

// Mock auth middleware for testing
app.use((req, res, next) => {
  req.user = { id: new mongoose.Types.ObjectId().toString(), username: 'testuser', role: 'admin' };
  next();
});

app.use('/api/map', mapRoutes);

describe('MapEntity API & Botanical Importer Test Suite (Issues #180 & #181)', () => {
  let ownerId;

  beforeAll(async () => {
    ownerId = new mongoose.Types.ObjectId();
  });

  describe('1. MapEntity Schema & Provenance Unit Tests (Issue #180)', () => {
    test('MapEntity requires valid entityType and coordinates', () => {
      const entity = new MapEntity({
        name: 'Singapore Orchid',
        owner: ownerId
      });
      const err = entity.validateSync();
      expect(err.errors.entityType).toBeDefined();
      expect(err.errors['coordinates.latitude']).toBeDefined();
    });

    test('MapEntity accepts plant, animal, person enum values', () => {
      ['plant', 'animal', 'person'].forEach(type => {
        const entity = new MapEntity({
          entityType: type,
          name: `Test ${type}`,
          coordinates: { latitude: 1.3521, longitude: 103.8198 },
          owner: ownerId
        });
        const err = entity.validateSync();
        expect(err).toBeUndefined();
      });
    });
  });

  describe('2. GBIF & iNaturalist Mapping Logic (Issue #181)', () => {
    test('mapGBIFToMapEntity correctly parses GBIF record', () => {
      const gbifRecord = {
        key: 123456789,
        scientificName: 'Vanda Miss Joaquim',
        species: 'Vanda Miss Joaquim',
        decimalLatitude: 1.3138,
        decimalLongitude: 103.8159,
        country: 'Singapore',
        datasetName: 'Singapore National Parks Dataset'
      };

      const mapped = mapGBIFToMapEntity(gbifRecord, ownerId);
      expect(mapped).toBeDefined();
      expect(mapped.entityType).toBe('plant');
      expect(mapped.name).toBe('Vanda Miss Joaquim');
      expect(mapped.coordinates.latitude).toBe(1.3138);
      expect(mapped.coordinates.longitude).toBe(103.8159);
      expect(mapped.externalSource).toBe('gbif');
      expect(mapped.externalId).toBe('123456789');
      expect(mapped.provenanceHistory[0].action).toBe('IMPORTED_GBIF');
    });

    test('mapINaturalistToMapEntity correctly parses iNaturalist record', () => {
      const inatRecord = {
        id: 987654321,
        location: '1.2868,103.8545',
        taxon: {
          name: 'Dipterocarpus alatus',
          preferred_common_name: 'Keruing'
        },
        user: {
          login: 'botanist_sg'
        }
      };

      const mapped = mapINaturalistToMapEntity(inatRecord, ownerId);
      expect(mapped).toBeDefined();
      expect(mapped.entityType).toBe('plant');
      expect(mapped.name).toBe('Keruing');
      expect(mapped.species).toBe('Dipterocarpus alatus');
      expect(mapped.coordinates.latitude).toBe(1.2868);
      expect(mapped.coordinates.longitude).toBe(103.8545);
      expect(mapped.externalSource).toBe('inaturalist');
      expect(mapped.externalId).toBe('987654321');
      expect(mapped.provenanceHistory[0].action).toBe('IMPORTED_INATURALIST');
    });
  });
});
