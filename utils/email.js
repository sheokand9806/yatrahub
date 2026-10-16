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
    if (process.env.EMAIL_HOST) {
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
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

    let info;
    if (process.env.SENDGRID_PASSWORD) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_PASSWORD}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: this.to }] }],
          from: {
            email: process.env.EMAIL_FROM || 'hello@yatrahub.in',
            name: 'YatraHub'
          },
          subject,
          content: [
            { type: 'text/plain', value: mailOptions.text },
            { type: 'text/html', value: mailOptions.html }
          ]
        })
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `SendGrid API returned ${response.status}: ${details}`
        );
      }
      info = { accepted: [this.to], response: response.status };
    } else {
      info = await this.newTransport().sendMail(mailOptions);
    }

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
