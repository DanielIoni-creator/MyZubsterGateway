class EmailService {
  constructor() {
    this.isConfigured = false;
    this.isTestMode = true;
    console.log('📧 Email Service initialized in TEST MODE');
    console.log('📧 Emails will be logged to console, not sent');
  }

  async sendEmail({ to, subject, html, text }) {
    // SEMPRE in modalità test per evitare errori di autenticazione
    console.log('📧 ===== EMAIL (TEST MODE) =====');
    console.log(`📧 To: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Content: ${html || text}`);
    console.log('📧 =============================');
    
    // Simula invio con successo
    return {
      success: true,
      messageId: 'test-' + Date.now() + '-' + Math.random().toString(36).substring(7),
      recipient: to,
      mode: 'test'
    };
  }

  generateWelcomeEmail(user) {
    return {
      subject: 'Benvenuto su MyZubster! 🚀',
      html: `
        <h1>Benvenuto ${user.username || 'utente'}!</h1>
        <p>Grazie per esserti registrato su MyZubster.</p>
        <p>Con MyZubster puoi:</p>
        <ul>
          <li>💰 Acquistare e vendere token</li>
          <li>🤖 Partecipare ai bounty</li>
          <li>📊 Monitorare i tuoi investimenti</li>
        </ul>
        <p>Visita il tuo dashboard: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard">Dashboard</a></p>
        <br>
        <p>Team MyZubster 🚀</p>
      `
    };
  }

  generateTokenPurchaseEmail(user, token, amount) {
    return {
      subject: 'Acquisto Token Confermato ✅',
      html: `
        <h1>Acquisto Confermato!</h1>
        <p>Ciao ${user.username || 'utente'},</p>
        <p>Hai acquistato con successo ${amount || 10} token <strong>${token.symbol || 'MYZ'}</strong> (${token.name || 'Token'}).</p>
        <p>💰 Importo totale: $${((amount || 10) * (token.tokenPrice || 1000)).toFixed(2)}</p>
        <p>📊 Visita il tuo portafoglio: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet">Portafoglio</a></p>
        <br>
        <p>Team MyZubster 🚀</p>
      `
    };
  }

  generateBountyCompletedEmail(user, bounty) {
    return {
      subject: 'Bounty Completato con Successo! 🎉',
      html: `
        <h1>🎉 Congratulazioni!</h1>
        <p>Ciao ${user.username || 'utente'},</p>
        <p>Hai completato con successo il bounty: <strong>${bounty.title || 'Bounty completato'}</strong></p>
        <p>💰 Ricompensa: ${bounty.reward || '0.05 XMR'}</p>
        <p>📋 Puoi vedere tutti i tuoi bounty completati nel tuo profilo.</p>
        <br>
        <p>Continua così! 🚀</p>
        <p>Team MyZubster</p>
      `
    };
  }

  async sendWelcomeEmail(user) {
    const emailData = this.generateWelcomeEmail(user);
    return this.sendEmail({
      to: user.email || 'test@example.com',
      subject: emailData.subject,
      html: emailData.html
    });
  }

  async sendTokenPurchaseEmail(user, token, amount) {
    const emailData = this.generateTokenPurchaseEmail(user, token, amount);
    return this.sendEmail({
      to: user.email || 'test@example.com',
      subject: emailData.subject,
      html: emailData.html
    });
  }

  async sendBountyCompletedEmail(user, bounty) {
    const emailData = this.generateBountyCompletedEmail(user, bounty);
    return this.sendEmail({
      to: user.email || 'test@example.com',
      subject: emailData.subject,
      html: emailData.html
    });
  }
}

module.exports = new EmailService();
