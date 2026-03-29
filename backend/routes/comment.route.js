const express = require("express");
const {
  createComment,
  getComments,
  toggleLike,
  updateComment,
  deleteComment,
} = require("../controllers/comment.controller");
const { verifyAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

// Public: Get comments for a discussion (via query param)
// GET /comments?discussionId=xyz123&parentId=abc456
router.route("/")
  .get(getComments)
  .post(verifyAuth, createComment);

// Like a comment
router.route("/:id/like").post(verifyAuth, toggleLike);

// Update or delete a comment (author only)
router.route("/:id")
  .patch(verifyAuth, updateComment)
  .delete(verifyAuth, deleteComment);

module.exports = router;