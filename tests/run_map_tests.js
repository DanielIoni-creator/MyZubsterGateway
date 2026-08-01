// tests/run_map_tests.js - Pure Node.js Test Runner for MapEntity & Importer
const assert = require('assert');
const mongoose = require('mongoose');
const MapEntity = require('../models/MapEntity');
const {
  mapGBIFToMapEntity,
  mapINaturalistToMapEntity
} = require('../services/datasetImporter');

console.log('🧪 Running MapEntity & Importer Unit Tests (Issues #180 & #181)...');

const mockOwnerId = new mongoose.Types.ObjectId();

// 1. Validation test
try {
  const entity = new MapEntity({ name: 'Orchid', owner: mockOwnerId });
  const err = entity.validateSync();
  assert(err.errors.entityType, 'entityType should be required');
  assert(err.errors['coordinates.latitude'], 'coordinates.latitude should be required');
  console.log('✅ PASS: MapEntity schema validation fails without required fields');
} catch (e) {
  console.error('❌ FAIL validation test:', e.message);
  process.exit(1);
}

// 2. Enum test
try {
  ['plant', 'animal', 'person'].forEach(type => {
    const entity = new MapEntity({
      entityType: type,
      name: `Test ${type}`,
      coordinates: { latitude: 1.3521, longitude: 103.8198 },
      owner: mockOwnerId
    });
    const err = entity.validateSync();
    assert.strictEqual(err, undefined, `Type ${type} should be valid`);
  });
  console.log('✅ PASS: MapEntity schema accepts plant, animal, person enums');
} catch (e) {
  console.error('❌ FAIL enum test:', e.message);
  process.exit(1);
}

// 3. GBIF Mapper Test
try {
  const gbifRecord = {
    key: 123456789,
    scientificName: 'Vanda Miss Joaquim',
    species: 'Vanda Miss Joaquim',
    decimalLatitude: 1.3138,
    decimalLongitude: 103.8159,
    country: 'Singapore',
    datasetName: 'Singapore NParks'
  };

  const mapped = mapGBIFToMapEntity(gbifRecord, mockOwnerId);
  assert.strictEqual(mapped.entityType, 'plant');
  assert.strictEqual(mapped.name, 'Vanda Miss Joaquim');
  assert.strictEqual(mapped.coordinates.latitude, 1.3138);
  assert.strictEqual(mapped.coordinates.longitude, 103.8159);
  assert.strictEqual(mapped.externalSource, 'gbif');
  assert.strictEqual(mapped.externalId, '123456789');
  assert.strictEqual(mapped.provenanceHistory[0].action, 'IMPORTED_GBIF');
  console.log('✅ PASS: mapGBIFToMapEntity correctly parses GBIF occurrence record');
} catch (e) {
  console.error('❌ FAIL GBIF mapper test:', e.message);
  process.exit(1);
}

// 4. iNaturalist Mapper Test
try {
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

  const mapped = mapINaturalistToMapEntity(inatRecord, mockOwnerId);
  assert.strictEqual(mapped.entityType, 'plant');
  assert.strictEqual(mapped.name, 'Keruing');
  assert.strictEqual(mapped.species, 'Dipterocarpus alatus');
  assert.strictEqual(mapped.coordinates.latitude, 1.2868);
  assert.strictEqual(mapped.coordinates.longitude, 103.8545);
  assert.strictEqual(mapped.externalSource, 'inaturalist');
  assert.strictEqual(mapped.externalId, '987654321');
  assert.strictEqual(mapped.provenanceHistory[0].action, 'IMPORTED_INATURALIST');
  console.log('✅ PASS: mapINaturalistToMapEntity correctly parses iNaturalist observation record');
} catch (e) {
  console.error('❌ FAIL iNaturalist mapper test:', e.message);
  process.exit(1);
}

console.log('🎉 ALL UNIT & INTEGRATION TESTS PASSED (4/4)!');
