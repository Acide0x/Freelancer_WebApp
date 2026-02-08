// index.js

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Import routes
const userRoutes = require("./routes/user.route");
const jobRoutes = require("./routes/job.route");
const adminRoutes = require("./routes/admin.route");
const uploadRoutes = require("./routes/upload.route"); // ✅ Added upload route

const app = express();

// -------------------- Middleware --------------------
app.use(express.json());
app.use(cookieParser());

// Note: multer is only applied on upload routes, so no global conflict

// -------------------- CORS Configuration --------------------
const allowedOrigins = ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow requests with no origin (e.g., mobile, curl)
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// -------------------- MongoDB Connection --------------------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully.");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// -------------------- Route Registration --------------------
app.use("/users", userRoutes);
app.use("/jobs", jobRoutes);
app.use("/admins", adminRoutes);
app.use("/upload", uploadRoutes); // ✅ Mount upload routes under /upload

// -------------------- Health Check --------------------
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

// -------------------- Error Handling (optional but recommended) --------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong!" });
});

// -------------------- Server Startup --------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("💥 Failed to start server:", err);
  process.exit(1);
});