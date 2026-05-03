// models/chat.model.js
const mongoose = require("mongoose");

// ============================================================================
// 💬 ChatConversation — a chat room (job-specific or direct message)
// ============================================================================
const chatConversationSchema = new mongoose.Schema(
  {
    // Linked job (required for type "job" only)
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      sparse: true,
    },

    // Both participants for direct chats; client + worker for job chats
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // "job" = tied to a job; "direct" = user-to-user DM
    type: {
      type: String,
      enum: ["job", "direct"],
      required: true,
    },

    // Human-readable label (e.g. "Job – Plumbing Fix")
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // Snapshot of the latest message for list previews
    lastMessage: {
      text:      String,
      sender:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
    },

    // Per-user unread counts: { "<userId>": <count> }
    // Use Map so Mongoose handles dot-notation updates cleanly
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// ============================================================================
// 📑 ChatMessage — a single message in a conversation
// ============================================================================
const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    attachments: [
      {
        url:      String,
        filename: String,
        mimeType: String,
        size:     Number,
      },
    ],
    // Track which participants have read this message
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Soft delete — deleted messages are hidden but retained for audit
    deletedAt: Date,
  },
  { timestamps: true }
);

// ============================================================================
// 🗂️ INDEXES
// ============================================================================

// One chat room per job
chatConversationSchema.index({ jobId: 1 }, { sparse: true, unique: true });

// Fast lookup of all conversations a user is in
chatConversationSchema.index({ participants: 1, updatedAt: -1 });

// Find existing direct conversation between two specific users
chatConversationSchema.index({ type: 1, participants: 1 });

// Chronological message history for a conversation
chatMessageSchema.index({ conversationId: 1, createdAt: 1 });

// Find all messages from a sender (admin moderation, etc.)
chatMessageSchema.index({ sender: 1 });

// ============================================================================
// ✅ VALIDATION — enforce participant count rules at the schema level
// ============================================================================
chatConversationSchema.pre("validate", function (next) {
  if (this.type === "direct" && this.participants.length !== 2) {
    return next(new Error("Direct conversations must have exactly 2 participants"));
  }
  if (this.type === "job" && !this.jobId) {
    return next(new Error("Job conversations must reference a jobId"));
  }
  next();
});

// ============================================================================
// 📦 EXPORTS
// ============================================================================
module.exports = {
  ChatConversation: mongoose.model("ChatConversation", chatConversationSchema),
  ChatMessage:      mongoose.model("ChatMessage", chatMessageSchema),
};