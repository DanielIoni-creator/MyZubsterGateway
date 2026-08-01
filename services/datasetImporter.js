// services/datasetImporter.js - Botanical Dataset Importer (GBIF & iNaturalist)
const MapEntity = require('../models/MapEntity');

/**
 * Fetch occurrence records from GBIF API
 * @param {string} query Search term (e.g. 'Arabidopsis')
 * @param {number} limit Max records to fetch
 */
async function fetchGBIFData(query = 'plant', limit = 10) {
  try {
    const url = `https://api.gbif.org/v1/occurrence/search?q=${encodeURIComponent(query)}&limit=${limit}&hasCoordinate=true`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GBIF API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('GBIF fetch error:', error.message);
    return [];
  }
}

/**
 * Fetch observation records from iNaturalist API
 * @param {string} query Search term (e.g. 'Monstera')
 * @param {number} limit Max records to fetch
 */
async function fetchINaturalistData(query = 'plant', limit = 10) {
  try {
    const url = `https://api.inaturalist.org/v1/observations?q=${encodeURIComponent(query)}&per_page=${limit}&has[]=location`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('iNaturalist fetch error:', error.message);
    return [];
  }
}

/**
 * Map a raw GBIF occurrence object to MapEntity fields
 */
function mapGBIFToMapEntity(record, ownerId) {
  const lat = record.decimalLatitude || (record.location ? record.location.lat : null);
  const lng = record.decimalLongitude || (record.location ? record.location.lon : null);

  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  return {
    entityType: 'plant',
    name: record.scientificName || record.species || 'Unknown Plant',
    species: record.species || record.genus || null,
    description: `Imported from GBIF. Dataset: ${record.datasetName || 'GBIF Occurrences'}. Country: ${record.country || 'N/A'}`,
    coordinates: {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng)
    },
    owner: ownerId,
    externalSource: 'gbif',
    externalId: String(record.key || record.gbifID),
    provenanceHistory: [{
      action: 'IMPORTED_GBIF',
      details: `Imported from GBIF occurrence record #${record.key || record.gbifID}`
    }]
  };
}

/**
 * Map a raw iNaturalist observation object to MapEntity fields
 */
function mapINaturalistToMapEntity(record, ownerId) {
  if (!record.location) return null;
  const parts = record.location.split(',');
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) return null;

  const taxonName = record.taxon ? (record.taxon.preferred_common_name || record.taxon.name) : 'Botanical Observation';

  return {
    entityType: 'plant',
    name: taxonName,
    species: record.taxon ? record.taxon.name : null,
    description: `Imported from iNaturalist observation #${record.id}. Observed by: ${record.user ? record.user.login : 'anonymous'}`,
    coordinates: {
      latitude: lat,
      longitude: lng
    },
    owner: ownerId,
    externalSource: 'inaturalist',
    externalId: String(record.id),
    provenanceHistory: [{
      action: 'IMPORTED_INATURALIST',
      details: `Imported from iNaturalist observation #${record.id}`
    }]
  };
}

/**
 * Batch import botanical dataset records into MapEntity MongoDB collection
 */
async function importBotanicalData({ source = 'gbif', query = 'plant', limit = 10, ownerId, rawData = null }) {
  if (!ownerId) {
    throw new Error('ownerId is required to assign imported entities');
  }

  let records = rawData;
  if (!records) {
    if (source === 'gbif') {
      records = await fetchGBIFData(query, limit);
    } else if (source === 'inaturalist') {
      records = await fetchINaturalistData(query, limit);
    } else {
      throw new Error(`Unsupported source: ${source}`);
    }
  }

  const mappedEntities = [];
  for (const record of records) {
    let mapped = null;
    if (source === 'gbif') {
      mapped = mapGBIFToMapEntity(record, ownerId);
    } else if (source === 'inaturalist') {
      mapped = mapINaturalistToMapEntity(record, ownerId);
    }

    if (mapped) {
      mappedEntities.push(mapped);
    }
  }

  if (mappedEntities.length === 0) {
    return { success: true, count: 0, imported: [] };
  }

  const inserted = await MapEntity.insertMany(mappedEntities);
  return {
    success: true,
    count: inserted.length,
    imported: inserted
  };
}

module.exports = {
  fetchGBIFData,
  fetchINaturalistData,
  mapGBIFToMapEntity,
  mapINaturalistToMapEntity,
  importBotanicalData
};
