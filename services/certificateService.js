const crypto = require('crypto');
const Certificate = require('../models/Certificate');

class CertificateService {
  generateCertificateId(plantId, ownerId) {
    const hash = crypto.createHash('sha256');
    hash.update(`${plantId}-${ownerId}-${Date.now()}`);
    return `CERT-${hash.digest('hex').substring(0, 12).toUpperCase()}`;
  }

  async createCertificate(plant, owner) {
    const certificateId = this.generateCertificateId(plant._id, owner._id);

    const certificate = new Certificate({
      plantId: plant._id,
      owner: owner._id,
      certificateId: certificateId,
      metadata: {
        species: plant.species,
        commonName: plant.commonName,
        gps: plant.gps,
        age: plant.age,
        size: plant.size,
        registrationDate: plant.createdAt,
        moneroAddress: plant.moneroAddress
      },
      status: 'pending'
    });

    await certificate.save();
    return certificate;
  }

  async mintCertificate(certificateId, txId) {
    const certificate = await Certificate.findOne({ certificateId });
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    certificate.blockchainTxId = txId;
    certificate.status = 'minted';
    certificate.updatedAt = new Date();
    await certificate.save();

    return certificate;
  }

  async transferCertificate(certificateId, fromUser, toUser) {
    const certificate = await Certificate.findOne({ certificateId });
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    if (certificate.owner.toString() !== fromUser._id.toString()) {
      throw new Error('You are not the owner of this certificate');
    }

    certificate.transferHistory.push({
      from: fromUser._id,
      to: toUser._id
    });
    certificate.owner = toUser._id;
    certificate.updatedAt = new Date();
    await certificate.save();

    return certificate;
  }

  async getCertificate(certificateId) {
    const certificate = await Certificate.findOne({ certificateId })
      .populate('owner', 'username email')
      .populate('plantId', 'species commonName gps');
    return certificate;
  }

  async getUserCertificates(userId) {
    const certificates = await Certificate.find({ owner: userId })
      .populate('plantId', 'species commonName gps')
      .sort({ createdAt: -1 });
    return certificates;
  }

  async verifyCertificate(certificateId) {
    const certificate = await Certificate.findOne({ certificateId });
    if (!certificate) {
      return { valid: false, reason: 'Certificate not found' };
    }

    if (certificate.status !== 'minted') {
      return { valid: false, reason: `Certificate not minted (status: ${certificate.status})` };
    }

    return {
      valid: true,
      certificate: {
        id: certificate.certificateId,
        owner: certificate.owner,
        metadata: certificate.metadata,
        blockchainTxId: certificate.blockchainTxId,
        mintedAt: certificate.updatedAt
      }
    };
  }
}

module.exports = new CertificateService();
