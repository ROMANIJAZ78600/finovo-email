const express = require("express");

const {
  sendTestEmail,
  sendBulkEmails,
  exportEmailRecords,
} = require("../controllers/emailController");

const router = express.Router();

router.post("/test", sendTestEmail);

router.post("/bulk", sendBulkEmails);

router.post("/export", exportEmailRecords);

module.exports = router;
