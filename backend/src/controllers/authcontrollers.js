const crypto = require("crypto");
const { SMTPClient } = require("smtp-client");
const supabase = require("../config/supabase");

const ALGORITHM = "aes-256-gcm";

const getEncryptionKey = () => {
  const key = Buffer.from(process.env.SESSION_ENCRYPTION_KEY, "hex");

  if (key.length !== 32) {
    throw new Error(
      "SESSION_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)",
    );
  }

  return key;
};

const encryptPassword = (password) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
};

const decryptPassword = (encryptedPassword) => {
  const key = getEncryptionKey();

  const [ivHex, authTagHex, encryptedHex] = encryptedPassword.split(":");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
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

    const encryptedPassword = encryptPassword(password);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("sessions").insert({
      id: sessionId,
      email: cleanEmail,
      password_encrypted: encryptedPassword,
      expires_at: expiresAt,
    });

    if (error) {
      console.error("Session database error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to create session",
      });
    }

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
  if (!sessionId) return null;

  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, email, password_encrypted, expires_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("Get session database error:", error.message);
      return null;
    }

    if (!data) return null;

    if (Date.now() > new Date(data.expires_at).getTime()) {
      await supabase.from("sessions").delete().eq("id", sessionId);
      return null;
    }

    return {
      email: data.email,
      password: decryptPassword(data.password_encrypted),
      expiresAt: new Date(data.expires_at).getTime(),
    };
  } catch (error) {
    console.error("Get session error:", error.message);
    return null;
  }
};

const deleteSession = async (sessionId) => {
  if (!sessionId) return;

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("Delete session error:", error.message);
  }
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
  encryptPassword,
  decryptPassword,
};
