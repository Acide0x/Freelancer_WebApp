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

/* ================= VIRTUALS ================= */
discussionSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

discussionSchema.virtual("isLikedByUser").set(function (userId) {
  this._isLikedByUser = userId;
});
discussionSchema.virtual("isLiked").get(function () {
  if (!this._isLikedByUser) return null;
  return this.likes.includes(this._isLikedByUser);
});

/* ================= METHODS ================= */
discussionSchema.methods.toggleLike = function (userId) {
  const isLiked = this.likes.includes(userId);
  if (isLiked) {
    this.likes.pull(userId);
  } else {
    this.likes.push(userId);
  }
  return isLiked ? "unliked" : "liked";
};

discussionSchema.methods.incrementView = function () {
  this.viewCount += 1;
  return this.save();
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
  sortBy = "createdAt",
  userId,
}) {
  const query = { isDeleted: false };

  if (category) query.category = category;
  if (tag) query.tags = tag;
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
    liked: { likes: -1 },
    pinned: { isPinned: -1, createdAt: -1 },
  };

  const skip = (page - 1) * limit;

  const discussions = await this.find(query)
    .populate("author", "fullName avatar role providerDetails.headline")
    .sort(sortOptions[sortBy] || sortOptions.newest)
    .skip(skip)
    .limit(limit)
    .lean();

  if (userId) {
    discussions.forEach((disc) => {
      disc.isLiked = disc.likes?.includes(userId) || false;
      delete disc.likes;
    });
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
  delete ret.likes;
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