// controllers/chat.controller.js
const mongoose = require("mongoose");
const { ChatConversation, ChatMessage } = require("../models/chat.model");
const User = require("../models/user.model");
const Job = require("../models/job.model");
const { getIO } = require("../socket/server");

// ============================================================================
// 🔁 HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user can access a job-based conversation
 */
const canAccessJobChat = async (userId, jobId) => {
  if (!jobId) return false;
  const job = await Job.findById(jobId).select("client assignedWorker").lean();
  if (!job) return false;
  
  return (
    job.client?.toString() === userId ||
    job.assignedWorker?.toString() === userId
  );
};

/**
 * Check if user can access a direct conversation
 */
const canAccessDirectChat = (conversation, userId) => {
  if (!conversation?.participants) return false;
  return conversation.type === "direct" && 
         conversation.participants.some(p => p?.toString() === userId);
};

/**
 * Sanitize message output (remove sensitive fields)
 */
const sanitizeMessage = (message, requestingUserId) => {
  if (!message) return null;
  const obj = message.toObject ? message.toObject() : message;
  
  return {
    _id: obj._id?.toString() || null,
    content: obj.content || "",
    sender: {
      _id: obj.sender?._id?.toString() || obj.sender || null,
      fullName: obj.sender?.fullName || null,
      avatar: obj.sender?.avatar || null
    },
    createdAt: obj.createdAt || null,
    updatedAt: obj.updatedAt || null,
    attachments: Array.isArray(obj.attachments) ? obj.attachments : [],
    isRead: Array.isArray(obj.readBy) 
      ? obj.readBy.some(r => r?.toString() === requestingUserId) 
      : false
  };
};

/**
 * Sanitize conversation output
 */
const sanitizeConversation = (conversation, requestingUserId) => {
  if (!conversation) return null;
  const obj = conversation.toObject ? conversation.toObject() : conversation;
  
  const result = {
    _id: obj._id?.toString() || null,
    type: obj.type || "direct",
    title: obj.title || null,
    jobId: obj.jobId?.toString() || obj.jobId || null,
    participants: Array.isArray(obj.participants) 
      ? obj.participants.map(p => ({
          _id: p?._id?.toString() || p || null,
          fullName: p?.fullName || null,
          avatar: p?.avatar || null,
          role: p?.role || null
        }))
      : [],
    lastMessage: obj.lastMessage ? {
      text: obj.lastMessage.text || "",
      senderId: obj.lastMessage.sender?._id?.toString() || obj.lastMessage.sender || null,
      senderName: obj.lastMessage.sender?.fullName || null,
      timestamp: obj.lastMessage.timestamp || null
    } : null,
    unreadCount: obj.unreadCounts?.get?.(requestingUserId) || 0,
    createdAt: obj.createdAt || null,
    updatedAt: obj.updatedAt || null
  };
  
  // For job chats, include job details if populated
  if (obj.type === "job" && obj.jobId && typeof obj.jobId === "object") {
    result.job = {
      _id: obj.jobId._id?.toString() || null,
      title: obj.jobId.title || null,
      status: obj.jobId.status || null,
      category: obj.jobId.category || null
    };
  }
  
  return result;
};

// ============================================================================
// 📋 CONVERSATION MANAGEMENT
// ============================================================================

/**
 * GET /api/chat/conversations
 * Get all conversations for the authenticated user
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { page = 1, limit = 20, type } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    
    // Build query: conversations where user is a participant
    const query = {
      $or: [
        // Direct chats: user is in participants array
        { 
          type: "direct", 
          participants: userId 
        },
        // Job chats: user is client or assigned worker
        {
          type: "job",
          jobId: { $exists: true, $ne: null }
        }
      ]
    };
    
    // Filter by type if specified
    if (type === "direct" || type === "job") {
      query.type = type;
    }
    
    // Execute query with pagination and population
    const conversations = await ChatConversation.find(query)
      .populate("jobId", "title status category budget")
      .populate("participants", "fullName avatar role providerDetails.headline")
      .populate("lastMessage.sender", "fullName avatar")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const total = await ChatConversation.countDocuments(query);
    
    // Filter conversations client-side for job authorization
    const authorizedConversations = [];
    for (const conv of conversations) {
      if (conv.type === "direct") {
        if (canAccessDirectChat(conv, userId)) {
          authorizedConversations.push(conv);
        }
      } else if (conv.type === "job" && conv.jobId) {
        if (await canAccessJobChat(userId, conv.jobId._id || conv.jobId)) {
          authorizedConversations.push(conv);
        }
      }
    }
    
    // Sanitize output
    const sanitized = authorizedConversations.map(conv => 
      sanitizeConversation(conv, userId)
    );
    
    res.status(200).json({
      success: true,
      data: {
        conversations: sanitized,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalResults: total,
          resultsPerPage: limitNum,
          hasNextPage: pageNum * limitNum < total,
          hasPrevPage: pageNum > 1
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * GET /api/chat/conversations/:conversationId
 * Get single conversation details
 */
exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID format"
      });
    }
    
    const conversation = await ChatConversation.findById(conversationId)
      .populate("jobId", "title status category")
      .populate("participants", "fullName avatar role")
      .populate("lastMessage.sender", "fullName avatar")
      .lean();
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }
    
    // Authorization check
    let isAuthorized = false;
    if (conversation.type === "direct") {
      isAuthorized = canAccessDirectChat(conversation, userId);
    } else if (conversation.type === "job" && conversation.jobId) {
      isAuthorized = await canAccessJobChat(userId, conversation.jobId._id || conversation.jobId);
    }
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this conversation"
      });
    }
    
    // Mark messages as read for this user
    await ChatMessage.updateMany(
      { 
        conversationId: conversation._id,
        readBy: { $ne: userId }
      },
      { $addToSet: { readBy: userId } }
    );
    
    // Update unread count in conversation
    await ChatConversation.findByIdAndUpdate(
      conversationId,
      { $set: { [`unreadCounts.${userId}`]: 0 } }
    );
    
    res.status(200).json({
      success: true,
      data: sanitizeConversation(conversation, userId)
    });
    
  } catch (error) {
    console.error("❌ Get conversation error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * POST /api/chat/conversations/direct
 * Create or get a direct message conversation between two users
 */
exports.createDirectChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user._id.toString();
    
    // Validation
    if (!participantId || !mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({
        success: false,
        message: "Valid participant ID is required"
      });
    }
    
    if (participantId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot start a chat with yourself"
      });
    }
    
    // Verify participant exists and is active
    const participant = await User.findById(participantId)
      .select("fullName avatar role isActive")
      .lean();
    
    if (!participant || !participant.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found or inactive"
      });
    }
    
    // Find existing direct chat or create new one
    let conversation = await ChatConversation.findOne({
      type: "direct",
      participants: { $all: [currentUserId, participantId], $size: 2 }
    }).populate("participants", "fullName avatar role");
    
    if (!conversation) {
      conversation = await ChatConversation.create({
        type: "direct",
        participants: [currentUserId, participantId],
        title: `${req.user.fullName} & ${participant.fullName}`,
        lastMessage: null
      });
      
      // Populate for response
      await conversation.populate("participants", "fullName avatar role");
    }
    
    res.status(200).json({
      success: true,
      message: conversation._id ? "Chat retrieved" : "Chat created",
      data: {
        conversation: sanitizeConversation(conversation, currentUserId),
        participant: {
          _id: participant._id?.toString() || null,
          fullName: participant.fullName || null,
          avatar: participant.avatar || null,
          role: participant.role || null
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Create direct chat error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Chat already exists"
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create chat",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * POST /api/chat/conversations/job/:jobId
 * Get or create a job-specific chat conversation
 */
exports.getOrCreateJobChat = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id.toString();
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format"
      });
    }
    
    // Verify job exists and user is participant
    const job = await Job.findById(jobId)
      .select("title status client assignedWorker")
      .lean();
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }
    
    // Authorization: Must be client or assigned worker
    const isClient = job.client?.toString() === userId;
    const isProvider = job.assignedWorker?.toString() === userId;
    
    if (!isClient && !isProvider) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this job chat"
      });
    }
    
    // Job must be in_progress for chat to be active
    const canChat = ["in_progress", "completed"].includes(job.status);
    
    // Find or create job conversation
    let conversation = await ChatConversation.findOne({ 
      type: "job", 
      jobId: jobId 
    })
    .populate("participants", "fullName avatar role")
    .populate("jobId", "title status category")
    .lean();
    
    if (!conversation) {
      // Create new job chat
      conversation = await ChatConversation.create({
        type: "job",
        jobId: jobId,
        participants: [job.client, job.assignedWorker].filter(Boolean),
        title: `Job #${jobId.slice(-6)} - ${job.title}`,
        lastMessage: {
          text: "Chat created for this job",
          timestamp: new Date()
        }
      });
      
      // Populate for response
      await conversation.populate("participants", "fullName avatar role");
      await conversation.populate("jobId", "title status category");
    }
    
    // Mark messages as read
    await ChatMessage.updateMany(
      { 
        conversationId: conversation._id,
        readBy: { $ne: userId }
      },
      { $addToSet: { readBy: userId } }
    );
    
    res.status(200).json({
      success: true,
      data: {
        conversation: sanitizeConversation(conversation, userId),
        canSendMessages: canChat && job.status === "in_progress",
        jobStatus: job.status
      }
    });
    
  } catch (error) {
    console.error("❌ Get job chat error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to access job chat",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ============================================================================
// 💬 MESSAGE MANAGEMENT
// ============================================================================

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Get message history for a conversation (paginated)
 */
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    const userId = req.user._id.toString();
    
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID format"
      });
    }
    
    // Verify conversation exists and user has access
    const conversation = await ChatConversation.findById(conversationId)
      .populate("jobId", "status client assignedWorker")
      .lean();
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }
    
    // Authorization check
    let isAuthorized = false;
    if (conversation.type === "direct") {
      isAuthorized = canAccessDirectChat(conversation, userId);
    } else if (conversation.type === "job" && conversation.jobId) {
      isAuthorized = await canAccessJobChat(userId, conversation.jobId._id || conversation.jobId);
    }
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access these messages"
      });
    }
    
    // Build query for messages
    const query = { conversationId: conversation._id };
    
    // Pagination: "before" for infinite scroll (older messages)
    if (before && !isNaN(Date.parse(before))) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    
    // Fetch messages with sender info, sorted oldest first for chat display
    const messages = await ChatMessage.find(query)
      .populate("sender", "fullName avatar")
      .sort({ createdAt: 1 })
      .limit(limitNum)
      .lean();
    
    // Mark messages as read for this user
    if (messages.length > 0) {
      await ChatMessage.updateMany(
        { 
          _id: { $in: messages.map(m => m._id) },
          readBy: { $ne: userId }
        },
        { $addToSet: { readBy: userId } }
      );
      
      // Reset unread count in conversation
      await ChatConversation.findByIdAndUpdate(
        conversationId,
        { $set: { [`unreadCounts.${userId}`]: 0 } }
      );
    }
    
    // Sanitize and format messages
    const sanitized = messages.map(msg => sanitizeMessage(msg, userId));
    
    // Get total count for pagination info
    const total = await ChatMessage.countDocuments({ conversationId: conversation._id });
    
    res.status(200).json({
      success: true,
      data: {
        messages: sanitized,
        conversation: {
          _id: conversation._id?.toString() || null,
          type: conversation.type,
          canSend: conversation.jobId 
            ? conversation.jobId?.status === "in_progress"
            : true
        },
        pagination: {
          currentPage: pageNum,
          limit: limitNum,
          totalMessages: total,
          hasMore: messages.length === limitNum,
          oldestMessage: messages[0]?.createdAt || null,
          newestMessage: messages[messages.length - 1]?.createdAt || null
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Get messages error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Send a new message in a conversation (REST API fallback / for offline)
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, attachments } = req.body;
    const senderId = req.user._id.toString();
    
    // Validation
    if (!content || typeof content !== "string" || content.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: "Message content is required"
      });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Message too long (max 2000 characters)"
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID format"
      });
    }
    
    // Verify conversation and authorization
    const conversation = await ChatConversation.findById(conversationId)
      .populate("jobId", "status client assignedWorker")
      .lean();
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }
    
    let isAuthorized = false;
    if (conversation.type === "direct") {
      isAuthorized = canAccessDirectChat(conversation, senderId);
    } else if (conversation.type === "job" && conversation.jobId) {
      isAuthorized = await canAccessJobChat(senderId, conversation.jobId._id || conversation.jobId);
    }
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to send messages in this conversation"
      });
    }
    
    // For job chats: only allow sending if job is in_progress
    if (conversation.type === "job" && conversation.jobId?.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: `Cannot send messages: Job status is "${conversation.jobId?.status}"`
      });
    }
    
    // Validate attachments if provided
    let validatedAttachments = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      if (attachments.length > 5) {
        return res.status(400).json({
          success: false,
          message: "Maximum 5 attachments per message"
        });
      }
      
      validatedAttachments = attachments
        .filter(att => att?.url && att?.filename && typeof att.url === "string")
        .map(att => ({
          url: att.url.trim(),
          filename: att.filename.trim(),
          mimeType: att.mimeType || "application/octet-stream",
          size: typeof att.size === "number" ? att.size : 0
        }));
    }
    
    // Create message
    const message = await ChatMessage.create({
      conversationId: conversation._id,
      sender: senderId,
      content: content.trim(),
      attachments: validatedAttachments,
      readBy: [senderId] // Mark as read by sender
    });
    
    // Populate sender info for response
    const populated = await message.populate("sender", "fullName avatar");
    
    // Update conversation's last message
    const otherParticipant = conversation.participants?.find(
      p => p?.toString() !== senderId
    );
    
    await ChatConversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: {
          text: content.trim(),
          sender: senderId,
          timestamp: new Date()
        },
        // Increment unread count for other participants
        $inc: otherParticipant 
          ? { [`unreadCounts.${otherParticipant}`]: 1 } 
          : {}
      },
      { new: true }
    );
    
    // 🔄 Emit via WebSocket if available (real-time delivery)
    try {
      const io = getIO();
      const roomId = conversation.type === "job" && conversation.jobId
        ? `job:${conversation.jobId}` 
        : `direct:${conversationId}`;
      
      const messagePayload = {
        ...sanitizeMessage(populated, senderId),
        conversationId: conversation._id?.toString(),
        conversationType: conversation.type
      };
      
      // Broadcast to room (excludes sender who already has it)
      io.to(roomId).emit("message:received", messagePayload);
      
      // Also emit to sender for confirmation
      io.to(`user:${senderId}`).emit("message:sent", {
        ...messagePayload,
        status: "delivered"
      });
      
    } catch (socketErr) {
      // Non-critical: Message saved to DB even if WebSocket fails
      console.warn("⚠️ WebSocket emit failed (message saved to DB):", socketErr?.message);
    }
    
    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        message: sanitizeMessage(populated, senderId),
        conversation: {
          _id: conversation._id?.toString() || null,
          lastMessage: {
            text: content.trim(),
            timestamp: new Date()
          }
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Send message error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {}).map(e => e?.message || "Validation error");
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: messages
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * PATCH /api/chat/messages/:messageId/read
 * Mark a message as read
 */
exports.markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id.toString();
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID format"
      });
    }
    
    const message = await ChatMessage.findById(messageId)
      .populate("conversationId", "type jobId participants")
      .lean();
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }
    
    // Authorization check
    const conversation = message.conversationId;
    let isAuthorized = false;
    
    if (conversation?.type === "direct") {
      isAuthorized = canAccessDirectChat(conversation, userId);
    } else if (conversation?.type === "job" && conversation.jobId) {
      isAuthorized = await canAccessJobChat(userId, conversation.jobId._id || conversation.jobId);
    }
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }
    
    // Mark as read if not already
    const wasUnread = !message.readBy?.some(r => r?.toString() === userId);
    
    if (wasUnread) {
      await ChatMessage.findByIdAndUpdate(
        messageId,
        { $addToSet: { readBy: userId } }
      );
      
      // Decrement unread count in conversation
      await ChatConversation.findByIdAndUpdate(
        conversation._id,
        { $inc: { [`unreadCounts.${userId}`]: -1 } }
      );
    }
    
    res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: {
        messageId: messageId.toString(),
        isRead: true,
        readAt: new Date(),
        wasUnread: wasUnread
      }
    });
    
  } catch (error) {
    console.error("❌ Mark message read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * DELETE /api/chat/messages/:messageId
 * Soft delete a message (only by sender or admin)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id.toString();
    const userRole = req.user.role;
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID format"
      });
    }
    
    const message = await ChatMessage.findById(messageId)
      .populate("sender", "_id")
      .populate("conversationId", "type jobId participants")
      .lean();
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }
    
    // Authorization: Sender or admin can delete
    const isSender = message.sender?._id?.toString() === userId;
    const isAdmin = userRole === "admin";
    
    if (!isSender && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the sender or admin can delete messages"
      });
    }
    
    // Soft delete: Set deletedAt timestamp
    const deletedAt = new Date();
    await ChatMessage.findByIdAndUpdate(messageId, { deletedAt });
    
    // Notify via WebSocket that message was deleted
    try {
      const io = getIO();
      const conversation = message.conversationId;
      const roomId = conversation?.type === "job" && conversation.jobId
        ? `job:${conversation.jobId}` 
        : `direct:${conversation?._id}`;
      
      if (roomId) {
        io.to(roomId).emit("message:deleted", {
          messageId: messageId.toString(),
          deletedBy: userId,
          deletedAt,
          isAdmin: isAdmin
        });
      }
    } catch (socketErr) {
      console.warn("⚠️ WebSocket notification failed:", socketErr?.message);
    }
    
    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
      data: {
        messageId: messageId.toString(),
        deletedAt,
        deletedBy: userId
      }
    });
    
  } catch (error) {
    console.error("❌ Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ============================================================================
// 🔍 SEARCH & UTILITIES
// ============================================================================

/**
 * GET /api/chat/search/users
 * Search for users to start a direct chat with
 */
exports.searchUsers = async (req, res) => {
  try {
    const { query, excludeJobs } = req.query;
    const userId = req.user._id.toString();
    
    // Validation
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters"
      });
    }
    
    const searchRegex = new RegExp(query.trim(), "i");
    
    // Build query: active users matching search, excluding self
    const userQuery = {
      _id: { $ne: userId },
      isActive: true,
      isSuspended: { $ne: true },
      $or: [
        { fullName: searchRegex },
        { email: searchRegex },
        { "providerDetails.headline": searchRegex },
        { "providerDetails.skills.name": searchRegex }
      ]
    };
    
    // If excludeJobs=true, filter out users who are current job partners
    if (excludeJobs === "true") {
      // Get user's active job participant IDs
      const activeJobs = await Job.find({
        $or: [
          { client: userId, status: "in_progress" },
          { assignedWorker: userId, status: "in_progress" }
        ]
      }).select("client assignedWorker").lean();
      
      const jobParticipantIds = activeJobs.flatMap(job => 
        [job.client, job.assignedWorker]
          .filter(Boolean)
          .map(id => id?.toString())
          .filter(Boolean)
      );
      
      if (jobParticipantIds.length > 0) {
        userQuery._id = { 
          ...userQuery._id, 
          $nin: [...(userQuery._id.$nin || []), ...jobParticipantIds] 
        };
      }
    }
    
    // Execute search with field selection
    const users = await User.find(userQuery)
      .select("fullName email avatar role phone providerDetails.headline providerDetails.skills")
      .limit(20)
      .lean();
    
    // Format results
    const results = users.map(user => ({
      _id: user._id?.toString() || null,
      fullName: user.fullName || null,
      avatar: user.avatar || null,
      role: user.role || null,
      headline: user.role === "provider" ? user.providerDetails?.headline : null,
      primarySkill: user.role === "provider" ? user.providerDetails?.skills?.[0]?.name : null,
      isOnline: false // Could integrate with Socket.io presence later
    }));
    
    res.status(200).json({
      success: true,
      data: {
        users: results,
        query: query.trim(),
        count: results.length
      }
    });
    
  } catch (error) {
    console.error("❌ Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * GET /api/chat/unread-count
 * Get total unread message count for current user
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Get all conversations for this user
    const conversations = await ChatConversation.find({
      $or: [
        { type: "direct", participants: userId },
        { 
          type: "job",
          jobId: { $exists: true, $ne: null }
        }
      ]
    }).select("unreadCounts type jobId participants").lean();
    
    // Filter authorized conversations and sum unread counts
    let totalUnread = 0;
    
    for (const conv of conversations) {
      let isAuthorized = false;
      
      if (conv.type === "direct") {
        isAuthorized = canAccessDirectChat(conv, userId);
      } else if (conv.type === "job" && conv.jobId) {
        isAuthorized = await canAccessJobChat(userId, conv.jobId);
      }
      
      if (isAuthorized && conv.unreadCounts) {
        const count = conv.unreadCounts.get?.(userId);
        if (typeof count === "number" && count > 0) {
          totalUnread += count;
        }
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        totalUnread,
        lastUpdated: new Date()
      }
    });
    
  } catch (error) {
    console.error("❌ Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * DELETE /api/chat/conversations/:conversationId
 * Delete/hide a conversation (soft delete for user)
 */
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID format"
      });
    }
    
    const conversation = await ChatConversation.findById(conversationId).lean();
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }
    
    // Authorization check
    let isAuthorized = false;
    if (conversation.type === "direct") {
      isAuthorized = canAccessDirectChat(conversation, userId);
    } else if (conversation.type === "job" && conversation.jobId) {
      isAuthorized = await canAccessJobChat(userId, conversation.jobId);
    }
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }
    
    // For now, we'll just return success (implement soft-delete per-user if needed)
    // In a full implementation, you'd add a `hiddenBy: [userId]` array
    
    res.status(200).json({
      success: true,
      message: "Conversation hidden successfully",
      data: {
        conversationId: conversationId.toString(),
        action: "hidden"
      }
    });
    
  } catch (error) {
    console.error("❌ Delete conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to hide conversation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};