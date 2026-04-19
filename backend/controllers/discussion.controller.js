const Discussion = require("../models/discussion.model");

// @desc    Create new discussion
// @route   POST /api/discussions
// @access  Private
exports.createDiscussion = async (req, res) => {
  try {
    const { title, content, category, tags, images } = req.body;

    // Validate required fields
    if (!title?.trim() || !content?.trim() || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, content, and category are required' 
      });
    }

    // Create discussion with images array (Cloudinary URLs)
    const discussion = await Discussion.create({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: Array.isArray(tags) ? tags.map(t => t.toLowerCase().trim()).filter(Boolean) : [],
      images: Array.isArray(images) ? images.filter(url => url?.trim()) : [], // ✅ Store validated Cloudinary URLs
      author: req.user._id,
    });

    // Populate author details for response
    const populated = await Discussion.findById(discussion._id)
      .populate("author", "fullName avatar username name profilePicture role providerDetails.headline")
      .lean();

    // ✅ Format response with consistent key name for frontend
    res.status(201).json({ 
      success: true, 
      discussion: populated, // ✅ Key matches frontend extraction: response.data.discussion
      message: 'Discussion created successfully'
    });
  } catch (error) {
    console.error('Create discussion error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to create discussion' 
    });
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
      userId: req.user?._id, // For isLiked calculation
    });

    // ✅ Ensure response structure is consistent and frontend-ready
    res.json({ 
      success: true, 
      discussions: result.discussions || [],
      pagination: result.pagination || { page: 1, pages: 1, total: 0, limit: 10 },
      stats: result.stats || {}
    });
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch discussions' 
    });
  }
};

// @desc    Get single discussion
// @route   GET /api/discussions/:id
// @access  Public
exports.getDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    })
    .populate("author", "fullName avatar username name profilePicture role providerDetails.headline")
    .lean();

    if (!discussion) {
      return res.status(404).json({ 
        success: false, 
        message: "Discussion not found" 
      });
    }

    // Increment view count asynchronously (don't block response)
    Discussion.findByIdAndUpdate(req.params.id, { 
      $inc: { viewCount: 1 } 
    }).catch(err => console.error('View increment failed:', err));

    // ✅ Set isLiked for authenticated users (ObjectId comparison safe)
    if (req.user?._id) {
      discussion.isLiked = discussion.likes?.some(id => 
        id?.toString() === req.user._id?.toString()
      ) || false;
    }

    // ✅ Clean up internal fields before sending
    delete discussion.likes;
    delete discussion.__v;

    res.json({ 
      success: true, 
      discussion // ✅ Consistent key name for frontend
    });
  } catch (error) {
    console.error('Get discussion error:', error);
    // Handle invalid ObjectId format
    if (error.name === 'CastError' || error.name === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid discussion ID format' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch discussion' 
    });
  }
};

// @desc    Toggle like on discussion
// @route   POST /api/discussions/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ 
        success: false, 
        message: "Discussion not found" 
      });
    }

    const userId = req.user._id;
    const status = discussion.toggleLike(userId);
    await discussion.save();

    res.json({
      success: true,
      status, // 'liked' or 'unliked'
      likeCount: discussion.likeCount,
      isLiked: status === 'liked'
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid discussion ID format' 
      });
    }
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to toggle like' 
    });
  }
};

// @desc    Update discussion (edit title, content, images, etc.)
// @route   PUT /api/discussions/:id
// @access  Private
exports.updateDiscussion = async (req, res) => {
  try {
    const { title, content, category, tags, images, isClosed, isPinned } = req.body;
    
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion || discussion.isDeleted) {
      return res.status(404).json({ 
        success: false, 
        message: "Discussion not found" 
      });
    }

    // Authorization: Only author or admin can update
    const isAuthor = discussion.author?.toString() === req.user._id?.toString();
    const isAdmin = req.user?.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to update this discussion" 
      });
    }

    // Update fields if provided (with validation)
    if (title !== undefined) discussion.title = title.trim();
    if (content !== undefined) discussion.content = content.trim();
    if (category !== undefined) discussion.category = category;
    if (Array.isArray(tags)) {
      discussion.tags = tags.map(t => t.toLowerCase().trim()).filter(Boolean);
    }
    if (Array.isArray(images)) {
      // ✅ Update images: filter valid URLs only
      discussion.images = images.filter(url => url?.trim() && /^https?:\/\//.test(url));
    }
    if (typeof isClosed === 'boolean') discussion.isClosed = isClosed;
    if (typeof isPinned === 'boolean' && isAdmin) discussion.isPinned = isPinned; // Only admins can pin

    const updated = await discussion.save();
    const populated = await Discussion.findById(updated._id)
      .populate("author", "fullName avatar username name profilePicture role providerDetails.headline")
      .lean();

    // Clean up for response
    delete populated.likes;
    delete populated.__v;

    res.json({ 
      success: true, 
      discussion: populated,
      message: 'Discussion updated successfully'
    });
  } catch (error) {
    console.error('Update discussion error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid discussion ID format' 
      });
    }
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to update discussion' 
    });
  }
};

// @desc    Soft delete discussion
// @route   DELETE /api/discussions/:id
// @access  Private
exports.deleteDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ 
        success: false, 
        message: "Discussion not found" 
      });
    }

    // Authorization check
    const isAuthor = discussion.author?.toString() === req.user._id?.toString();
    const isAdmin = req.user?.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to delete this discussion" 
      });
    }

    // Soft delete
    await discussion.softDelete();

    res.json({ 
      success: true, 
      message: "Discussion deleted successfully" 
    });
  } catch (error) {
    console.error('Delete discussion error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid discussion ID format' 
      });
    }
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to delete discussion' 
    });
  }
};

// @desc    Restore soft-deleted discussion (admin only)
// @route   POST /api/discussions/:id/restore
// @access  Private (Admin)
exports.restoreDiscussion = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ 
        success: false, 
        message: "Discussion not found" 
      });
    }

    await discussion.restore();

    res.json({ 
      success: true, 
      message: "Discussion restored successfully",
      discussion
    });
  } catch (error) {
    console.error('Restore discussion error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to restore discussion' 
    });
  }
};