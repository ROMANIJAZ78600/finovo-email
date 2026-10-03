const { ImapFlow } = require("imapflow");

const createImapClient = (email, password) => {
  return new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT),
    secure: true,

    auth: {
      user: email,
      pass: password,
    },

    tls: {
      rejectUnauthorized: false,
    },
  });
};

module.exports = createImapClient;
