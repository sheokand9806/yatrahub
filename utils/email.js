const nodemailer = require('nodemailer');
const { convert } = require('html-to-text');
const renderEmail = require('./emailTemplates');

module.exports = class Email {
  constructor(user, url, data) {
    this.data = data;
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `YatraHub <${process.env.EMAIL_FROM ||
      'hello@yatrahub.in'}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production' && process.env.SENDGRID_PASSWORD) {
      // Sendgrid
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: process.env.SENDGRID_USERNAME || 'apikey',
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    if (process.env.EMAIL_HOST) {
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }

    // No SMTP configured: don't send, just print the email to the console
    return nodemailer.createTransport({ jsonTransport: true });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML from the React email template
    const html = renderEmail(template, {
      firstName: this.firstName,
      url: this.url,
      data: this.data,
      subject
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html, { wordwrap: 130 })
    };

    // 3) Create a transport and send email
    const info = await this.newTransport().sendMail(mailOptions);

    if (!process.env.EMAIL_HOST && !process.env.SENDGRID_PASSWORD) {
      console.log(
        `\n📧 [email not sent - no SMTP configured] To: ${this.to} | Subject: ${subject}\n   Link: ${this.url}\n`
      );
    }
    return info;
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the YatraHub Family!');
  }

  async sendBookingConfirmation() {
    await this.send(
      'bookingConfirmation',
      `Booking confirmed: ${this.data.tourName}`
    );
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};
