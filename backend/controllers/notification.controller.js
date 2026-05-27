/**
 * notification.controller.js
 *
 * REST API for in-app notifications.
 *
 * Routes (mount under /api/notifications):
 *   GET    /                  → getMyNotifications
 *   GET    /unread-count      → getUnreadCount
 *   PATCH  /:id/read          → markOneRead
 *   PATCH  /read-all          → markAllRead
 *   DELETE /:id               → deleteOne
 *   DELETE /                  → clearAll  (query: ?read=true to clear only read)
 *
 *   [Admin only]
 *   GET    /admin/user/:userId → getNotificationsForUser
 */

const mongoose = require("mongoose");
const Notification = require("../models/notification.model");

// ─── Helpers ───────────────────────────────────────────────────────────────

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GET /notifications
//  Returns paginated notifications for the current user.
//  Query params: page, limit, type, isRead
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { page = 1, limit = 20, type, isRead } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { recipient: userId };
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === "true";

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("relatedUser", "fullName avatar email")
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
        },
      },
    });
  } catch (error) {
    console.error("[getMyNotifications]", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GET /notifications/unread-count
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const count = await Notification.countDocuments({ recipient: userId, isRead: false });
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    console.error("[getUnreadCount]", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PATCH /notifications/:id/read
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.markOneRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid notification ID" });

    const notification = await Notification.findOne({ _id: id, recipient: userId });
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    await notification.markRead();
    res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error("[markOneRead]", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PATCH /notifications/read-all
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.markAllRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true, message: `${result.modifiedCount} notification(s) marked as read` });
  } catch (error) {
    console.error("[markAllRead]", error);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DELETE /notifications/:id
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.deleteOne = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid notification ID" });

    const result = await Notification.findOneAndDelete({ _id: id, recipient: userId });
    if (!result) return res.status(404).json({ message: "Notification not found" });

    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("[deleteOne]", error);
    res.status(500).json({ message: "Failed to delete notification" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DELETE /notifications?read=true  (clear all or only read)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.clearAll = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const filter = { recipient: userId };
    if (req.query.read === "true") filter.isRead = true; // only clear already-read ones

    const result = await Notification.deleteMany(filter);
    res.json({ success: true, message: `${result.deletedCount} notification(s) cleared` });
  } catch (error) {
    console.error("[clearAll]", error);
    res.status(500).json({ message: "Failed to clear notifications" });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  [ADMIN] GET /notifications/admin/user/:userId
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getNotificationsForUser = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { userId } = req.params;
    if (!isValidObjectId(userId)) return res.status(400).json({ message: "Invalid user ID" });

    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("relatedUser", "fullName avatar email")
        .lean(),
      Notification.countDocuments({ recipient: userId }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
        },
      },
    });
  } catch (error) {
    console.error("[getNotificationsForUser]", error);
    res.status(500).json({ message: "Failed to fetch user notifications" });
  }
};