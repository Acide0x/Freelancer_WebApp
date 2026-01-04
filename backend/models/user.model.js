const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["customer", "provider", "admin"],
      default: "customer",
      required: true,
    },
    phone: String,
    avatar: String,

    /* ================= KYC VERIFICATION (for all non-admin users) ================= */
    kycVerified: {
      type: Boolean,
      default: false,
    },

    /* ================= LOCATION ================= */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        validate: {
          validator: v => !v || v.length === 2,
          message: "Coordinates must be [longitude, latitude]",
        },
      },
      address: String,
    },

    /* ================= PROVIDER DETAILS ================= */
    providerDetails: {
      bio: {
        type: String,
        maxlength: 500,
        trim: true,
      },

      // ✅ UPDATED: skills now support proficiency + years
      skills: [{
        name: { type: String, trim: true, required: true },
        proficiency: { 
          type: Number, 
          min: 0, 
          max: 100, 
          default: 50,
          comment: "0-100% self-rated proficiency"
        },
        years: { 
          type: Number, 
          min: 0, 
          default: 0,
          comment: "Years of experience with this skill"
        }
      }],

      certifications: [{
        title: String,
        issuingOrganization: String,
        issueDate: Date,
        certificateUrl: String,
      }],

      // ✅ RENAMED: hourlyRate → rate (supports hourly or base rate)
      rate: {
        type: Number,
        min: 0,
        comment: "Base/hourly rate in USD"
      },

      experienceYears: {
        type: Number,
        min: 0,
      },

      /* 🔐 Trust & verification */
      isVerified: {
        type: Boolean,
        default: false,
      },

      /* 🟢 Availability */
      availabilityStatus: {
        type: String,
        enum: ["available", "busy", "offline"],
        default: "available",
      },

      /* 👀 Visibility */
      isProfilePublic: {
        type: Boolean,
        default: true,
      },

      /* 📊 Profile strength */
      profileCompletion: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      portfolio: [{
        title: String,
        description: String,
        imageUrl: String,
      }],

      // ✅ IMPROVED: serviceAreas now supports radius for coverage
      serviceAreas: [{
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          validate: v => !v || v.length === 2,
        },
        address: String,
        // New: coverage radius in km
        radiusKm: {
          type: Number,
          min: 0,
          default: 10,
          comment: "Service coverage radius in kilometers"
        }
      }],

      /* ================= VERIFICATION STATUS ================= */
      verificationStatus: {
        type: String,
        enum: ["incomplete", "pending", "approved", "rejected"],
        default: "incomplete",
      },
      rejectionReason: String,
      submittedAt: Date,
    },

    /* ================= CUSTOMER PREFERENCES ================= */
    customerPreferences: {
      favoriteProviders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }],
      preferredCategories: [String],
    },

    /* ================= RATINGS & REVIEWS ================= */
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },

    reviews: [{
      reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now,
      },
    }],

    /* ================= SECURITY ================= */
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    /* ================= EMAIL & PASSWORD ================= */
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    passwordResetToken: String,
    passwordResetExpires: Date,

    /* ================= MODERATION ================= */
    reportCount: {
      type: Number,
      default: 0,
    },
    adminNotes: String,

    /* ================= SOFT DELETE ================= */
    deletedAt: Date,
  },
  {
    timestamps: true,
    validateBeforeSave: true,
  }
);

/* ================= INDEXES ================= */
userSchema.index({ role: 1 });
userSchema.index({ location: "2dsphere" });
userSchema.index({ "providerDetails.skills.name": 1 }); // ✅ Index skill names for search
userSchema.index({ "providerDetails.isVerified": 1 });
userSchema.index({ "ratings.average": -1 });
userSchema.index({ kycVerified: 1 }); // ✅ Index for filtering verified users
userSchema.index({ deletedAt: 1 });

/* ================= OUTPUT SANITIZATION ================= */
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.emailVerificationToken;
    return ret;
  },
  virtuals: true,
});

userSchema.set("toObject", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.emailVerificationToken;
    return ret;
  },
  virtuals: true,
});

module.exports = mongoose.model("User", userSchema);