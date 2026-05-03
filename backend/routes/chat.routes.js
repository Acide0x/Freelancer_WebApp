// routes/chat.routes.js
const express      = require("express");
const router       = express.Router();
const { verifyAuth } = require("../middlewares/authMiddleware");
const chatController = require("../controllers/chat.controller");

// All chat routes require a logged-in user
router.use(verifyAuth);

// ============================================================================
// 📊 UTILITIES  (static segments — must come before /:param routes)
// ============================================================================

// GET /api/chat/unread-count
router.get("/unread-count", chatController.getUnreadCount);

// GET /api/chat/search/users?query=...
router.get("/search/users", chatController.searchUsers);

// ============================================================================
// 📋 CONVERSATIONS
// ============================================================================

// GET  /api/chat/conversations           — list all conversations
// POST /api/chat/conversations/direct    — start or get a DM
// POST /api/chat/conversations/job/:jobId — start or get a job chat
router.get( "/conversations",                  chatController.getConversations);
router.post("/conversations/direct",           chatController.createDirectChat);
router.post("/conversations/job/:jobId",       chatController.getOrCreateJobChat);

// GET    /api/chat/conversations/:conversationId            — single conversation
// GET    /api/chat/conversations/:conversationId/messages   — message history
// POST   /api/chat/conversations/:conversationId/messages   — send message (REST fallback)
// DELETE /api/chat/conversations/:conversationId            — hide conversation
router.get(   "/conversations/:conversationId",           chatController.getConversation);
router.get(   "/conversations/:conversationId/messages",  chatController.getMessages);
router.post(  "/conversations/:conversationId/messages",  chatController.sendMessage);
router.delete("/conversations/:conversationId",           chatController.deleteConversation);

// ============================================================================
// 💬 MESSAGES
// ============================================================================

// PATCH  /api/chat/messages/:messageId/read  — mark as read
// DELETE /api/chat/messages/:messageId       — soft delete (sender or admin)
router.patch( "/messages/:messageId/read", chatController.markMessageRead);
router.delete("/messages/:messageId",      chatController.deleteMessage);

module.exports = router;