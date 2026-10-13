require("dotenv").config();

const crypto = require("crypto");
const readline = require("readline");
const supabase = require("./src/config/supabase");

const ALGORITHM = "aes-256-gcm";

const encryptPassword = (password) => {
  const key = Buffer.from(process.env.SESSION_ENCRYPTION_KEY, "hex");

  if (key.length !== 32) {
    throw new Error("Invalid SESSION_ENCRYPTION_KEY");
  }

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

const main = async () => {
  try {
    const email = (await ask("User email: ")).trim();
    const password = await ask("User password: ");

    const sessionId = crypto.randomUUID();

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const passwordEncrypted = encryptPassword(password);

    const { error } = await supabase.from("sessions").insert({
      id: sessionId,
      email,
      password_encrypted: passwordEncrypted,
      expires_at: expiresAt,
    });

    if (error) {
      throw error;
    }

    console.log("\nSession created successfully!");
    console.log("Session ID:", sessionId);
    console.log("Email:", email);
    console.log("Expires:", expiresAt);
  } catch (error) {
    console.error("\nError:", error.message);
  } finally {
    rl.close();
  }
};

main();
