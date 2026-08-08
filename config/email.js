module.exports = {
  // Configurazione SMTP
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true per 465, false per altre porte
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  
  // Email del mittente
  from: process.env.EMAIL_FROM || 'noreply@myzubster.com',
  
  // Template email
  templates: {
    welcome: {
      subject: 'Benvenuto su MyZubster!',
      template: 'welcome'
    },
    tokenPurchase: {
      subject: 'Acquisto Token Confermato',
      template: 'tokenPurchase'
    },
    tokenTransfer: {
      subject: 'Trasferimento Token Ricevuto',
      template: 'tokenTransfer'
    },
    bountyCompleted: {
      subject: 'Bounty Completato con Successo!',
      template: 'bountyCompleted'
    }
  }
};
