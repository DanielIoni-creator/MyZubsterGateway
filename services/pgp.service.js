const openpgp = require('openpgp');
const EncryptedOrder = require('../models/EncryptedOrder');
const { fingerprintKey, redactSensitiveOrderData } = require('../utils/crypto');

class PgpService {
  constructor({ encryptedOrderModel = EncryptedOrder } = {}) {
    this.EncryptedOrder = encryptedOrderModel;
  }

  async generateKeyPair({ name = 'MyZubster Gateway', email = 'security@myzubster.local', passphrase } = {}) {
    return openpgp.generateKey({
      type: 'rsa',
      rsaBits: 4096,
      userIDs: [{ name, email }],
      passphrase
    });
  }

  async encryptData(data, armoredPublicKey) {
    const publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
    const message = await openpgp.createMessage({ text: JSON.stringify(data) });
    return openpgp.encrypt({
      message,
      encryptionKeys: publicKey,
      format: 'armored'
    });
  }

  async decryptData(armoredMessage, armoredPrivateKey, passphrase) {
    let privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey });
    if (passphrase) {
      privateKey = await openpgp.decryptKey({ privateKey, passphrase });
    }

    const message = await openpgp.readMessage({ armoredMessage });
    const { data } = await openpgp.decrypt({
      message,
      decryptionKeys: privateKey,
      format: 'utf8'
    });
    return JSON.parse(data);
  }

  async encryptOrder(order, armoredPublicKey) {
    const sensitiveData = redactSensitiveOrderData(order);
    const encryptedData = await this.encryptData(sensitiveData, armoredPublicKey);

    const encryptedOrder = await this.EncryptedOrder.findOneAndUpdate(
      { order: order._id, payloadType: 'order.sensitive' },
      {
        order: order._id,
        payloadType: 'order.sensitive',
        encryptedData,
        keyFingerprint: fingerprintKey(armoredPublicKey),
        algorithm: 'openpgp-rsa4096'
      },
      { new: true, upsert: true, runValidators: true }
    );

    return encryptedOrder;
  }

  async decryptOrder(encryptedOrder, armoredPrivateKey, passphrase) {
    return this.decryptData(encryptedOrder.encryptedData, armoredPrivateKey, passphrase);
  }
}

module.exports = new PgpService();
module.exports.PgpService = PgpService;
