const express = require("express");
const multer = require("multer");
const upload = require("../config/upload");

const {
  sendTestEmail,
  sendBulkEmails,
  exportEmailRecords,
} = require("../controllers/emailController");

const router = express.Router();

router.post("/test", sendTestEmail);

router.post(
  "/bulk",
  (req, res, next) => {
    upload.array("attachments", 10)(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Each attachment must be 10 MB or smaller",
          });
        }

        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            success: false,
            message: "Maximum 10 attachments allowed",
          });
        }

        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    });
  },
  sendBulkEmails,
);

router.post("/export", exportEmailRecords);

module.exports = router;
