const express = require("express");
const { exec } = require("child_process");
const app = express();
const PORT = 5000;
const SECRET = process.env.CONTROL_API_SECRET || "myzubster_control_2026";

app.use(express.json());

const auth = (req, res, next) => {
  const token = req.headers["x-api-key"] || req.query.token;
  if (token !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

app.get("/api/status", auth, (req, res) => {
  res.json({ status: "online", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`Control API on port ${PORT}`));
