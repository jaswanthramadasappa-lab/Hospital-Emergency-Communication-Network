
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const departments = [
  { id: 1, name: "Emergency Room", status: "Available" },
  { id: 2, name: "ICU", status: "Available" },
  { id: 3, name: "Ambulance", status: "Available" },
  { id: 4, name: "Cardiology", status: "Available" }
];

const alerts = [];

app.get("/", (req, res) => {
  res.json({
    message: "Hospital Emergency Communication Network API",
    status: "running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    backend: "online",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/departments", (req, res) => {
  res.json({ success: true, data: departments });
});

app.get("/api/alerts", (req, res) => {
  res.json({ success: true, data: alerts });
});

app.post("/api/alerts", (req, res) => {
  const { department, message, priority } = req.body;

  if (
    typeof department !== "string" ||
    !department.trim() ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Department and message are required."
    });
  }

  const allowedPriorities = ["Low", "Medium", "High", "Critical"];
  const selectedPriority = priority ?? "High";

  if (!allowedPriorities.includes(selectedPriority)) {
    return res.status(400).json({
      success: false,
      message: "Invalid priority."
    });
  }

  const alert = {
    id: randomUUID(),
    department: department.trim(),
    message: message.trim(),
    priority: selectedPriority,
    status: "Active",
    createdAt: new Date().toISOString()
  };

  alerts.unshift(alert);

  res.status(201).json({
    success: true,
    message: "Emergency alert created.",
    data: alert
  });
});

app.patch("/api/alerts/:id/acknowledge", (req, res) => {
  const alert = alerts.find(item => item.id === req.params.id);

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: "Alert not found."
    });
  }

  alert.status = "Acknowledged";
  res.json({ success: true, data: alert });
});

app.patch("/api/alerts/:id/resolve", (req, res) => {
  const alert = alerts.find(item => item.id === req.params.id);

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: "Alert not found."
    });
  }

  alert.status = "Resolved";
  res.json({ success: true, data: alert });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hospital backend running on port ${PORT}`);
});
