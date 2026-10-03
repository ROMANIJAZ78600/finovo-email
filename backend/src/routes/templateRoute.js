const express = require("express");

const {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require("../controllers/templateController");

const router = express.Router();

router.post("/list", getAllTemplates);

router.post("/", createTemplate);

router.put("/:id", updateTemplate);

router.delete("/:id", deleteTemplate);

module.exports = router;
