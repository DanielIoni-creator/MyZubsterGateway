const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendOrderConfirmation(order, userEmail) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'MyZubster <noreply@myzubster.com>',
        to: userEmail,
        subject: 'Order Confirmation - MyZubster',
        html: `
          <h1>Order Confirmation</h1>
          <p>Thank you for your order!</p>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Total:</strong> ${order.total} XMR</p>
          <br>
          <p>MyZubster - Global Plant & Pet Map</p>
        `
      };
      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${userEmail}`);
      return { success: true };
    } catch (error) {
      console.error('Email error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
