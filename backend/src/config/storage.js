const supabase = require("./supabase");

const BUCKET = "app-data";

const downloadJson = async (fileName, fallback = []) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(fileName);

  if (error) {
    // File abhi exist nahi karti
    if (error.message?.toLowerCase().includes("not found")) {
      return fallback;
    }

    throw error;
  }

  const text = await data.text();

  if (!text.trim()) {
    return fallback;
  }

  return JSON.parse(text);
};

const uploadJson = async (fileName, data) => {
  const json = JSON.stringify(data, null, 2);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, Buffer.from(json, "utf8"), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    throw error;
  }
};

module.exports = {
  downloadJson,
  uploadJson,
};
