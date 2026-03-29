const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    discussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discussion",
      required: [true, "Comment must belong to a discussion"],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Comment must have an author"],
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },

    /* ================= THREADING ================= */
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    /* ================= ENGAGEMENT ================= */
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* ================= MODERATION ================= */
    isDeleted: {
      type: Boolean,
      default: false,
    },
    edited: {
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
commentSchema.index({ discussion: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ level: 1 });

/* ================= VIRTUALS ================= */
commentSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

commentSchema.virtual("isLikedByUser").set(function (userId) {
  this._isLikedByUser = userId;
});
commentSchema.virtual("isLiked").get(function () {
  if (!this._isLikedByUser) return null;
  return this.likes.includes(this._isLikedByUser);
});

/* ================= METHODS ================= */
commentSchema.methods.toggleLike = function (userId) {
  const isLiked = this.likes.includes(userId);
  if (isLiked) {
    this.likes.pull(userId);
  } else {
    this.likes.push(userId);
  }
  return isLiked ? "unliked" : "liked";
};

commentSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

commentSchema.methods.markEdited = function () {
  this.edited = true;
  return this.save();
};

/* ================= STATIC METHODS ================= */
commentSchema.statics.getComments = async function ({
  discussionId,
  page = 1,
  limit = 20,
  parentId = null,
  maxLevel = 2,
  userId,
}) {
  const query = {
    discussion: discussionId,
    isDeleted: false,
  };

  if (parentId) {
    query.parentComment = parentId;
  }

  if (parentId === null) {
    query.level = { $lte: maxLevel };
  }

  const skip = (page - 1) * limit;

  const comments = await this.find(query)
    .populate(
      "author",
      "fullName avatar role providerDetails.headline providerDetails.isVerified"
    )
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  if (userId) {
    comments.forEach((comment) => {
      comment.isLiked = comment.likes?.includes(userId) || false;
      delete comment.likes;
    });
  }

  const total = await this.countDocuments(query);

  return {
    comments,
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

commentSchema.statics.getReplyCount = async function (parentCommentId) {
  return await this.countDocuments({
    parentComment: parentCommentId,
    isDeleted: false,
  });
};

/* ================= MIDDLEWARE ================= */
commentSchema.post("save", async function (doc) {
  if (doc.isNew && !doc.isDeleted) {
    await mongoose.model("Discussion").findByIdAndUpdate(doc.discussion, {
      $inc: { commentCount: 1 },
    });
  }
});

commentSchema.post("findOneAndUpdate", async function (doc) {
  if (doc.isDeleted && !doc.$original?.isDeleted) {
    await mongoose.model("Discussion").findByIdAndUpdate(doc.discussion, {
      $inc: { commentCount: -1 },
    });
  }
});

/* ================= OUTPUT SANITIZATION ================= */
const sanitizeOutput = (ret) => {
  delete ret.likes;
  return ret;
};

commentSchema.set("toJSON", {
  transform: (_, ret) => sanitizeOutput(ret),
  virtuals: true,
});

commentSchema.set("toObject", {
  transform: (_, ret) => sanitizeOutput(ret),
  virtuals: true,
});

module.exports = mongoose.model("Comment", commentSchema);