const createSmtpClient = async (email, password) => {
  const { SMTPClient } = await import("emailjs");

  return new SMTPClient({
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
