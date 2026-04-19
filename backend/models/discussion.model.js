const mongoose = require("mongoose");

const discussionSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    title: {
      type: String,
      required: [true, "Discussion title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    content: {
      type: String,
      required: [true, "Discussion content is required"],
      trim: true,
      maxlength: [10000, "Content cannot exceed 10000 characters"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ================= IMAGES (Cloudinary URLs) ================= */
    images: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            // Allow empty array or valid URLs
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: (props) => `${props.value} is not a valid image URL!`,
        },
      },
    ],

    /* ================= CATEGORIZATION ================= */
    category: {
      type: String,
      enum: [
        "General",
        "Job Advice",
        "Technical",
        "Showcase",
        "Feedback",
        "Collaboration",
        "Hiring",
      ],
      default: "General",
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    /* ================= ENGAGEMENT ================= */
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      comment: "Denormalized count of non-deleted comments",
    },

    /* ================= MODERATION & VISIBILITY ================= */
    isClosed: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ================= INDEXES ================= */
discussionSchema.index({ createdAt: -1 });
discussionSchema.index({ author: 1 });
discussionSchema.index({ tags: 1 });
discussionSchema.index({ category: 1, createdAt: -1 });
discussionSchema.index({ viewCount: -1 });
discussionSchema.index({ isPinned: -1, createdAt: -1 });
// ✅ Index for image queries if needed in future
discussionSchema.index({ images: 1 });

/* ================= VIRTUALS ================= */
discussionSchema.virtual("likeCount").get(function () {
  return this.likes?.length || 0;
});

discussionSchema.virtual("isLikedByUser").set(function (userId) {
  this._isLikedByUser = userId;
});
discussionSchema.virtual("isLiked").get(function () {
  if (!this._isLikedByUser) return false;
  return this.likes?.some(id => 
    id?.toString() === this._isLikedByUser?.toString()
  ) || false;
});

/* ================= METHODS ================= */
discussionSchema.methods.toggleLike = function (userId) {
  if (!userId) return "unliked";
  
  const isLiked = this.likes?.some(id => 
    id?.toString() === userId?.toString()
  );
  
  if (isLiked) {
    this.likes.pull(userId);
    this.likeCount = Math.max(0, (this.likeCount || 0) - 1);
  } else {
    if (!this.likes?.some(id => id?.toString() === userId?.toString())) {
      this.likes.push(userId);
      this.likeCount = (this.likeCount || 0) + 1;
    }
  }
  return isLiked ? "unliked" : "liked";
};

discussionSchema.methods.incrementView = function () {
  this.viewCount = (this.viewCount || 0) + 1;
  return this.save().catch(err => console.error('View increment failed:', err));
};

discussionSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

discussionSchema.methods.restore = function () {
  this.isDeleted = false;
  return this.save();
};

/* ================= STATIC METHODS ================= */
discussionSchema.statics.getDiscussions = async function ({
  page = 1,
  limit = 10,
  category,
  tag,
  search,
  author,
  sortBy = "newest",
  userId,
}) {
  const query = { isDeleted: { $ne: true } };

  if (category) query.category = category;
  if (tag) query.tags = { $in: [tag] }; // ✅ Use $in for array field
  if (author) query.author = author;
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
    ];
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    popular: { viewCount: -1 },
    liked: { likeCount: -1 }, // ✅ Sort by virtual likeCount
    commented: { commentCount: -1 },
    pinned: { isPinned: -1, createdAt: -1 },
  };

  const skip = (page - 1) * limit;

  const discussions = await this.find(query)
    .populate("author", "fullName avatar username name profilePicture role providerDetails.headline")
    .sort(sortOptions[sortBy] || sortOptions.newest)
    .skip(skip)
    .limit(limit)
    .lean();

  // ✅ Add isLiked and clean up likes array for frontend
  if (userId) {
    discussions.forEach((disc) => {
      disc.isLiked = disc.likes?.some(id => 
        id?.toString() === userId?.toString()
      ) || false;
      delete disc.likes; // Remove raw likes array from response
    });
  } else {
    // Even for unauthenticated users, remove likes array
    discussions.forEach(disc => delete disc.likes);
  }

  const total = await this.countDocuments(query);

  return {
    discussions,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

/* ================= OUTPUT SANITIZATION ================= */
const sanitizeOutput = (ret) => {
  // ✅ Keep images, remove sensitive/internal fields only
  delete ret.likes;
  delete ret._isLikedByUser;
  delete ret.__v;
  return ret;
};

discussionSchema.set("toJSON", {
  transform: (_, ret) => sanitizeOutput(ret),
  virtuals: true,
});

discussionSchema.set("toObject", {
  transform: (_, ret) => sanitizeOutput(ret),
  virtuals: true,
});

module.exports = mongoose.model("Discussion", discussionSchema);