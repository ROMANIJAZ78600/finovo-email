const { getSession } = require("./authcontrollers");
const { downloadJson, uploadJson } = require("../config/storage");

const templatesFile = "template.json";

const getTemplates = async () => {
  return await downloadJson(templatesFile, {});
};

const saveTemplates = async (templates) => {
  await uploadJson(templatesFile, templates);
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

// =========================
// GET USER TEMPLATES
// =========================

const getAllTemplates = async (req, res) => {
  try {
    const session = await getUserSession(req, res);

    if (!session) {
      return;
    }

    const templatesData = await getTemplates();
    const userEmail = session.email;
    const userTemplates = templatesData[userEmail] || [];

    res.json({
      success: true,
      templates: userTemplates,
    });
  } catch (error) {
    console.error("Get templates error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load templates",
    });
  }
};

// =========================
// CREATE TEMPLATE
// =========================

const createTemplate = async (req, res) => {
  try {
    const session = await getUserSession(req, res);

    if (!session) {
      return;
    }

    const { name, subject, body } = req.body;

    if (!name?.trim() || !subject?.trim() || !body?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, subject and body are required",
      });
    }

    const templatesData = await getTemplates();
    const userEmail = session.email;

    if (!templatesData[userEmail]) {
      templatesData[userEmail] = [];
    }

    const newTemplate = {
      id: Date.now().toString(),
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
    };

    templatesData[userEmail].push(newTemplate);

    await saveTemplates(templatesData);

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      template: newTemplate,
    });
  } catch (error) {
    console.error("Create template error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create template",
    });
  }
};

// =========================
// UPDATE TEMPLATE
// =========================

const updateTemplate = async (req, res) => {
  try {
    const session = await getUserSession(req, res);

    if (!session) {
      return;
    }

    const { id } = req.params;
    const { name, subject, body } = req.body;

    if (!name?.trim() || !subject?.trim() || !body?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, subject and body are required",
      });
    }

    const templatesData = await getTemplates();
    const userEmail = session.email;
    const userTemplates = templatesData[userEmail] || [];

    const index = userTemplates.findIndex((template) => template.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    userTemplates[index] = {
      ...userTemplates[index],
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
    };

    templatesData[userEmail] = userTemplates;

    await saveTemplates(templatesData);

    res.json({
      success: true,
      message: "Template updated successfully",
      template: userTemplates[index],
    });
  } catch (error) {
    console.error("Update template error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update template",
    });
  }
};

// =========================
// DELETE TEMPLATE
// =========================

const deleteTemplate = async (req, res) => {
  try {
    const session = await getUserSession(req, res);

    if (!session) {
      return;
    }

    const { id } = req.params;

    const templatesData = await getTemplates();
    const userEmail = session.email;
    const userTemplates = templatesData[userEmail] || [];

    const templateExists = userTemplates.some((template) => template.id === id);

    if (!templateExists) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    const updatedTemplates = userTemplates.filter(
      (template) => template.id !== id,
    );

    templatesData[userEmail] = updatedTemplates;

    await saveTemplates(templatesData);

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Delete template error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete template",
    });
  }
};

module.exports = {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
