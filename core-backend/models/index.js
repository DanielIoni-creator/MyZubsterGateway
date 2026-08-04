// models/index.js - Configurazione Sequelize (SQLite)
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Connessione al database SQLite (nessuna installazione richiesta)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Definizione del modello Order
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  moneroAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  moneroAmount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  addressIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  network: {
    type: DataTypes.STRING(10),
    defaultValue: 'testnet'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'expired'),
    defaultValue: 'pending'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  txHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  confirmations: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  amountReceived: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'orders',
  timestamps: true
});

// Esporta tutto
const db = {
  sequelize,
  Sequelize,
  Order
};

module.exports = db;