const emailjs = require("emailjs");

const createSmtpClient = (email, password) => {
  return new emailjs.SMTPClient({
    user: email,
    password: password,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    ssl: {
      rejectUnauthorized: false,
    },
    timeout: 30000,
  });
};

module.exports = createSmtpClient;
