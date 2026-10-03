const express = require("express");

const {
  getAllRecipients,
  addRecipient,
  deleteRecipient,
} = require("../controllers/recipientcontroller");

const router = express.Router();

router.post("/list", getAllRecipients);

router.post("/", addRecipient);
router.delete("/:id", deleteRecipient);

module.exports = router;
