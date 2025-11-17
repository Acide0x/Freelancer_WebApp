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
      unique: true, // Ensures no duplicate emails
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true, // Consider minimum length validation in a pre-save hook
    },
    role: {
      type: String,
      enum: ["customer", "provider", "admin"], // Added 'provider' role as per SkillLink's dual nature
      default: "customer",
      required: true,
    },
    phone: {
      type: String,
      // Consider adding validation for phone number format if needed
    },
    // Location for geolocation features (as mentioned in proposal)
    location: {
      type: {
        type: String, // Don't do `{ location: { type: String } }` as 'type' is a reserved keyword in schemas
        enum: ['Point'], // GeoJSON type
        required: false // Make optional initially
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false // Make optional initially
      },
      address: {
        type: String, // Full address string
        required: false // Make optional initially
      }
    },
    // Avatar/profile picture
    avatar: {
      type: String, // URL to the image (e.g., Cloudinary, local storage)
    },
    // Provider-specific fields (only applicable if role is 'provider')
    providerDetails: {
      bio: {
        type: String,
        maxlength: 500, // Limit bio length
      },
      skills: [{
        type: String, // e.g., ["Electrician", "Plumbing", "Carpentry"]
        trim: true,
      }],
      certifications: [{
        title: String,
        issuingOrganization: String,
        issueDate: Date,
        certificateUrl: String, // URL to the certificate image/document
      }],
      hourlyRate: {
        type: Number, // Or a min/max range if preferred
        min: 0,
      },
      experienceYears: {
        type: Number,
        min: 0,
      },
      // Verification status for trust (as mentioned in proposal)
      isVerified: {
        type: Boolean,
        default: false,
      },
      // KYC status (as mentioned in proposal)
      kycVerified: {
        type: Boolean,
        default: false,
      },
      // Portfolio items (optional)
      portfolio: [{
        title: String,
        description: String,
        imageUrl: String, // URL to portfolio image
      }],
      // Service areas (if different from primary location)
      serviceAreas: [{
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number], // [longitude, latitude]
        address: String,
      }],
    },
    // Customer-specific fields (only applicable if role is 'customer') - might be minimal or handled via refs to other collections
    // Example: past bookings, preferences (though bookings might be in a separate Booking model)
    customerPreferences: {
      favoriteProviders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to provider users
      }],
      preferredCategories: [String], // e.g., ["Electrical", "Plumbing"]
    },
    // General fields for trust and reputation (could apply to both roles, but primarily for providers based on proposal)
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
      // This could reference a separate Review model for more details
      reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Email verification status (common practice)
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Optional: Additional fields for admin notes, flags, etc.
    adminNotes: String,
    isSuspended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// --- Indexes for Performance ---
// Index for email lookups (unique index already covers this for queries)
// Index for role-based queries
userSchema.index({ role: 1 });

// Index for location-based searches (2dsphere for GeoJSON)
userSchema.index({ "location": "2dsphere" });

// Index for skills (if frequently searched)
userSchema.index({ "providerDetails.skills": 1 });

// Index for verification status
userSchema.index({ "providerDetails.isVerified": 1 });

// Index for average rating
userSchema.index({ "ratings.average": -1 }); // Descending order for sorting

// --- Virtual for Populating Related Data (Optional, if needed frequently) ---
// Example: Virtual to get full booking history (assuming a Booking model exists)
// userSchema.virtual('bookings', {
//   ref: 'Booking',
//   localField: '_id',
//   foreignField: 'customerId' // Or 'providerId' depending on context
// });

// Ensure virtual fields are serialized (important if using JSON.stringify or res.json)
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("User", userSchema);
