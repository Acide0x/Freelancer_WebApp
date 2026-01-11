require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const userRoutes = require("./routes/user.route");
const jobRoutes = require("./routes/job.route");
const adminRoutes = require("./routes/admin.route");

const app = express();

// -------------------- Middleware --------------------
app.use(express.json());
app.use(cookieParser());

// CORS
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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// -------------------- MongoDB --------------------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully.");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// -------------------- Routes --------------------
app.use("/users", userRoutes);
app.use("/jobs", jobRoutes);
app.use("/admins", adminRoutes);

// -------------------- Health Check --------------------
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

// -------------------- Server --------------------
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
