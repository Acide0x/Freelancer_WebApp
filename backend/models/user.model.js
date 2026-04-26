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

    // UNIVERSAL BIO — for any user (customer, provider, admin)
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    /* ================= KYC VERIFICATION (for all non-admin users) ================= */
    kycVerified: {
      type: Boolean,
      default: false,
    },

    /* ================= LOCATION ================= */
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [85.3240, 27.7172], // <-- default coordinates (Kathmandu, Nepal)
        validate: {
          validator: function (v) {
            return Array.isArray(v) && v.length === 2;
          },
          message: 'Coordinates must be [longitude, latitude]'
        }
      },
      address: String
    },

    /* ================= ACTIVE JOBS TRACKING (for providers) ================= */
    // Tracks jobs currently in 'in_progress' status for this provider
    // Auto-managed by job.controller.js: startWork/completeJob/cancelJob
    activeJobs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      comment: "Jobs currently in 'in_progress' status for this provider"
    }],

    /* ================= PROVIDER DETAILS ================= */
    providerDetails: {
      // === Professional Headline (Step 1) ===
      headline: {
        type: String,
        trim: true,
        maxlength: 120,
      },

      // WORK-FOCUSED DESCRIPTION (replaces old 'bio' in provider context)
      workDescription: {
        type: String,
        trim: true,
        maxlength: 500,
        comment: "Professional summary of services, expertise, and value proposition"
      },

      // === Skills Section (Step 2) ===
      skills: [{
        name: {
          type: String,
          trim: true,
          required: true,
          maxlength: 50,
        },
        proficiency: {
          type: Number,
          min: 1,
          max: 10,
          default: 5,
          comment: "Self-rated proficiency on a 1–10 scale (matches UI slider)"
        },
        years: {
          type: Number,
          min: 0,
          default: 0,
          comment: "Years of professional experience with this skill"
        }
      }],

      // === Rates & Terms (Step 3) ===
      rate: {
        type: Number,
        min: 0,
        default: 50,
        comment: "Hourly rate in USD"
      },
      minCallOutFee: {
        type: Number,
        min: 0,
        default: 30,
        comment: "Minimum fee charged per service call"
      },
      travelFeePerKm: {
        type: Number,
        min: 0,
        default: 2,
        comment: "Additional fee per kilometer beyond threshold"
      },
      travelThresholdKm: {
        type: Number,
        min: 0,
        default: 15,
        comment: "Free travel distance (km); fees apply beyond this"
      },
      fixedRateProjects: [{
        name: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        details: {
          type: String,
          trim: true,
          maxlength: 300,
        },
        rate: {
          type: Number,
          min: 0,
        }
      }],

      // === Availability Status ===
      // AUTO-MANAGED: "busy" when job starts, "available" when job ends/cancels
      availabilityStatus: {
        type: String,
        enum: ["available", "busy", "offline"],
        default: "available",
      },

      // === Portfolio (Step 4) ===
      portfolios: [{
        title: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        description: {
          type: String,
          trim: true,
          maxlength: 500,
        },
        images: {
          type: [{
            type: String,
            trim: true, // auto-trim whitespace!
          }],
          validate: {
            validator: function (imagesArray) {
              return !imagesArray || imagesArray.length <= 10;
            },
            message: 'A portfolio item can have at most 10 images'
          }
        }
      }],

      // === Service Area (Step 5) ===
      serviceAreas: [{
        address: {
          type: String,
          trim: true,
          required: true,
        },
        radiusKm: {
          type: Number,
          min: 5,
          max: 200,
          default: 25,
          comment: "Service coverage radius in kilometers from base address"
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          validate: {
            validator: function (v) {
              return !v || (Array.isArray(v) && v.length === 2);
            },
            message: 'Coordinates must be an array of [longitude, latitude]'
          }
        }
      }],

      // === General Experience ===
      experienceYears: {
        type: Number,
        min: 0,
        default: 0,
      },

      // === Visibility & Trust ===
      isVerified: {
        type: Boolean,
        default: false,
      },
      isProfilePublic: {
        type: Boolean,
        default: true,
      },

      // === Verification Workflow ===
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
    reviews: {
      type: [{
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
      default: [],
    },

    /* ================= SECURITY & ACCOUNT STATUS ================= */
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

    /* ================= EMAIL VERIFICATION ================= */
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    /* ================= PASSWORD RESET ================= */
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
userSchema.index(
  { 'location.coordinates': '2dsphere' },
  { partialFilterExpression: { 'location.coordinates': { $exists: true } } }
);
userSchema.index({ "providerDetails.skills.name": 1 });
userSchema.index({ "providerDetails.isVerified": 1 });
userSchema.index({ "ratings.average": -1 });
userSchema.index({ kycVerified: 1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ activeJobs: 1 }); // ✅ NEW: Index for activeJobs queries

/* ================= VIRTUALS ================= */
// Virtual: Count of active jobs (for quick frontend display)
userSchema.virtual("activeJobsCount").get(function() {
  return Array.isArray(this.activeJobs) ? this.activeJobs.length : 0;
});

// Virtual: Is provider currently busy with any job?
userSchema.virtual("isCurrentlyBusy").get(function() {
  return this.role === "provider" && 
         this.providerDetails?.availabilityStatus === "busy" &&
         this.activeJobsCount > 0;
});

/* ================= OUTPUT SANITIZATION ================= */
const sanitizeOutput = (ret) => {
  delete ret.password;
  delete ret.passwordResetToken;
  delete ret.emailVerificationToken;
  // Keep activeJobs in output - useful for provider dashboard
  return ret;
};

userSchema.set("toJSON", {
  transform: (_, ret) => sanitizeOutput(ret),
  virtuals: true, // ✅ Include virtuals like activeJobsCount
});

userSchema.set("toObject", {
  transform: (_, ret) => sanitizeOutput(ret),
  virtuals: true,
});

/* ================= INSTANCE METHODS ================= */
// Check if provider can accept new jobs
userSchema.methods.canAcceptJobs = function() {
  if (this.role !== "provider") return false;
  if (!this.isActive || this.isSuspended) return false;
  if (this.providerDetails?.availabilityStatus !== "available") return false;
  
  // Optional: Limit concurrent jobs (e.g., max 3 active)
  const MAX_CONCURRENT_JOBS = process.env.MAX_CONCURRENT_JOBS || 3;
  return this.activeJobsCount < MAX_CONCURRENT_JOBS;
};

// Get summary for provider card/list view
userSchema.methods.getProviderSummary = function() {
  const pd = this.providerDetails || {};
  return {
    id: this._id,
    name: this.fullName,
    avatar: this.avatar,
    headline: pd.headline,
    primarySkill: pd.skills?.[0]?.name,
    experience: pd.experienceYears,
    rating: this.ratings?.average,
    reviewsCount: this.ratings?.count,
    rate: pd.rate,
    availability: this.providerDetails?.availabilityStatus,
    isVerified: pd.isVerified,
    activeJobsCount: this.activeJobsCount, // ✅ Now included
    location: this.location?.address
  };
};

/* ================= STATIC METHODS ================= */
// Find available providers near a location with specific skills
userSchema.statics.findAvailableProviders = async function({ 
  coordinates, 
  radiusKm, 
  skills, 
  limit = 20 
}) {
  const matchStage = {
    role: "provider",
    isActive: true,
    isSuspended: { $ne: true },
    "providerDetails.availabilityStatus": "available",
    "providerDetails.isProfilePublic": { $ne: false }
  };

  if (skills?.length > 0) {
    matchStage["providerDetails.skills.name"] = { $in: skills };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $geoNear: {
        near: { type: "Point", coordinates },
        distanceField: "distance",
        maxDistance: radiusKm * 1000, // meters
        spherical: true
      }
    },
    { $limit: limit },
    {
      $project: {
        fullName: 1,
        avatar: 1,
        "providerDetails.headline": 1,
        "providerDetails.skills": 1,
        "providerDetails.rate": 1,
        "providerDetails.availabilityStatus": 1,
        "providerDetails.isVerified": 1,
        ratings: 1,
        location: 1,
        activeJobsCount: { $size: "$activeJobs" } // ✅ Include active jobs count
      }
    }
  ];

  return await this.aggregate(pipeline);
};

module.exports = mongoose.model("User", userSchema);