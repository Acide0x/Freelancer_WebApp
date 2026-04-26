// routes/chat.routes.js
const express = require("express");
const router = express.Router();
const { verifyAuth, restrictTo } = require("../middlewares/authMiddleware");
const chatController = require("../controllers/chat.controller");

// ============================================================================
// 🔐 ALL CHAT ROUTES REQUIRE AUTHENTICATION
// ============================================================================
router.use(verifyAuth);

// ============================================================================
// 📊 UTILITIES & SEARCH (MUST COME BEFORE DYNAMIC ROUTES TO AVOID CONFLICTS)
// ============================================================================

/**
 * GET /api/chat/unread-count
 * Get total unread message count for badge display
 * Auth: Required
 */
router.get("/unread-count", chatController.getUnreadCount);

/**
 * GET /api/chat/search/users
 * Search for users to start a direct chat with
 * Query: ?query=string&excludeJobs=true
 * Auth: Required
 */
router.get("/search/users", chatController.searchUsers);

// ============================================================================
// 📋 CONVERSATION ROUTES
// ============================================================================

/**
 * GET /api/chat/conversations
 * List all conversations for authenticated user
 * Query: ?page=1&limit=20&type=direct|job
 * Auth: Required
 */
router.get("/conversations", chatController.getConversations);

/**
 * POST /api/chat/conversations/direct
 * Create or retrieve a direct message conversation
 * Body: { participantId: "user_id" }
 * Auth: Required
 */
router.post("/conversations/direct", chatController.createDirectChat);

/**
 * POST /api/chat/conversations/job/:jobId
 * Get or create a job-specific chat conversation
 * Auth: Required (Client or Assigned Worker only)
 */
router.post("/conversations/job/:jobId", chatController.getOrCreateJobChat);

/**
 * GET /api/chat/conversations/:conversationId
 * Get details of a specific conversation
 * Auth: Required (Participant only)
 */
router.get("/conversations/:conversationId", chatController.getConversation);

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Get message history for a conversation (paginated)
 * Query: ?page=1&limit=50&before=ISO_TIMESTAMP
 * Auth: Required (Participant only)
 */
router.get("/conversations/:conversationId/messages", chatController.getMessages);

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Send a new message (REST fallback - primary flow is WebSocket)
 * Body: { content: "text", attachments: [{url, filename, mimeType, size}] }
 * Auth: Required (Participant only)
 */
router.post("/conversations/:conversationId/messages", chatController.sendMessage);

/**
 * DELETE /api/chat/conversations/:conversationId
 * Hide/delete a conversation for the current user
 * Auth: Required (Participant only)
 */
router.delete("/conversations/:conversationId", chatController.deleteConversation);

// ============================================================================
// 💬 MESSAGE ROUTES
// ============================================================================

/**
 * PATCH /api/chat/messages/:messageId/read
 * Mark a specific message as read
 * Auth: Required (Participant only)
 */
router.patch("/messages/:messageId/read", chatController.markMessageRead);

/**
 * DELETE /api/chat/messages/:messageId
 * Soft delete a message (sender or admin only)
 * Auth: Required (Sender or Admin)
 */
router.delete("/messages/:messageId", chatController.deleteMessage);

// ============================================================================
// 🛡️ EXPORT
// ============================================================================
module.exports = router;