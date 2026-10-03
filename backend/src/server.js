require("dotenv").config();

const express = require("express");
const cors = require("cors");

const emailRoutes = require("./routes/email");
const templateRoutes = require("./routes/templateRoute");
const authRoutes = require("./routes/authroutes");
const recipientRoutes = require("./routes/recipientroute");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Email Sender Backend is running",
  });
});

app.use("/api/email", emailRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/recipients", recipientRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
