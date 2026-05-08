// controllers/chat.controller.js
//
// Production-grade controller for real-time chat.
// Socket.IO is the primary transport; every write also emits to the room
// so connected clients update instantly without polling.
//
// Rooms convention:
//   conversation:<conversationId>   — all participants of that chat
//   user:<userId>                   — private room for per-user events
//                                     (unread badge updates, new DMs, etc.)
// ============================================================================

"use strict";

const mongoose = require("mongoose");
const { ChatConversation, ChatMessage } = require("../models/chat.model");
const User = require("../models/user.model");
const Job  = require("../models/job.model");

// ────────────────────────────────────────────────────────────────────────────
// 🔧 REAL-TIME EMIT  — delegates to the shared socket server
// ────────────────────────────────────────────────────────────────────────────
const { emit } = require("../socket/server");

// ────────────────────────────────────────────────────────────────────────────
// 🔁 HELPERS
// ────────────────────────────────────────────────────────────────────────────

const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 30));
  return { page, limit, skip: (page - 1) * limit };
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Fetch conversation only if the requesting user is a participant. */
const getConversationForUser = async (conversationId, userId) => {
  if (!isValidObjectId(conversationId)) return null;
  return ChatConversation.findOne({
    _id:          conversationId,
    participants: userId,
  });
};

/** Increment unread counts for everyone except the sender. */
const buildUnreadInc = (participants, senderId) => {
  const inc = {};
  for (const uid of participants) {
    if (uid.toString() !== senderId.toString()) {
      inc[`unreadCounts.${uid}`] = 1;
    }
  }
  return inc;
};

/** Populate a message document with sender info. */
const populateMessage = (msg) =>
  msg.populate([
    { path: "sender",        select: "fullName avatar role" },
    { path: "replyTo.messageId", select: "content sender deletedAt" },
  ]);

// ============================================================================
// 📊 UTILITIES
// ============================================================================

/**
 * GET /api/chat/unread-count
 * Total unread count across all conversations for the auth user.
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await ChatConversation.aggregate([
      { $match: { participants: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          count: {
            $ifNull: [
              { $toInt: { $getField: { field: userId, input: "$unreadCounts" } } },
              0,
            ],
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]);

    return res.status(200).json({
      success:     true,
      unreadCount: result[0]?.total ?? 0,
    });
  } catch (err) {
    console.error("❌ getUnreadCount:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/chat/search/users?query=
 * Find users to start a direct conversation with.
 */
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Query must be ≥ 2 characters" });
    }

    const regex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const users = await User.find({
      _id:       { $ne: req.user.id },
      isActive:  true,
      deletedAt: { $exists: false },
      $or:       [{ fullName: regex }, { email: regex }],
    })
      .select("fullName avatar email role providerDetails.headline ratings.average")
      .limit(20)
      .lean();

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
 * All conversations for the auth user, most recent first.
 * Query: ?page=1&limit=20&type=direct|job&archived=true
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { participants: userId };

    if (req.query.type && ["direct", "job"].includes(req.query.type)) {
      filter.type = req.query.type;
    }

    // By default hide archived; pass ?archived=true to fetch them
    if (req.query.archived !== "true") {
      filter.archivedBy = { $ne: userId };
    }

    const [conversations, total] = await Promise.all([
      ChatConversation.find(filter)
        .populate("participants",       "fullName avatar role providerDetails.headline")
        .populate("lastMessage.sender", "fullName avatar")
        .populate("jobId",              "title status category")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: false }),
      ChatConversation.countDocuments(filter),
    ]);

    // Attach per-user metadata
    const data = conversations.map((conv) => ({
      ...conv,
      myUnreadCount: conv.unreadCounts?.[req.user.id] ?? 0,
      isArchived:    conv.archivedBy?.some((id) => id.toString() === req.user.id) ?? false,
      isMuted:       conv.mutedBy?.some((id) => id.toString() === req.user.id)    ?? false,
    }));

    return res.status(200).json({
      success:       true,
      total,
      page,
      pages:         Math.ceil(total / limit),
      conversations: data,
    });
  } catch (err) {
    console.error("❌ getConversations:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/chat/conversations/:conversationId
 * Single conversation detail (includes job/participant info).
 */
exports.getConversation = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    await conversation.populate([
      { path: "participants",       select: "fullName avatar role providerDetails.headline ratings" },
      { path: "lastMessage.sender", select: "fullName avatar" },
      { path: "jobId",              select: "title status category budget assignedWorker client" },
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
 * POST /api/chat/conversations/direct
 * Get or create a DM between the auth user and another user.
 * Body: { participantId }
 */
exports.createDirectChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.id;

    if (!participantId)             return res.status(400).json({ success: false, message: "participantId is required" });
    if (!isValidObjectId(participantId)) return res.status(400).json({ success: false, message: "Invalid participantId" });
    if (participantId === userId)   return res.status(400).json({ success: false, message: "Cannot chat with yourself" });

    const other = await User.findById(participantId).select("_id isActive deletedAt fullName").lean();
    if (!other || !other.isActive || other.deletedAt) {
      return res.status(404).json({ success: false, message: "User not found or inactive" });
    }

    // Idempotent — return existing if found
    let conversation = await ChatConversation.findOne({
      type:         "direct",
      participants: { $all: [userId, participantId], $size: 2 },
    }).populate("participants", "fullName avatar role");

    if (!conversation) {
      conversation = await ChatConversation.create({
        type:         "direct",
        participants: [userId, participantId],
        title:        other.fullName,
        unreadCounts: {},
      });
      conversation = await conversation.populate("participants", "fullName avatar role");

      // Notify the other user in real-time
      emit(`user:${participantId}`, "conversation:new", { conversation: conversation.toObject() });
    }

    return res.status(conversation.isNew ? 201 : 200).json({ success: true, conversation });
  } catch (err) {
    console.error("❌ createDirectChat:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chat/conversations/job/:jobId
 * Get or create the job-specific chat.
 * Access: job client, assigned worker, admin.
 */
exports.getOrCreateJobChat = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId    = req.user.id;

    if (!isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const job = await Job.findOne({ _id: jobId, isDeleted: { $ne: true } })
      .select("client assignedWorker title status")
      .lean();

    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    const clientId = job.client?.toString();
    const workerId = job.assignedWorker?.toString();

    if (userId !== clientId && userId !== workerId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not a participant of this job" });
    }

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: "Job chat is available only once a provider is assigned",
      });
    }

    // Idempotent upsert
    let conversation = await ChatConversation.findOne({ jobId });

    if (!conversation) {
      conversation = await ChatConversation.create({
        type:         "job",
        jobId,
        participants: [clientId, workerId],
        title:        `Job – ${job.title}`,
        unreadCounts: {},
      });

      // Notify both participants
      for (const uid of [clientId, workerId]) {
        emit(`user:${uid}`, "conversation:new", { conversation: conversation.toObject() });
      }
    }

    await conversation.populate([
      { path: "participants", select: "fullName avatar role" },
      { path: "jobId",        select: "title status category budget" },
    ]);

    const obj = conversation.toObject();
    obj.myUnreadCount = conversation.unreadCounts?.get(userId) ?? 0;

    return res.status(200).json({ success: true, conversation: obj });
  } catch (err) {
    console.error("❌ getOrCreateJobChat:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/chat/conversations/:conversationId
 * Archives (hides) the conversation for the requesting user only.
 * The other participant continues to see it.
 */
exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    await ChatConversation.findByIdAndUpdate(conversation._id, {
      $addToSet: { archivedBy: new mongoose.Types.ObjectId(req.user.id) },
    });

    return res.status(200).json({ success: true, message: "Conversation archived" });
  } catch (err) {
    console.error("❌ deleteConversation:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PATCH /api/chat/conversations/:conversationId/mute
 * Toggle mute for push notifications in this conversation.
 */
exports.toggleMuteConversation = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const userId  = new mongoose.Types.ObjectId(req.user.id);
    const isMuted = conversation.mutedBy?.some((id) => id.equals(userId));

    await ChatConversation.findByIdAndUpdate(
      conversation._id,
      isMuted
        ? { $pull:      { mutedBy: userId } }
        : { $addToSet:  { mutedBy: userId } }
    );

    return res.status(200).json({ success: true, muted: !isMuted });
  } catch (err) {
    console.error("❌ toggleMuteConversation:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================================================================
// 💬 MESSAGES
// ============================================================================

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Paginated message history (newest first, client should reverse).
 * Marks all unread as read on fetch.
 * Query: ?page=1&limit=30&before=ISO_TIMESTAMP (cursor-based)
 */
exports.getMessages = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const { page, limit, skip } = parsePagination(req.query);

    const filter = { conversationId: conversation._id };

    if (req.query.before) {
      const before = new Date(req.query.before);
      if (!isNaN(before)) filter.createdAt = { $lt: before };
    }

    const [messages, total] = await Promise.all([
      ChatMessage.find(filter)
        .populate("sender",              "fullName avatar role")
        .populate("replyTo.messageId",   "content sender deletedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ChatMessage.countDocuments(filter),
    ]);

    // Reset unread for this user
    await ChatConversation.findByIdAndUpdate(conversation._id, {
      $set: { [`unreadCounts.${req.user.id}`]: 0 },
    });

    // Emit read-reset so other clients update the badge
    emit(`user:${req.user.id}`, "unread:reset", { conversationId: conversation._id });

    return res.status(200).json({
      success:  true,
      total,
      page,
      pages:    Math.ceil(total / limit),
      messages: messages.reverse(), // chronological for the client
    });
  } catch (err) {
    console.error("❌ getMessages:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Send a message (REST fallback — Socket.IO is the primary path).
 * Body: { content?, attachments?, replyToId? }
 */
exports.sendMessage = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const { content, attachments, replyToId } = req.body;
    const trimmed = content?.trim();

    if (!trimmed && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, message: "Message must have content or attachments" });
    }
    if (trimmed && trimmed.length > 4000) {
      return res.status(400).json({ success: false, message: "Message too long (max 4000 chars)" });
    }

    const userId = req.user.id;

    // Build reply snapshot
    let replyTo;
    if (replyToId) {
      if (!isValidObjectId(replyToId)) {
        return res.status(400).json({ success: false, message: "Invalid replyToId" });
      }
      const original = await ChatMessage.findById(replyToId)
        .populate("sender", "fullName")
        .lean();

      if (original) {
        replyTo = {
          messageId:      original._id,
          senderName:     original.sender?.fullName ?? "Unknown",
          contentSnippet: original.deletedAt
            ? "This message was deleted"
            : (original.content ?? "").slice(0, 200),
          isDeleted:      !!original.deletedAt,
        };
      }
    }

    const unreadInc = buildUnreadInc(conversation.participants, userId);

    const [message] = await Promise.all([
      ChatMessage.create({
        conversationId: conversation._id,
        sender:         userId,
        content:        trimmed,
        attachments:    attachments ?? [],
        replyTo,
        readBy:         [userId],
      }),
      ChatConversation.findByIdAndUpdate(conversation._id, {
        $set: {
          lastMessage: {
            text:      (trimmed ?? "📎 Attachment").slice(0, 200),
            sender:    userId,
            timestamp: new Date(),
          },
        },
        $inc: unreadInc,
      }),
    ]);

    const populated = await populateMessage(message);

    // Real-time broadcast to all room participants
    emit(`conversation:${conversation._id}`, "message:new", { message: populated.toObject() });

    // Update unread badge for each other participant
    for (const uid of conversation.participants) {
      if (uid.toString() !== userId) {
        emit(`user:${uid}`, "unread:increment", { conversationId: conversation._id });
      }
    }

    return res.status(201).json({ success: true, message: populated });
  } catch (err) {
    console.error("❌ sendMessage:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PATCH /api/chat/messages/:messageId
 * Edit a message's content. Only the sender may edit.
 * Previous content is preserved in `edits[]` for audit.
 * Body: { content }
 */
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message || message.deletedAt) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    if (message.isSystem) {
      return res.status(400).json({ success: false, message: "System messages cannot be edited" });
    }
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Only the sender can edit their message" });
    }

    const newContent = req.body.content?.trim();
    if (!newContent) {
      return res.status(400).json({ success: false, message: "Content cannot be empty" });
    }
    if (newContent.length > 4000) {
      return res.status(400).json({ success: false, message: "Message too long (max 4000 chars)" });
    }
    if (newContent === message.content) {
      return res.status(200).json({ success: true, message, edited: false });
    }

    // Archive old version, update content
    message.edits.push({ content: message.content, editedAt: new Date() });
    message.content  = newContent;
    message.editedAt = new Date();
    await message.save();

    const populated = await populateMessage(message);

    emit(
      `conversation:${message.conversationId}`,
      "message:edited",
      { messageId: message._id, content: newContent, editedAt: message.editedAt }
    );

    return res.status(200).json({ success: true, message: populated, edited: true });
  } catch (err) {
    console.error("❌ editMessage:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/chat/messages/:messageId
 * Unsend / soft-delete a message.
 * Sender: soft-deletes (shows "This message was deleted" placeholder).
 * Admin:  hard-deletes (sets deletedAt, also marks deletedBy).
 * If this was the lastMessage, the conversation snapshot is updated.
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message || message.deletedAt) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const isSender = message.sender.toString() === req.user.id;
    if (!isSender && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const now = new Date();
    await ChatMessage.findByIdAndUpdate(messageId, {
      $set: {
        deletedAt: now,
        deletedBy: req.user.id,
        content:   null,
        edits:     [],
        reactions: {},
      },
    });

    // If this was the last message in the conversation, clear the snapshot
    const conversation = await ChatConversation.findById(message.conversationId);
    if (conversation?.lastMessage?.sender?.toString() === req.user.id) {
      const prevMsg = await ChatMessage.findOne({
        conversationId: message.conversationId,
        _id:            { $ne: message._id },
        deletedAt:      { $exists: false },
      })
        .sort({ createdAt: -1 })
        .lean();

      await ChatConversation.findByIdAndUpdate(message.conversationId, {
        $set: {
          lastMessage: prevMsg
            ? { text: prevMsg.content?.slice(0, 200) ?? "📎", sender: prevMsg.sender, timestamp: prevMsg.createdAt }
            : { text: "", sender: null, timestamp: null },
        },
      });
    }

    emit(
      `conversation:${message.conversationId}`,
      "message:deleted",
      { messageId: message._id, deletedAt: now }
    );

    return res.status(200).json({ success: true, message: "Message unsent" });
  } catch (err) {
    console.error("❌ deleteMessage:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PATCH /api/chat/messages/:messageId/read
 * Mark a single message as read; decrements the conversation unread count.
 */
exports.markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await ChatMessage.findById(messageId).lean();
    if (!message || message.deletedAt) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const conversation = await getConversationForUser(message.conversationId, req.user.id);
    if (!conversation) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const userId     = new mongoose.Types.ObjectId(req.user.id);
    const alreadyRead = message.readBy?.some((id) => id.toString() === req.user.id);

    if (!alreadyRead) {
      await Promise.all([
        ChatMessage.findByIdAndUpdate(messageId, { $addToSet: { readBy: userId } }),
        ChatConversation.findByIdAndUpdate(conversation._id, [
          {
            $set: {
              [`unreadCounts.${req.user.id}`]: {
                $max: [
                  0,
                  { $subtract: [{ $ifNull: [`$unreadCounts.${req.user.id}`, 0] }, 1] },
                ],
              },
            },
          },
        ]),
      ]);

      emit(
        `conversation:${conversation._id}`,
        "message:read",
        { messageId: message._id, readBy: req.user.id }
      );
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ markMessageRead:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PATCH /api/chat/messages/:messageId/react
 * Toggle an emoji reaction on a message.
 * Body: { emoji }  e.g. "👍"
 */
exports.reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji }     = req.body;

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }
    if (!emoji || typeof emoji !== "string" || emoji.length > 10) {
      return res.status(400).json({ success: false, message: "Valid emoji is required" });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message || message.deletedAt) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const conversation = await getConversationForUser(message.conversationId, req.user.id);
    if (!conversation) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const userId    = new mongoose.Types.ObjectId(req.user.id);
    const reactors  = message.reactions.get(emoji) ?? [];
    const hasReacted = reactors.some((id) => id.equals(userId));

    if (hasReacted) {
      // Remove reaction
      message.reactions.set(
        emoji,
        reactors.filter((id) => !id.equals(userId))
      );
    } else {
      message.reactions.set(emoji, [...reactors, userId]);
    }

    await message.save();

    const reactionsObj = {};
    for (const [key, val] of message.reactions.entries()) {
      reactionsObj[key] = val;
    }

    emit(
      `conversation:${message.conversationId}`,
      "message:reaction",
      { messageId: message._id, reactions: reactionsObj }
    );

    return res.status(200).json({ success: true, reactions: reactionsObj });
  } catch (err) {
    console.error("❌ reactToMessage:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/chat/messages/:messageId/edits
 * Return the edit history of a message.
 * Accessible only by participants of the conversation.
 */
exports.getMessageEdits = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await ChatMessage.findById(messageId).select("edits sender conversationId deletedAt").lean();
    if (!message || message.deletedAt) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const conversation = await getConversationForUser(message.conversationId, req.user.id);
    if (!conversation) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    return res.status(200).json({ success: true, edits: message.edits ?? [] });
  } catch (err) {
    console.error("❌ getMessageEdits:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};