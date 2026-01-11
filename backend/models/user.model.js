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
        images: [{
          type: String, // Array of image URLs
          validate: {
            validator: function (v) {
              return !v || v.length <= 10;
            },
            message: 'A portfolio item can have at most 10 images'
          }
        }]
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

/* ================= OUTPUT SANITIZATION ================= */
const sanitizeOutput = (ret) => {
  delete ret.password;
  delete ret.passwordResetToken;
  delete ret.emailVerificationToken;
  return ret;
};

userSchema.set("toJSON", {
  transform: (_, ret) => sanitizeOutput(ret),
  virtuals: true,
});

userSchema.set("toObject", {
  transform: (_, ret) => sanitizeOutput(ret),
  virtuals: true,
});

module.exports = mongoose.model("User", userSchema);