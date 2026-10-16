const createSmtpClient = async (email, password) => {
  const { SMTPClient } = await import("emailjs");

  console.log("SMTP HOST:", process.env.SMTP_HOST);
  console.log("SMTP PORT:", process.env.SMTP_PORT);

  return new SMTPClient({
    user: email,
    password,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    ssl: {
      rejectUnauthorized: false,
    },
    timeout: 120000,
  });
};

module.exports = createSmtpClient;
