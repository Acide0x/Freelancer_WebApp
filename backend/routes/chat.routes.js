// routes/chat.routes.js
const express        = require("express");
const router         = express.Router();
const { verifyAuth } = require("../middlewares/authMiddleware");
const chatController = require("../controllers/chat.controller");

// All chat routes require authentication
router.use(verifyAuth);

// ============================================================================
// 📊 UTILITIES  (static segments before /:param routes)
// ============================================================================

// GET /api/chat/unread-count
router.get("/unread-count",  chatController.getUnreadCount);

// GET /api/chat/search/users?query=
router.get("/search/users",  chatController.searchUsers);

// ============================================================================
// 📋 CONVERSATIONS
// ============================================================================

// GET  /api/chat/conversations                    — list all conversations
// POST /api/chat/conversations/direct             — start or get a DM
// POST /api/chat/conversations/job/:jobId         — start or get a job chat
router.get( "/conversations",                 chatController.getConversations);
router.post("/conversations/direct",          chatController.createDirectChat);
router.post("/conversations/job/:jobId",      chatController.getOrCreateJobChat);

// GET    /api/chat/conversations/:conversationId                  — single conversation
// DELETE /api/chat/conversations/:conversationId                  — archive/hide
// PATCH  /api/chat/conversations/:conversationId/mute             — toggle mute
router.get(   "/conversations/:conversationId",       chatController.getConversation);
router.delete("/conversations/:conversationId",       chatController.deleteConversation);
router.patch( "/conversations/:conversationId/mute",  chatController.toggleMuteConversation);

// ============================================================================
// 💬 MESSAGES
// ============================================================================

// GET  /api/chat/conversations/:conversationId/messages  — paginated history
// POST /api/chat/conversations/:conversationId/messages  — send (REST fallback)
router.get( "/conversations/:conversationId/messages", chatController.getMessages);
router.post("/conversations/:conversationId/messages", chatController.sendMessage);

// PATCH  /api/chat/messages/:messageId            — edit message content
// DELETE /api/chat/messages/:messageId            — unsend / soft-delete
// PATCH  /api/chat/messages/:messageId/read       — mark as read
// PATCH  /api/chat/messages/:messageId/react      — toggle emoji reaction
// GET    /api/chat/messages/:messageId/edits      — view edit history
router.patch( "/messages/:messageId",             chatController.editMessage);
router.delete("/messages/:messageId",             chatController.deleteMessage);
router.patch( "/messages/:messageId/read",        chatController.markMessageRead);
router.patch( "/messages/:messageId/react",       chatController.reactToMessage);
router.get(   "/messages/:messageId/edits",       chatController.getMessageEdits);

module.exports = router;