// controllers/chat.controller.js
const mongoose = require("mongoose");
const { ChatConversation, ChatMessage } = require("../models/chat.model");
const User = require("../models/user.model");
const Job = require("../models/job.model");

// ============================================================================
// 🔁 HELPERS
// ============================================================================

const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Verify the requesting user is a participant of the conversation.
 * Returns the conversation or null.
 */
const getConversationForUser = async (conversationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) return null;
  return ChatConversation.findOne({
    _id: conversationId,
    participants: userId,
  });
};

// ============================================================================
// 📊 UTILITIES
// ============================================================================

/**
 * GET /api/chat/unread-count
 * Returns total unread message count across all conversations for the auth user.
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId    = req.user.id;
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Sum the unreadCounts map entry for this user across all their conversations
    const result = await ChatConversation.aggregate([
      { $match: { participants: userObjId } },
      {
        $project: {
          count: {
            $ifNull: [{ $toInt: { $getField: { field: userId, input: "$unreadCounts" } } }, 0]
          }
        }
      },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);

    return res.status(200).json({
      success: true,
      unreadCount: result[0]?.total ?? 0
    });
  } catch (err) {
    console.error("❌ getUnreadCount:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/chat/search/users
 * Search for users to start a direct chat with.
 * Query: ?query=string
 */
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Query must be at least 2 characters" });
    }

    const regex = new RegExp(query.trim(), "i");
    const users = await User.find({
      _id:       { $ne: req.user.id },
      isActive:  true,
      deletedAt: { $exists: false },
      $or: [{ fullName: regex }, { email: regex }]
    })
      .select("fullName avatar email role")
      .limit(20);

    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("❌ searchUsers:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================================================================
// 📋 CONVERSATIONS
// ============================================================================

/**
 * GET /api/chat/conversations
 * List all conversations for the authenticated user (paginated).
 * Query: ?page=1&limit=20&type=direct|job
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { participants: userId };
    if (req.query.type && ["direct", "job"].includes(req.query.type)) {
      filter.type = req.query.type;
    }

    const [conversations, total] = await Promise.all([
      ChatConversation.find(filter)
        .populate("participants", "fullName avatar role")
        .populate("lastMessage.sender", "fullName avatar")
        .populate("jobId", "title status")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      ChatConversation.countDocuments(filter)
    ]);

    // Attach this user's unread count to each conversation
    const data = conversations.map(conv => {
      const obj = conv.toObject();
      obj.myUnreadCount = conv.unreadCounts?.get(req.user.id) ?? 0;
      return obj;
    });

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      conversations: data
    });
  } catch (err) {
    console.error("❌ getConversations:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chat/conversations/direct
 * Create or retrieve an existing direct conversation between two users.
 * Body: { participantId }
 */
exports.createDirectChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.id;

    if (!participantId) {
      return res.status(400).json({ success: false, message: "participantId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ success: false, message: "Invalid participantId" });
    }
    if (participantId === userId) {
      return res.status(400).json({ success: false, message: "Cannot start a chat with yourself" });
    }

    const other = await User.findById(participantId).select("_id isActive deletedAt");
    if (!other || !other.isActive || other.deletedAt) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Look for existing direct conversation with these exact two participants
    const existing = await ChatConversation.findOne({
      type: "direct",
      participants: { $all: [userId, participantId], $size: 2 }
    }).populate("participants", "fullName avatar role");

    if (existing) {
      return res.status(200).json({ success: true, conversation: existing });
    }

    const conversation = await ChatConversation.create({
      type: "direct",
      participants: [userId, participantId],
      unreadCounts: {}
    });

    const populated = await conversation.populate("participants", "fullName avatar role");
    return res.status(201).json({ success: true, conversation: populated });
  } catch (err) {
    console.error("❌ createDirectChat:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chat/conversations/job/:jobId
 * Get or create the job-specific chat conversation.
 * Only the job client and assigned worker may access.
 */
exports.getOrCreateJobChat = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId    = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId).select("client assignedWorker title status isActive");
    if (!job || !job.isActive) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const clientId  = job.client?.toString();
    const workerId  = job.assignedWorker?.toString();

    // Only participants may open the job chat
    if (userId !== clientId && userId !== workerId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not a participant of this job" });
    }

    // A job must have an assigned worker before chat is useful
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: "Job chat is only available once a provider is assigned"
      });
    }

    const participants = [clientId, workerId];

    // findOneAndUpdate with upsert = atomic get-or-create
    const conversation = await ChatConversation.findOneAndUpdate(
      { jobId, type: "job" },
      {
        $setOnInsert: {
          jobId,
          type: "job",
          participants,
          title: `Job – ${job.title}`,
          unreadCounts: {}
        }
      },
      { upsert: true, new: true }
    ).populate("participants", "fullName avatar role");

    return res.status(200).json({ success: true, conversation });
  } catch (err) {
    console.error("❌ getOrCreateJobChat:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/chat/conversations/:conversationId
 * Get a single conversation's details (participant only).
 */
exports.getConversation = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    await conversation.populate([
      { path: "participants", select: "fullName avatar role" },
      { path: "lastMessage.sender", select: "fullName avatar" },
      { path: "jobId", select: "title status" }
    ]);

    const obj = conversation.toObject();
    obj.myUnreadCount = conversation.unreadCounts?.get(req.user.id) ?? 0;

    return res.status(200).json({ success: true, conversation: obj });
  } catch (err) {
    console.error("❌ getConversation:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/chat/conversations/:conversationId
 * Soft-hides a conversation for the requesting user by removing them from participants.
 * (Does not delete messages; the other participant still sees it.)
 */
exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Pull this user from participants — they won't see it anymore
    await ChatConversation.findByIdAndUpdate(conversation._id, {
      $pull: { participants: new mongoose.Types.ObjectId(req.user.id) }
    });

    return res.status(200).json({ success: true, message: "Conversation removed" });
  } catch (err) {
    console.error("❌ deleteConversation:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================================================================
// 💬 MESSAGES
// ============================================================================

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Paginated message history. Marks all as read on fetch.
 * Query: ?page=1&limit=50&before=ISO_TIMESTAMP
 */
exports.getMessages = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const { page, limit, skip } = parsePagination(req.query);

    const filter = {
      conversationId: conversation._id,
      deletedAt:      { $exists: false }
    };

    // Optional cursor-based filtering (load older messages)
    if (req.query.before) {
      const before = new Date(req.query.before);
      if (!isNaN(before)) filter.createdAt = { $lt: before };
    }

    const [messages, total] = await Promise.all([
      ChatMessage.find(filter)
        .populate("sender", "fullName avatar role")
        .sort({ createdAt: -1 })   // newest first so client can reverse
        .skip(skip)
        .limit(limit),
      ChatMessage.countDocuments(filter)
    ]);

    // Reset this user's unread count to 0
    await ChatConversation.findByIdAndUpdate(conversation._id, {
      $set: { [`unreadCounts.${req.user.id}`]: 0 }
    });

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      messages: messages.reverse()  // chronological order for client
    });
  } catch (err) {
    console.error("❌ getMessages:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chat/conversations/:conversationId/messages
 * REST fallback for sending a message (primary flow is WebSocket).
 * Body: { content, attachments? }
 */
exports.sendMessage = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const { content, attachments } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Message content is required" });
    }
    if (content.trim().length > 2000) {
      return res.status(400).json({ success: false, message: "Message too long (max 2000 chars)" });
    }

    const userId     = req.user.id;
    const otherUsers = conversation.participants.filter(p => p.toString() !== userId);

    // Build $inc to increment unread count for every other participant
    const unreadInc = {};
    for (const uid of otherUsers) {
      unreadInc[`unreadCounts.${uid}`] = 1;
    }

    // Create message & update conversation snapshot atomically
    const [message] = await Promise.all([
      ChatMessage.create({
        conversationId: conversation._id,
        sender:         userId,
        content:        content.trim(),
        attachments:    attachments ?? [],
        readBy:         [userId]
      }),
      ChatConversation.findByIdAndUpdate(conversation._id, {
        $set: {
          lastMessage: {
            text:      content.trim().slice(0, 100),
            sender:    userId,
            timestamp: new Date()
          }
        },
        $inc: unreadInc
      })
    ]);

    const populated = await message.populate("sender", "fullName avatar role");
    return res.status(201).json({ success: true, message: populated });
  } catch (err) {
    console.error("❌ sendMessage:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PATCH /api/chat/messages/:messageId/read
 * Mark a single message as read by the requesting user.
 */
exports.markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message || message.deletedAt) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    // Verify the user is a participant of the conversation
    const conversation = await getConversationForUser(message.conversationId, req.user.id);
    if (!conversation) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const userId    = new mongoose.Types.ObjectId(req.user.id);
    const alreadyRead = message.readBy.some(id => id.equals(userId));

    if (!alreadyRead) {
      await Promise.all([
        ChatMessage.findByIdAndUpdate(messageId, { $addToSet: { readBy: userId } }),
        // Decrement unread count (floor at 0)
        ChatConversation.findByIdAndUpdate(conversation._id, [{
          $set: {
            [`unreadCounts.${req.user.id}`]: {
              $max: [
                0,
                { $subtract: [{ $ifNull: [`$unreadCounts.${req.user.id}`, 0] }, 1] }
              ]
            }
          }
        }])
      ]);
    }

    return res.status(200).json({ success: true, message: "Marked as read" });
  } catch (err) {
    console.error("❌ markMessageRead:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/chat/messages/:messageId
 * Soft delete a message. Only the sender or an admin may delete.
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message || message.deletedAt) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const isSender = message.sender.toString() === req.user.id;
    if (!isSender && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this message" });
    }

    await ChatMessage.findByIdAndUpdate(messageId, { deletedAt: new Date() });

    return res.status(200).json({ success: true, message: "Message deleted" });
  } catch (err) {
    console.error("❌ deleteMessage:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};