// backend/index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { initSocket } = require("./socket/server"); // ✅ Correct path

// Import routes
const userRoutes = require("./routes/user.route");
const jobRoutes = require("./routes/job.route");
const adminRoutes = require("./routes/admin.route");
const uploadRoutes = require("./routes/upload.route");
const discussionRoutes = require("./routes/discussion.route");
const commentRoutes = require("./routes/comment.route");
const chatRoutes = require("./routes/chat.routes"); // ✅ Chat routes

const app = express();
const server = http.createServer(app);

// ============================================================================
// ⚙️ MIDDLEWARE
// ============================================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ============================================================================
// 🌐 CORS
// ============================================================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`🚫 CORS blocked: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
}));

// ============================================================================
// 🗄️ MongoDB
// ============================================================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  }
};

// ============================================================================
// 🗂️ Routes (FLAT STRUCTURE - NO /api PREFIX)
// ============================================================================
app.use("/users", userRoutes);
app.use("/jobs", jobRoutes);
app.use("/admins", adminRoutes);
app.use("/upload", uploadRoutes);
app.use("/discussions", discussionRoutes);
app.use("/comments", commentRoutes);
app.use("/chat", chatRoutes); // ✅ Chat at /chat (not /api/chat)

// ============================================================================
// 🔌 WebSocket
// ============================================================================
const io = initSocket(server);
app.set("io", io);

// ============================================================================
// 🏥 Health Checks
// ============================================================================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Freelancer WebApp Backend",
    websocket: { status: io ? "active" : "inactive", clients: io?.engine?.clientsCount || 0 },
    endpoints: {
      users: "/users",
      jobs: "/jobs",
      chat: "/chat",
      discussions: "/discussions",
      comments: "/comments",
    }
  });
});

app.get("/ws/health", (req, res) => {
  res.json({
    success: true,
    websocket: {
      status: io ? "active" : "inactive",
      clients: io?.engine?.clientsCount || 0,
    }
  });
});

// ============================================================================
// ❌ 404 & Error Handlers
// ============================================================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found", path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error("💥 Error:", err.name, err.message);
  
  if (err.name === "ValidationError") {
    return res.status(400).json({ 
      success: false, 
      message: "Validation failed",
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: "Duplicate value" });
  }
  
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
  
  res.status(500).json({ success: false, message: "Server error" });
});

// ============================================================================
// 🚀 Start Server
// ============================================================================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  });
  
  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`🛑 ${signal} - shutting down`);
    server.close(() => {
      io?.close();
      mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };
  
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };