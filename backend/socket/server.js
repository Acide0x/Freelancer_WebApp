// backend/socket/server.js
const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

let io;

const initSocket = (server) => {
  // Prevent multiple initializations
  if (io) return io;
  
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  // Authenticate socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      
      if (!user || !user.isActive) return next(new Error("Invalid user"));
      
      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      console.error("Socket auth error:", err);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.user?.fullName || 'Unknown'} (${socket.userId})`);

    // === Join job-specific chat room ===
    socket.on("join:job_chat", async ({ jobId }, callback) => {
      try {
        // Lazy-load Job model to avoid circular deps
        const Job = require("../models/job.model");
        const job = await Job.findById(jobId).select("client assignedWorker status").lean();
        
        if (!job || job.status !== "in_progress") {
          return callback?.({ success: false, message: "Job chat not available" });
        }

        const isParticipant = 
          job.client?.toString() === socket.userId || 
          job.assignedWorker?.toString() === socket.userId;
        
        if (!isParticipant) {
          return callback?.({ success: false, message: "Unauthorized" });
        }

        socket.join(`job:${jobId}`);
        callback?.({ success: true, message: "Joined job chat", roomId: `job:${jobId}` });
      } catch (err) {
        console.error("join:job_chat error:", err);
        callback?.({ success: false, message: "Failed to join chat" });
      }
    });

    // === Send message to job chat ===
    socket.on("message:job_send", async ({ jobId, content }, callback) => {
      try {
        const Job = require("../models/job.model");
        const { ChatMessage, ChatConversation } = require("../models/chat.model");
        
        const job = await Job.findById(jobId).select("client assignedWorker status").lean();
        if (!job || job.status !== "in_progress") {
          return callback?.({ success: false, message: "Cannot send message to this job" });
        }

        const isParticipant = 
          job.client?.toString() === socket.userId || 
          job.assignedWorker?.toString() === socket.userId;
        
        if (!isParticipant) {
          return callback?.({ success: false, message: "Unauthorized" });
        }

        // Save message
        const message = await ChatMessage.create({
          conversationId: jobId, // Using jobId as conversationId for job chats
          sender: socket.userId,
          content: content.trim(),
          attachments: []
        });

        const populated = await message.populate("sender", "fullName avatar");

        // Broadcast to room (excludes sender)
        socket.to(`job:${jobId}`).emit("message:job_received", {
          _id: populated._id,
          content: populated.content,
          sender: populated.sender,
          createdAt: populated.createdAt,
          readBy: populated.readBy
        });

        // Update last message preview
        await ChatConversation.findOneAndUpdate(
          { jobId },
          {
            lastMessage: {
              text: content.trim(),
              sender: socket.userId,
              timestamp: new Date()
            }
          },
          { upsert: true, new: true }
        );

        callback?.({ success: true, message: populated.toObject() });
      } catch (err) {
        console.error("message:job_send error:", err);
        callback?.({ success: false, message: "Failed to send message" });
      }
    });

    // === Typing indicators ===
    socket.on("typing:job_start", ({ jobId }) => {
      socket.to(`job:${jobId}`).emit("typing:job_update", {
        userId: socket.userId,
        userName: socket.user.fullName,
        isTyping: true
      });
    });

    socket.on("typing:job_stop", ({ jobId }) => {
      socket.to(`job:${jobId}`).emit("typing:job_update", {
        userId: socket.userId,
        userName: socket.user.fullName,
        isTyping: false
      });
    });

    // === Disconnect ===
    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${socket.user?.fullName || 'Unknown'}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initSocket(server) first.");
  }
  return io;
};

// ✅ EXPORTS - NO SELF-REQUIRE
module.exports = { initSocket, getIO };