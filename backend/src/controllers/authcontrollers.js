const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { SMTPClient } = require("smtp-client");

const sessionsFile = path.join(__dirname, "../data/sessions.json");

const ensureSessionsFile = async () => {
  try {
    await fs.access(sessionsFile);
  } catch {
    await fs.writeFile(sessionsFile, "{}", "utf-8");
  }
};

const getSessions = async () => {
  await ensureSessionsFile();

  const data = await fs.readFile(sessionsFile, "utf-8");

  if (!data.trim()) {
    return {};
  }

  return JSON.parse(data);
};

const saveSessions = async (sessions) => {
  await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2), "utf-8");
};

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

    const sessions = await getSessions();

    sessions[sessionId] = {
      email: cleanEmail,
      password,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    await saveSessions(sessions);

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

  try {
    const sessions = await getSessions();

    const session = sessions[sessionId];

    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      delete sessions[sessionId];

      await saveSessions(sessions);

      return null;
    }

    return session;
  } catch (error) {
    console.error("Get session error:", error.message);

    return null;
  }
};

const deleteSession = async (sessionId) => {
  if (!sessionId) {
    return;
  }

  const sessions = await getSessions();

  delete sessions[sessionId];

  await saveSessions(sessions);
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
