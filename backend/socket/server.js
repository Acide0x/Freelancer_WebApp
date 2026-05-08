// backend/socket/server.js
"use strict";

const socketIO = require("socket.io");
const jwt      = require("jsonwebtoken");
const mongoose = require("mongoose");
const User     = require("../models/user.model");

let io;

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Increment unread counts for every participant except the sender. */
const buildUnreadInc = (participants, senderId) => {
  const inc = {};
  for (const uid of participants) {
    if (uid.toString() !== senderId.toString()) {
      inc[`unreadCounts.${uid}`] = 1;
    }
  }
  return inc;
};

/** Build a denormalised reply snapshot from the original message doc. */
const buildReplySnapshot = (original) => ({
  messageId:      original._id,
  senderName:     original.sender?.fullName ?? "Unknown",
  contentSnippet: original.deletedAt
    ? "This message was deleted"
    : (original.content ?? "").slice(0, 200),
  isDeleted: !!original.deletedAt,
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 SOCKET AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

const authMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password").lean();

    if (!user || !user.isActive) return next(new Error("Invalid user"));

    socket.user   = user;
    socket.userId = user._id.toString();
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication failed"));
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🏠 ROOM NAMING CONVENTION
//   conversation:<conversationId>  — all participants of that chat (DM or job)
//   user:<userId>                  — private room for badge/notification events
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ⚡ INIT
// ─────────────────────────────────────────────────────────────────────────────

const initSocket = (server) => {
  if (io) return io; // prevent double-init

  io = socketIO(server, {
    cors: {
      origin:      process.env.FRONTEND_URL || "http://localhost:5173",
      methods:     ["GET", "POST"],
      credentials: true,
    },
    transports:    ["websocket", "polling"],
    pingTimeout:   60_000,
    pingInterval:  25_000,
  });

  io.use(authMiddleware);

  // ───────────────────────────────────────────────────────────────────────────
  // 🔌 CONNECTION
  // ───────────────────────────────────────────────────────────────────────────

  io.on("connection", (socket) => {
    const { userId } = socket;
    console.log(`🟢 Connected  user=${socket.user.fullName}  socket=${socket.id}`);

    // Every user always joins their private room
    socket.join(`user:${userId}`);

    // =========================================================================
    // 📋 CONVERSATION ROOMS
    // =========================================================================

    /**
     * join:conversation
     * Joins a conversation room after verifying the user is a participant.
     * Works for BOTH direct and job conversations.
     *
     * Client emits: { conversationId }
     * Server acks:  { success, conversationId } | { success: false, message }
     */
    socket.on("join:conversation", async ({ conversationId }, callback) => {
      try {
        const { ChatConversation } = require("../models/chat.model");

        if (!isValidObjectId(conversationId)) {
          return callback?.({ success: false, message: "Invalid conversation ID" });
        }

        const conv = await ChatConversation.findOne({
          _id:          conversationId,
          participants: userId,
        }).lean();

        if (!conv) {
          return callback?.({ success: false, message: "Conversation not found or access denied" });
        }

        socket.join(`conversation:${conversationId}`);

        // Reset unread for this user
        await ChatConversation.findByIdAndUpdate(conversationId, {
          $set: { [`unreadCounts.${userId}`]: 0 },
        });

        // Tell this client its badge just zeroed
        socket.emit("unread:reset", { conversationId });

        callback?.({ success: true, conversationId });
      } catch (err) {
        console.error("join:conversation error:", err);
        callback?.({ success: false, message: "Server error" });
      }
    });

    /**
     * leave:conversation
     * Client emits: { conversationId }
     */
    socket.on("leave:conversation", ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // =========================================================================
    // 💬 MESSAGES
    // =========================================================================

    /**
     * message:send
     * Primary real-time send path for BOTH direct and job chats.
     *
     * Client emits: { conversationId, content?, attachments?, replyToId? }
     * Server acks:  { success, message } | { success: false, message }
     * Room event:   "message:new" → { message }
     */
    socket.on("message:send", async ({ conversationId, content, attachments, replyToId }, callback) => {
      try {
        const { ChatConversation, ChatMessage } = require("../models/chat.model");

        if (!isValidObjectId(conversationId)) {
          return callback?.({ success: false, message: "Invalid conversation ID" });
        }

        const conversation = await ChatConversation.findOne({
          _id:          conversationId,
          participants: userId,
        });

        if (!conversation) {
          return callback?.({ success: false, message: "Conversation not found" });
        }

        const trimmed = content?.trim();
        if (!trimmed && (!attachments || attachments.length === 0)) {
          return callback?.({ success: false, message: "Message needs content or attachments" });
        }
        if (trimmed && trimmed.length > 4000) {
          return callback?.({ success: false, message: "Message too long (max 4000 chars)" });
        }

        // Build reply snapshot
        let replyTo;
        if (replyToId && isValidObjectId(replyToId)) {
          const original = await ChatMessage.findById(replyToId)
            .populate("sender", "fullName")
            .lean();
          if (original) replyTo = buildReplySnapshot(original);
        }

        const unreadInc = buildUnreadInc(conversation.participants, userId);

        const message = await ChatMessage.create({
          conversationId,
          sender:      userId,
          content:     trimmed,
          attachments: attachments ?? [],
          replyTo,
          readBy:      [userId],
        });

        await ChatConversation.findByIdAndUpdate(conversationId, {
          $set: {
            lastMessage: {
              text:      (trimmed ?? "📎 Attachment").slice(0, 200),
              sender:    userId,
              timestamp: new Date(),
            },
          },
          $inc: unreadInc,
        });

        const populated = await message.populate([
          { path: "sender",       select: "fullName avatar role" },
          { path: "replyTo.messageId", select: "content sender deletedAt" },
        ]);
        const msgObj = populated.toObject();

        // Broadcast to the room (including sender's other tabs)
        io.to(`conversation:${conversationId}`).emit("message:new", { message: msgObj });

        // Notify offline / other-tab participants for badge update
        for (const uid of conversation.participants) {
          if (uid.toString() !== userId) {
            io.to(`user:${uid}`).emit("unread:increment", { conversationId });
          }
        }

        callback?.({ success: true, message: msgObj });
      } catch (err) {
        console.error("message:send error:", err);
        callback?.({ success: false, message: "Failed to send message" });
      }
    });

    /**
     * message:edit
     * Edit the content of a message the user sent.
     * Previous content is archived in edits[].
     *
     * Client emits: { messageId, content }
     * Server acks:  { success, messageId, content, editedAt } | error
     * Room event:   "message:edited" → { messageId, content, editedAt }
     */
    socket.on("message:edit", async ({ messageId, content }, callback) => {
      try {
        const { ChatMessage } = require("../models/chat.model");

        if (!isValidObjectId(messageId)) {
          return callback?.({ success: false, message: "Invalid message ID" });
        }

        const message = await ChatMessage.findById(messageId);

        if (!message || message.deletedAt) {
          return callback?.({ success: false, message: "Message not found" });
        }
        if (message.isSystem) {
          return callback?.({ success: false, message: "System messages cannot be edited" });
        }
        if (message.sender.toString() !== userId) {
          return callback?.({ success: false, message: "You can only edit your own messages" });
        }

        const newContent = content?.trim();
        if (!newContent) {
          return callback?.({ success: false, message: "Content cannot be empty" });
        }
        if (newContent === message.content) {
          return callback?.({ success: true, edited: false, messageId });
        }

        // Archive old content
        message.edits.push({ content: message.content, editedAt: new Date() });
        message.content  = newContent;
        message.editedAt = new Date();
        await message.save();

        const payload = { messageId: message._id, content: newContent, editedAt: message.editedAt };

        io.to(`conversation:${message.conversationId}`).emit("message:edited", payload);
        callback?.({ success: true, edited: true, ...payload });
      } catch (err) {
        console.error("message:edit error:", err);
        callback?.({ success: false, message: "Failed to edit message" });
      }
    });

    /**
     * message:delete  (unsend)
     * Soft-deletes a message. Shows "This message was deleted" placeholder.
     * Sender can delete their own; admin can delete any.
     *
     * Client emits: { messageId }
     * Room event:   "message:deleted" → { messageId, deletedAt }
     */
    socket.on("message:delete", async ({ messageId }, callback) => {
      try {
        const { ChatMessage, ChatConversation } = require("../models/chat.model");

        if (!isValidObjectId(messageId)) {
          return callback?.({ success: false, message: "Invalid message ID" });
        }

        const message = await ChatMessage.findById(messageId);
        if (!message || message.deletedAt) {
          return callback?.({ success: false, message: "Message not found" });
        }

        const isSender = message.sender.toString() === userId;
        if (!isSender && socket.user.role !== "admin") {
          return callback?.({ success: false, message: "Not authorized" });
        }

        const now = new Date();
        await ChatMessage.findByIdAndUpdate(messageId, {
          $set: {
            deletedAt: now,
            deletedBy: userId,
            content:   null,
            edits:     [],
            reactions: {},
          },
        });

        // If it was the lastMessage, refresh the conversation snapshot
        const conv = await ChatConversation.findById(message.conversationId);
        const lastSender = conv?.lastMessage?.sender?.toString();

        if (lastSender === userId) {
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
                ? { text: (prevMsg.content ?? "📎").slice(0, 200), sender: prevMsg.sender, timestamp: prevMsg.createdAt }
                : { text: "", sender: null, timestamp: null },
            },
          });
        }

        io.to(`conversation:${message.conversationId}`).emit("message:deleted", {
          messageId: message._id,
          deletedAt: now,
        });

        callback?.({ success: true });
      } catch (err) {
        console.error("message:delete error:", err);
        callback?.({ success: false, message: "Failed to delete message" });
      }
    });

    /**
     * message:react
     * Toggle an emoji reaction. Sends updated reactions map back to room.
     *
     * Client emits: { messageId, emoji }
     * Room event:   "message:reaction" → { messageId, reactions }
     */
    socket.on("message:react", async ({ messageId, emoji }, callback) => {
      try {
        const { ChatMessage } = require("../models/chat.model");

        if (!isValidObjectId(messageId)) {
          return callback?.({ success: false, message: "Invalid message ID" });
        }
        if (!emoji || typeof emoji !== "string" || emoji.length > 10) {
          return callback?.({ success: false, message: "Valid emoji required" });
        }

        const message = await ChatMessage.findById(messageId);
        if (!message || message.deletedAt) {
          return callback?.({ success: false, message: "Message not found" });
        }

        const userObjId  = new mongoose.Types.ObjectId(userId);
        const reactors   = message.reactions.get(emoji) ?? [];
        const hasReacted = reactors.some((id) => id.equals(userObjId));

        if (hasReacted) {
          message.reactions.set(emoji, reactors.filter((id) => !id.equals(userObjId)));
        } else {
          message.reactions.set(emoji, [...reactors, userObjId]);
        }

        await message.save();

        // Convert Map → plain object for JSON
        const reactionsObj = Object.fromEntries(message.reactions);

        io.to(`conversation:${message.conversationId}`).emit("message:reaction", {
          messageId: message._id,
          reactions: reactionsObj,
        });

        callback?.({ success: true, reactions: reactionsObj });
      } catch (err) {
        console.error("message:react error:", err);
        callback?.({ success: false, message: "Failed to react" });
      }
    });

    /**
     * message:read
     * Mark a single message as read and decrement conversation unread count.
     *
     * Client emits: { messageId, conversationId }
     * Room event:   "message:read" → { messageId, readBy: userId }
     */
    socket.on("message:read", async ({ messageId, conversationId }, callback) => {
      try {
        const { ChatMessage, ChatConversation } = require("../models/chat.model");

        if (!isValidObjectId(messageId)) return;

        const message = await ChatMessage.findById(messageId).lean();
        if (!message || message.deletedAt) return;

        const alreadyRead = message.readBy?.some((id) => id.toString() === userId);
        if (alreadyRead) return callback?.({ success: true });

        const userObjId = new mongoose.Types.ObjectId(userId);

        await Promise.all([
          ChatMessage.findByIdAndUpdate(messageId, { $addToSet: { readBy: userObjId } }),
          ChatConversation.findByIdAndUpdate(message.conversationId, [
            {
              $set: {
                [`unreadCounts.${userId}`]: {
                  $max: [
                    0,
                    { $subtract: [{ $ifNull: [`$unreadCounts.${userId}`, 0] }, 1] },
                  ],
                },
              },
            },
          ]),
        ]);

        io.to(`conversation:${message.conversationId}`).emit("message:read", {
          messageId,
          readBy: userId,
        });

        callback?.({ success: true });
      } catch (err) {
        console.error("message:read error:", err);
      }
    });

    // =========================================================================
    // ⌨️  TYPING INDICATORS
    // =========================================================================

    /**
     * typing:start / typing:stop
     * Works for both direct and job conversations.
     *
     * Client emits: { conversationId }
     * Room event:   "typing:update" → { userId, userName, isTyping, conversationId }
     */
    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        userId,
        userName:       socket.user.fullName,
        isTyping:       true,
        conversationId,
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        userId,
        userName:       socket.user.fullName,
        isTyping:       false,
        conversationId,
      });
    });

    // =========================================================================
    // 🔴 DISCONNECT
    // =========================================================================

    socket.on("disconnect", (reason) => {
      console.log(`🔴 Disconnected  user=${socket.user.fullName}  reason=${reason}`);
    });
  });

  return io;
};

// ─────────────────────────────────────────────────────────────────────────────
// 📦 EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized — call initSocket(server) first");
  return io;
};

/**
 * Emit a real-time event from anywhere in the codebase (controllers, cron jobs, etc.)
 *
 * Examples:
 *   emit("conversation:abc123", "message:new", { message })
 *   emit("user:def456",         "unread:increment", { conversationId })
 */
const emit = (room, event, payload) => {
  if (!io) return;
  io.to(room).emit(event, payload);
};

module.exports = { initSocket, getIO, emit };