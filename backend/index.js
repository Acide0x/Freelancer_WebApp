require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Import routes
const userRoutes = require("./routes/user.route");
const jobRoutes = require("./routes/job.route");
const adminRoutes = require("./routes/admin.route");
const uploadRoutes = require("./routes/upload.route");
const discussionRoutes = require("./routes/discussion.route"); // ✅ Discussion routes
const commentRoutes = require("./routes/comment.route");       // ✅ Comment routes

const app = express();

// -------------------- Middleware --------------------
app.use(express.json());
app.use(cookieParser());

// -------------------- CORS Configuration --------------------
const allowedOrigins = ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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

// -------------------- Route Registration (FLAT STRUCTURE) --------------------
app.use("/users", userRoutes);
app.use("/jobs", jobRoutes);
app.use("/admins", adminRoutes);
app.use("/upload", uploadRoutes);

// ✅ Flat routes - no /api prefix, no nesting
app.use("/discussions", discussionRoutes);
app.use("/comments", commentRoutes);

// -------------------- Health Check --------------------
app.get("/", (req, res) => {
  res.json({ 
    success: true, 
    message: "✅ Freelancer WebApp Backend is running!",
    endpoints: {
      discussions: "/discussions",
      comments: "/comments",
      users: "/users",
      jobs: "/jobs",
      admin: "/admins",
      upload: "/upload"
    }
  });
});

// -------------------- 404 Handler --------------------
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// -------------------- Error Handling --------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: "Validation failed", errors: messages });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: "Duplicate field value entered" });
  }
  
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  res.status(500).json({ success: false, message: "Something went wrong!" });
});

// -------------------- Server Startup --------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`💬 Discussions: http://localhost:${PORT}/discussions`);
    console.log(`💬 Comments: http://localhost:${PORT}/comments`);
  });
};

startServer().catch((err) => {
  console.error("💥 Failed to start server:", err);
  process.exit(1);
});