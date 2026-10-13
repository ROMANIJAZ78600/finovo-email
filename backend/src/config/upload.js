const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    files: 10,
    fileSize: 20 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (!file.originalname) {
      return cb(new Error("Filename is required"));
    }

    cb(null, true);
  },
});

module.exports = upload;
