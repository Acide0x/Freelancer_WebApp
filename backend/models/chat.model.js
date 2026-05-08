// models/chat.model.js
const mongoose = require("mongoose");

// ============================================================================
// 💬 ChatConversation — a chat room (job-specific or direct message)
// ============================================================================
const chatConversationSchema = new mongoose.Schema(
  {
    // Linked job (required for type "job" only)
    jobId: {
      type:   mongoose.Schema.Types.ObjectId,
      ref:    "Job",
      sparse: true,
    },

    // Both participants; for job chats: [clientId, workerId]
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    // "job" = tied to a job; "direct" = user-to-user DM
    type: {
      type:     String,
      enum:     ["job", "direct"],
      required: true,
    },

    // Human-readable label (e.g. "Job – Plumbing Fix at 5th Ave")
    title: {
      type:      String,
      trim:      true,
      maxlength: 120,
    },

    // Snapshot of the latest message for list previews
    lastMessage: {
      text:      { type: String, maxlength: 200 },
      sender:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
      // true when the last message is a system notice (e.g. "Job started")
      isSystem:  { type: Boolean, default: false },
    },

    // Per-user unread counts: { "<userId>": <count> }
    unreadCounts: {
      type:    Map,
      of:      Number,
      default: {},
    },

    // Participants who have archived/hidden this conversation for themselves
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Participants who have been muted notifications for this conversation
    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// ============================================================================
// 📑 ChatMessage — a single message in a conversation
// ============================================================================
const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "ChatConversation",
      required: true,
      index:    true,
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ── Content ──────────────────────────────────────────────────────────────
    content: {
      type:      String,
      trim:      true,
      maxlength: 4000,
      // Not required — a message can be attachments-only
    },
    attachments: [
      {
        url:      { type: String, required: true },
        filename: String,
        mimeType: String,
        size:     Number,   // bytes
      },
    ],

    // ── Reply threading ───────────────────────────────────────────────────────
    // Store a denormalised snapshot so the reply preview never goes stale
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" },
      // Snapshot fields
      senderName:    String,
      contentSnippet: { type: String, maxlength: 200 },
      isDeleted:     { type: Boolean, default: false },
    },

    // ── Edit history ──────────────────────────────────────────────────────────
    editedAt:    Date,   // set on each edit
    edits: [
      {
        content:  String,
        editedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Read receipts ─────────────────────────────────────────────────────────
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ── Reactions: { "👍": [userId, ...], "❤️": [...] } ──────────────────────
    reactions: {
      type:    Map,
      of:      [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: {},
    },

    // ── System messages (job status changes etc.) ─────────────────────────────
    isSystem: { type: Boolean, default: false },

    // ── Soft delete ───────────────────────────────────────────────────────────
    // deletedAt → message is "unsent" — visible as placeholder for everyone
    deletedAt:  Date,
    deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// ============================================================================
// 🗂️ INDEXES
// ============================================================================

// One chat room per job (unique)
chatConversationSchema.index({ jobId: 1 }, { sparse: true, unique: true });

// All conversations for a user, most recent first
chatConversationSchema.index({ participants: 1, updatedAt: -1 });

// Check for existing direct conversation between two users
chatConversationSchema.index({ type: 1, participants: 1 });

// Chronological message history
chatMessageSchema.index({ conversationId: 1, createdAt: 1 });

// Sender lookup (admin moderation, message search)
chatMessageSchema.index({ sender: 1, createdAt: -1 });

// Soft-deleted messages (TTL candidate for hard-delete after 30 days)
chatMessageSchema.index({ deletedAt: 1 }, { sparse: true });

// ============================================================================
// ✅ PRE-VALIDATE HOOKS
// ============================================================================
chatConversationSchema.pre("validate", function (next) {
  if (this.type === "direct" && this.participants.length !== 2) {
    return next(new Error("Direct conversations must have exactly 2 participants"));
  }
  if (this.type === "job" && !this.jobId) {
    return next(new Error("Job conversations must reference a jobId"));
  }
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    // Allow system messages with no content
    if (!this.isSystem) {
      return next(new Error("Message must have content or at least one attachment"));
    }
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