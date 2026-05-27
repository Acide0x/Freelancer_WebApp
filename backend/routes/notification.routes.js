/**
 * notification.routes.js
 *
 * Mount in app.js:
 *   const notificationRoutes = require("./routes/notification.routes");
 *   app.use("/api/notifications", authenticate, notificationRoutes);
 *
 * `authenticate` is your existing JWT middleware that sets req.user.
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notification.controller");

// ─── User-facing ───────────────────────────────────────────────────────────
router.get("/", ctrl.getMyNotifications);
router.get("/unread-count", ctrl.getUnreadCount);
router.patch("/read-all", ctrl.markAllRead);
router.patch("/:id/read", ctrl.markOneRead);
router.delete("/", ctrl.clearAll);          // ?read=true to clear only read
router.delete("/:id", ctrl.deleteOne);

// ─── Admin-facing ──────────────────────────────────────────────────────────
router.get("/admin/user/:userId", ctrl.getNotificationsForUser);

module.exports = router;