// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
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
      select: false, // 👈 Prevents password from being returned in queries by default
    },
    role: {
      type: String,
      enum: ["customer", "provider", "admin"],
      default: "customer",
      required: true,
    },
    phone: {
      type: String,
    },
    // Location as GeoJSON Point (optional)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function (v) {
            return !v || (Array.isArray(v) && v.length === 2);
          },
          message: "Coordinates must be an array of [longitude, latitude]",
        },
      },
      address: {
        type: String,
        trim: true,
      },
    },
    avatar: {
      type: String,
    },
    providerDetails: {
      bio: {
        type: String,
        maxlength: 500,
        trim: true,
      },
      skills: [{
        type: String,
        trim: true,
      }],
      certifications: [{
        title: String,
        issuingOrganization: String,
        issueDate: Date,
        certificateUrl: String,
      }],
      hourlyRate: {
        type: Number,
        min: 0,
      },
      experienceYears: {
        type: Number,
        min: 0,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      kycVerified: {
        type: Boolean,
        default: false,
      },
      portfolio: [{
        title: String,
        description: String,
        imageUrl: String,
      }],
      serviceAreas: [{
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          validate: {
            validator: function (v) {
              return !v || (Array.isArray(v) && v.length === 2);
            },
          },
        },
        address: String,
      }],
    },
    customerPreferences: {
      favoriteProviders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }],
      preferredCategories: [String],
    },
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
        required: true,
        min: 1,
        max: 5,
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now,
      },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    adminNotes: String,
    isSuspended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    validateBeforeSave: true,
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ "location": "2dsphere" });
userSchema.index({ "providerDetails.skills": 1 });
userSchema.index({ "providerDetails.isVerified": 1 });
userSchema.index({ "ratings.average": -1 });

// Ensure password is always removed in JSON output (extra safety)
userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
  virtuals: true,
});

userSchema.set("toObject", {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
  virtuals: true,
});

module.exports = mongoose.model("User", userSchema);