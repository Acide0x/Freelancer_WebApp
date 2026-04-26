// models/chat.model.js
const mongoose = require("mongoose");

// === Chat Conversation (Room) ===
const chatConversationSchema = new mongoose.Schema({
  // Job-specific chat
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: function() { return this.type === "job"; },
    sparse: true
  },
  
  // Direct message chat
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    validate: {
      validator: function(v) {
        return this.type === "direct" ? v.length === 2 : true;
      },
      message: "Direct chat must have exactly 2 participants"
    }
  }],
  
  // Chat type
  type: {
    type: String,
    enum: ["job", "direct"],
    required: true
  },
  
  // Metadata
  title: { type: String, trim: true, maxlength: 100 }, // For job chats: "Job #123 - Plumbing Fix"
  lastMessage: {
    text: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: Date
  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

// === Chat Message ===
const chatMessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatConversation",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  attachments: [{
    url: String,
    filename: String,
    mimeType: String,
    size: Number
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  deletedAt: Date // Soft delete for messages
}, { timestamps: true });

// Indexes
chatConversationSchema.index({ jobId: 1 }, { sparse: true, unique: true }); // One chat per job
chatConversationSchema.index({ participants: 1, type: 1 }); // Find direct chats
chatMessageSchema.index({ conversationId: 1, createdAt: 1 }); // Fast message history
chatMessageSchema.index({ sender: 1 });

// Virtual for conversation preview
chatConversationSchema.virtual("messages", {
  ref: "ChatMessage",
  localField: "_id",
  foreignField: "conversationId",
  options: { sort: { createdAt: -1 }, limit: 1 }
});

chatConversationSchema.set("toJSON", { virtuals: true });
chatConversationSchema.set("toObject", { virtuals: true });

module.exports = {
  ChatConversation: mongoose.model("ChatConversation", chatConversationSchema),
  ChatMessage: mongoose.model("ChatMessage", chatMessageSchema)
};