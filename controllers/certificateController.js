const CertificateService = require('../services/certificateService');
const Plant = require('../models/Plant');

exports.createCertificate = async (req, res) => {
  try {
    const { plantId } = req.body;

    const plant = await Plant.findById(plantId);
    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Controlla che l'utente sia il proprietario
    if (plant.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not the owner of this plant'
      });
    }

    const certificate = await CertificateService.createCertificate(plant, req.user);

    res.status(201).json({
      success: true,
      message: 'Certificate created successfully',
      certificate
    });
  } catch (error) {
    console.error('Create certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.mintCertificate = async (req, res) => {
  try {
    const { certificateId, txId } = req.body;

    const certificate = await CertificateService.mintCertificate(certificateId, txId);

    res.json({
      success: true,
      message: 'Certificate minted successfully on blockchain',
      certificate
    });
  } catch (error) {
    console.error('Mint certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.transferCertificate = async (req, res) => {
  try {
    const { certificateId, toUserId } = req.body;

    const certificate = await CertificateService.transferCertificate(
      certificateId,
      req.user,
      { _id: toUserId }
    );

    res.json({
      success: true,
      message: 'Certificate transferred successfully',
      certificate
    });
  } catch (error) {
    console.error('Transfer certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await CertificateService.getCertificate(certificateId);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getUserCertificates = async (req, res) => {
  try {
    const certificates = await CertificateService.getUserCertificates(req.user.id);

    res.json({
      success: true,
      certificates
    });
  } catch (error) {
    console.error('Get user certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const result = await CertificateService.verifyCertificate(certificateId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
