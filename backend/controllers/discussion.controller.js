const Discussion = require("../models/discussion.model");

// @desc    Create new discussion
// @route   POST /api/discussions
// @access  Private
exports.createDiscussion = async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;

    const discussion = await Discussion.create({
      title,
      content,
      category,
      tags,
      author: req.user._id,
    });

    const populated = await Discussion.findById(discussion._id).populate(
      "author",
      "fullName avatar role providerDetails.headline"
    );

    res.status(201).json({ success: true,  populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get discussions with filters
// @route   GET /api/discussions
// @access  Public
exports.getDiscussions = async (req, res) => {
  try {
    const { page, limit, category, tag, search, author, sortBy } = req.query;

    const result = await Discussion.getDiscussions({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      category,
      tag,
      search,
      author,
      sortBy,
      userId: req.user?._id,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single discussion
// @route   GET /api/discussions/:id
// @access  Public
exports.getDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("author", "fullName avatar role providerDetails.headline");

    if (!discussion) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    discussion.incrementView().catch((err) =>
      console.error("View count increment failed:", err)
    );

    if (req.user) {
      discussion.isLiked = discussion.likes?.includes(req.user._id) || false;
    }

    res.json({ success: true,  discussion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle like on discussion
// @route   POST /api/discussions/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const status = discussion.toggleLike(req.user._id);
    await discussion.save();

    res.json({
      success: true,
      status,
      likeCount: discussion.likeCount,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Soft delete discussion
// @route   DELETE /api/discussions/:id
// @access  Private
exports.deleteDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (
      discussion.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await discussion.softDelete();
    res.json({ success: true, message: "Discussion deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};