const { getSession } = require("./authcontrollers");
const { downloadJson, uploadJson } = require("../config/storage");

const recipientsFile = "recipients.json";

const getRecipients = async () => {
  return await downloadJson(recipientsFile, {});
};

const saveRecipients = async (recipients) => {
  await uploadJson(recipientsFile, recipients);
};

const getUserSession = async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(401).json({
      success: false,
      message: "Login session is required",
    });
    return null;
  }

  const session = await getSession(sessionId);

  if (!session) {
    res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
    return null;
  }

  return session;
};

const getAllRecipients = async (req, res) => {
  try {
    const session = await getUserSession(req, res);
    if (!session) return;

    const recipientsData = await getRecipients();

    const userEmail = session.email;
    const userRecipients = recipientsData[userEmail] || [];

    res.json({
      success: true,
      recipients: userRecipients,
    });
  } catch (error) {
    console.error("Get recipients error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load recipients",
    });
  }
};

const addRecipient = async (req, res) => {
  try {
    const session = await getUserSession(req, res);
    if (!session) return;

    const { email, firstName } = req.body;

    if (!email?.trim() || !firstName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email and first name are required",
      });
    }

    const recipientsData = await getRecipients();
    const userEmail = session.email;

    if (!recipientsData[userEmail]) {
      recipientsData[userEmail] = [];
    }

    const newRecipient = {
      id: Date.now().toString(),
      email: email.trim(),
      firstName: firstName.trim(),
      status: "Pending",
      emailSent: "No",
      sentAt: "",
      error: "",
    };

    recipientsData[userEmail].push(newRecipient);

    await saveRecipients(recipientsData);

    res.status(201).json({
      success: true,
      message: "Recipient added successfully",
      recipient: newRecipient,
    });
  } catch (error) {
    console.error("Add recipient error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add recipient",
    });
  }
};

const deleteRecipient = async (req, res) => {
  try {
    const session = await getUserSession(req, res);
    if (!session) return;

    const { id } = req.params;

    const recipientsData = await getRecipients();

    const userEmail = session.email;
    const userRecipients = recipientsData[userEmail] || [];

    const recipientExists = userRecipients.some(
      (recipient) => recipient.id === id,
    );

    if (!recipientExists) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    recipientsData[userEmail] = userRecipients.filter(
      (recipient) => recipient.id !== id,
    );

    await saveRecipients(recipientsData);

    res.json({
      success: true,
      message: "Recipient deleted successfully",
    });
  } catch (error) {
    console.error("Delete recipient error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete recipient",
    });
  }
};

module.exports = {
  getAllRecipients,
  addRecipient,
  deleteRecipient,
};
