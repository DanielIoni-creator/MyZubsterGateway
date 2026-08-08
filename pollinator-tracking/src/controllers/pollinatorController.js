const Pollinator = require('../models/Pollinator');
const crypto = require('crypto');

// Store in-memory (in produzione usare un database)
let pollinators = [];
let observations = [];

// Species database
const SPECIES_DB = {
  'apis_mellifera': { 
    name: 'Ape domestica', 
    family: 'Apidae', 
    habitat: ['urbano', 'agricolo'],
    threat: 'vulnerabile'
  },
  'bombus_terrestris': { 
    name: 'Bombus terrestre', 
    family: 'Apidae', 
    habitat: ['prati', 'giardini'],
    threat: 'in declino'
  },
  'papilio_machaon': { 
    name: 'Macaone', 
    family: 'Papilionidae', 
    habitat: ['prati', 'campi'],
    threat: 'protetta'
  },
  'vanessa_cardui': { 
    name: 'Vanessa del cardo', 
    family: 'Nymphalidae', 
    habitat: ['giardini', 'campi'],
    threat: 'comune'
  },
  'pieris_brassicae': { 
    name: 'Cavolaia maggiore', 
    family: 'Pieridae', 
    habitat: ['orti', 'campi'],
    threat: 'comune'
  }
};

// Track pollinator observation
exports.trackPollinator = async (req, res) => {
  try {
    const data = req.body;
    
    // Valida specie
    if (!data.species) {
      return res.status(400).json({ error: 'Species is required' });
    }
    
    // Crea osservazione
    const observation = new Pollinator({
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      confidence: data.confidence || this.calculateConfidence(data)
    });
    
    // Aggiorna statistiche specie
    const speciesInfo = SPECIES_DB[data.species] || { name: data.species };
    
    // Salva
    observations.push(observation);
    
    // Aggiorna contatori specie
    if (!pollinators.find(p => p.species === data.species)) {
      pollinators.push({
        species: data.species,
        name: speciesInfo.name,
        count: 0,
        lastSeen: null
      });
    }
    
    const pollinator = pollinators.find(p => p.species === data.species);
    pollinator.count++;
    pollinator.lastSeen = new Date().toISOString();
    
    res.status(201).json({
      success: true,
      observation: observation.toJSON(),
      stats: {
        totalObservations: observations.length,
        speciesCount: pollinators.length,
        thisSpecies: pollinator.count
      }
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all observations
exports.getObservations = async (req, res) => {
  try {
    const { species, from, to, limit = 100 } = req.query;
    
    let filtered = [...observations];
    
    if (species) {
      filtered = filtered.filter(o => o.species === species);
    }
    
    if (from) {
      filtered = filtered.filter(o => o.timestamp >= new Date(from).toISOString());
    }
    
    if (to) {
      filtered = filtered.filter(o => o.timestamp <= new Date(to).toISOString());
    }
    
    filtered = filtered.slice(-parseInt(limit));
    
    res.json({
      success: true,
      count: filtered.length,
      observations: filtered.map(o => o.toJSON())
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get species stats
exports.getStats = async (req, res) => {
  try {
    const stats = {
      totalObservations: observations.length,
      speciesCount: pollinators.length,
      species: pollinators,
      recentObservations: observations.slice(-10).map(o => o.toJSON()),
      biodiversityIndex: observations.length > 0 ? 
        (pollinators.length / observations.length * 100).toFixed(2) : 0
    };
    
    res.json({
      success: true,
      stats
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get species details
exports.getSpecies = async (req, res) => {
  try {
    const { species } = req.params;
    
    const info = SPECIES_DB[species];
    if (!info) {
      return res.status(404).json({ error: 'Species not found' });
    }
    
    const observations = pollinators.filter(p => p.species === species);
    
    res.json({
      success: true,
      species: {
        ...info,
        code: species,
        observations: observations.length,
        lastSeen: observations.length > 0 ? 
          observations[observations.length - 1].lastSeen : null
      }
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Calculate confidence score
exports.calculateConfidence = (data) => {
  let score = 0.5;
  
  if (data.image) score += 0.2;
  if (data.location && data.location.lat && data.location.lng) score += 0.1;
  if (data.observedBy && data.observedBy !== 'anonymous') score += 0.1;
  if (data.notes && data.notes.length > 10) score += 0.05;
  if (data.tags && data.tags.length > 0) score += 0.05;
  
  return Math.min(score, 1.0);
};
