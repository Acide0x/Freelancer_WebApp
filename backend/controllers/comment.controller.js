const Comment = require("../models/comment.model");
const Discussion = require("../models/discussion.model");

// @desc    Create a new comment or reply
// @route   POST /comments
// @access  Private
exports.createComment = async (req, res) => {
  try {
    const { discussionId, content, parentCommentId } = req.body;

    if (!discussionId) {
      return res.status(400).json({ success: false, message: "discussionId is required" });
    }

    // Verify discussion exists and is open
    const discussion = await Discussion.findById(discussionId);
    if (!discussion || discussion.isDeleted || discussion.isClosed) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot comment on this discussion" });
    }

    // Determine nesting level
    let level = 0;
    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId);
      if (
        !parent ||
        parent.isDeleted ||
        parent.discussion.toString() !== discussionId
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid parent comment" });
      }
      level = Math.min(parent.level + 1, 5);
    }

    const comment = await Comment.create({
      discussion: discussionId,
      author: req.userIdFromToken || req.user._id,
      content,
      parentComment: parentCommentId || null,
      level,
    });

    // Populate author for response
    const populated = await Comment.findById(comment._id).populate(
      "author",
      "fullName avatar role providerDetails.headline providerDetails.isVerified"
    );

    res.status(201).json({ success: true,  populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get comments for a discussion
// @route   GET /comments?discussionId=xyz123&parentId=abc456
// @access  Public
exports.getComments = async (req, res) => {
  try {
    const { discussionId, parentId, page, limit } = req.query;

    if (!discussionId) {
      return res.status(400).json({ success: false, message: "discussionId query param is required" });
    }

    // Verify discussion exists
    const discussion = await Discussion.findById(discussionId);
    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ success: false, message: "Discussion not found" });
    }

    const result = await Comment.getComments({
      discussionId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      parentId: parentId || null,
      userId: req.user?._id,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle like on comment
// @route   POST /comments/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const status = comment.toggleLike(req.userIdFromToken || req.user._id);
    await comment.save();

    res.json({
      success: true,
      status,
      likeCount: comment.likeCount,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update comment (author only)
// @route   PATCH /comments/:id
// @access  Private
exports.updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const authorId = req.userIdFromToken || req.user._id;
    if (comment.author.toString() !== authorId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    comment.content = content;
    await comment.markEdited();

    res.json({ success: true,  comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Soft delete comment (author or admin)
// @route   DELETE /comments/:id
// @access  Private
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const authorId = req.userIdFromToken || req.user._id;
    if (
      comment.author.toString() !== authorId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await comment.softDelete();
    res.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};