const crypto = require("crypto");
const { SMTPClient } = require("smtp-client");

const sessions = new Map();

const verifySmtpCredentials = async (email, password) => {
  const client = new SMTPClient({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    timeout: 15000,
    rejectUnauthorized: false,
  });

  try {
    await client.connect();

    await client.greet({
      hostname: process.env.SMTP_HOST,
    });

    await client.authLogin({
      username: email,
      password,
    });

    await client.quit();

    return true;
  } catch (error) {
    try {
      await client.close();
    } catch {}

    throw error;
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const cleanEmail = email.trim();

    await verifySmtpCredentials(cleanEmail, password);

    const sessionId = crypto.randomUUID();

    sessions.set(sessionId, {
      email: cleanEmail,
      password,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      sessionId,
      email: cleanEmail,
    });
  } catch (error) {
    console.error("SMTP login error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }
};

const getSession = async (sessionId) => {
  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
};

const deleteSession = async (sessionId) => {
  if (!sessionId) {
    return;
  }

  sessions.delete(sessionId);
};

const checkSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: "No session found",
      });
    }

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired",
      });
    }

    return res.status(200).json({
      success: true,
      email: session.email,
    });
  } catch (error) {
    console.error("Check session error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to check session",
    });
  }
};

module.exports = {
  login,
  getSession,
  deleteSession,
  checkSession,
};
