const express = require("express");

const { login, checkSession } = require("../controllers/authcontrollers");

const router = express.Router();

router.post("/login", login);
router.post("/check-session", checkSession);

module.exports = router;
