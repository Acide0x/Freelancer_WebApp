const express = require("express");
const {
  createDiscussion,
  getDiscussions,
  getDiscussion,
  toggleLike,
  deleteDiscussion,
} = require("../controllers/discussion.controller");
const { verifyAuth, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();

// Public routes
router.route("/")
  .get(getDiscussions)
  .post(verifyAuth, createDiscussion);

router.route("/:id")
  .get(getDiscussion)
  .delete(verifyAuth, deleteDiscussion);

router.route("/:id/like").post(verifyAuth, toggleLike);

// Admin-only: pin/unpin discussion
router.route("/:id/pin").patch(
  verifyAuth, 
  restrictTo("admin"), 
  async (req, res) => {
    try {
      const Discussion = require("../models/discussion.model");
      const discussion = await Discussion.findById(req.params.id);
      if (!discussion) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      discussion.isPinned = !discussion.isPinned;
      await discussion.save();
      res.json({ success: true,  discussion });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;