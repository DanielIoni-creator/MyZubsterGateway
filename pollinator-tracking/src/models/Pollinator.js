class Pollinator {
  constructor(data) {
    this.id = data.id || crypto.randomUUID();
    this.species = data.species;
    this.commonName = data.commonName || this.getCommonName(data.species);
    this.location = data.location || { lat: 0, lng: 0 };
    this.timestamp = data.timestamp || new Date().toISOString();
    this.confidence = data.confidence || 0.0;
    this.observedBy = data.observedBy || 'anonymous';
    this.notes = data.notes || '';
    this.images = data.images || [];
    this.tags = data.tags || [];
    this.metadata = data.metadata || {};
  }

  getCommonName(species) {
    const names = {
      'apis_mellifera': 'Ape domestica',
      'bombus_terrestris': 'Bombus terrestre',
      'papilio_machaon': 'Macaone',
      'vanessa_cardui': 'Vanessa del cardo',
      'pieris_brassicae': 'Cavolaia maggiore'
    };
    return names[species] || species;
  }

  toJSON() {
    return {
      id: this.id,
      species: this.species,
      commonName: this.commonName,
      location: this.location,
      timestamp: this.timestamp,
      confidence: this.confidence,
      observedBy: this.observedBy,
      notes: this.notes,
      images: this.images,
      tags: this.tags,
      metadata: this.metadata
    };
  }
}

module.exports = Pollinator;
