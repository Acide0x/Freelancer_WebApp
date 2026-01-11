// controllers/authController.js
const User = require("../models/user.model"); // Adjust path as needed
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const geocodeLocation = require("../utils/geocode");
const mongoose = require("mongoose");
require("dotenv").config();

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: false, // because localhost is HTTP
  sameSite: "lax", // ← critical fix
  maxAge: 24 * 60 * 60 * 1000,
};

// Rate limiters
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per IP
  message: { message: "Too many signups from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware exports for routes
exports.signupLimiter = signupLimiter;
exports.loginLimiter = loginLimiter;

// @desc    Register a new user (Customer or Provider)
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  // Destructure body, including potential provider details if role is provider
  const { fullName, email, password, phone, role, providerDetails } = req.body;

  try {
    // Validate input - fullName, email, password are always required
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields: fullName, email, password" });
    }

    // Validate role if provided
    if (role && !["customer", "provider", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified. Use 'customer', 'provider', or 'admin'." });
    }

    // For provider signup, validate essential provider details
    if (role === 'provider') {
      // Basic validation for provider details if provided during signup
      // You might want more specific validation based on your requirements
      if (providerDetails) {
        // Example: Validate skills array if present
        if (providerDetails.skills && !Array.isArray(providerDetails.skills)) {
          return res.status(400).json({ message: "Provider skills must be an array." });
        }
        // Example: Validate hourlyRate if present
        if (providerDetails.hourlyRate !== undefined && typeof providerDetails.hourlyRate !== 'number') {
          return res.status(400).json({ message: "Provider hourlyRate must be a number." });
        }
        // Add more validations as needed for bio, experience, etc.
      }
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data object
    const userData = {
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || undefined, // Only set if provided in request
      role: role || "customer", // Default to 'customer' if not specified
    };

    // Add provider details only if role is provider and details are provided
    if (role === 'provider' && providerDetails) {
      // Only add fields that are defined in providerDetails
      userData.providerDetails = {};
      if (providerDetails.bio) userData.providerDetails.bio = providerDetails.bio;
      if (providerDetails.skills) userData.providerDetails.skills = providerDetails.skills;
      if (providerDetails.hourlyRate !== undefined) userData.providerDetails.hourlyRate = providerDetails.hourlyRate;
      if (providerDetails.experienceYears !== undefined) userData.providerDetails.experienceYears = providerDetails.experienceYears;
      // Note: isVerified and kycVerified default to false in the schema
      // Add other providerDetails fields as needed (certifications, portfolio, etc.)
    }

    // Create new user
    const newUser = new User(userData);
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    // Set token in HTTP-only cookie
    res.cookie("token", token, cookieOptions);

    // Send success response (exclude password from response)
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        // Include provider details in response if the user is a provider
        ...(newUser.role === 'provider' && {
          providerDetails: {
            bio: newUser.providerDetails.bio,
            skills: newUser.providerDetails.skills,
            hourlyRate: newUser.providerDetails.hourlyRate,
            experienceYears: newUser.providerDetails.experienceYears,
            isVerified: newUser.providerDetails.isVerified,
            kycVerified: newUser.providerDetails.kycVerified,
          }
        })
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    // Check for specific Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation Error', details: messages });
    }
    res.status(500).json({ message: "Server error during signup. Please try again later." });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Find user by email, selecting only necessary fields for efficiency
    // Explicitly exclude the password field
    const user = await User.findOne({ email: normalizedEmail }).select('-password');
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials - User not found" });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(400).json({ message: "Account is inactive. Please contact support." });
    }

    // Find user by email, retrieving the password for comparison
    const userWithPassword = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!userWithPassword) {
      // This should ideally not happen if the first query found a user, but added for safety
      return res.status(400).json({ message: "Invalid credentials - User not found" });
    }

    // Check password using the user document that includes the password
    const isMatch = await bcrypt.compare(password, userWithPassword.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials - Password incorrect" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: userWithPassword._id, role: userWithPassword.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    // Set token in HTTP-only cookie (optional, can keep for security)
    res.cookie("token", token, cookieOptions);

    // Send success response including the token
    res.json({
      message: "Login successful",
      token, // <-- add this line
      user: {
        id: userWithPassword._id,
        fullName: userWithPassword.fullName,
        email: userWithPassword.email,
        role: userWithPassword.role,
        phone: userWithPassword.phone,
        isActive: userWithPassword.isActive,
        ...(userWithPassword.role === 'provider' && {
          providerDetails: {
            bio: userWithPassword.providerDetails.bio,
            skills: userWithPassword.providerDetails.skills,
            hourlyRate: userWithPassword.providerDetails.hourlyRate,
            experienceYears: userWithPassword.providerDetails.experienceYears,
            isVerified: userWithPassword.providerDetails.isVerified,
            kycVerified: userWithPassword.providerDetails.kycVerified,
          }
        })
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login. Please try again later." });
  }
};

// @desc    Logout user & clear token
// @route   POST /api/auth/logout
// @access  Public
exports.logout = (req, res) => {
  // Clear the 'token' cookie using the same options it was set with
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out successfully" });
};


// @desc    Update user profile (authenticated users only)
// @route   PATCH /api/auth/profile
// @access  Private
exports.updateUser = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // Start with an empty update object
    const updateObj = {};

    // Allow dot-notation fields (e.g., "providerDetails.bio")
    const allowedTopLevel = ['fullName', 'email', 'phone', 'avatar', 'location'];
    const allowedNested = ['providerDetails.bio']; // Add more if needed, e.g., 'providerDetails.skills'

    // Handle each field in req.body
    for (const [key, value] of Object.entries(req.body)) {
      // 1. Handle top-level simple fields
      if (allowedTopLevel.includes(key)) {
        if (key === 'fullName') {
          if (typeof value !== 'string' || value.trim().length < 2) {
            return res.status(400).json({ message: "Full name must be a string with at least 2 characters." });
          }
          updateObj.fullName = value.trim();
        }
        else if (key === 'email') {
          const normalized = value.toLowerCase().trim();
          if (!validator.isEmail(normalized)) {
            return res.status(400).json({ message: "Invalid email format." });
          }
          const existing = await User.findOne({ email: normalized, _id: { $ne: userId } });
          if (existing) return res.status(400).json({ message: "Email already in use." });
          updateObj.email = normalized;
        }
        else if (key === 'phone') {
          updateObj.phone = typeof value === 'string' ? value.trim() || undefined : undefined;
        }
        else if (key === 'avatar') {
          if (typeof value !== 'string') {
            return res.status(400).json({ message: "Avatar must be a URL string." });
          }
          updateObj.avatar = value.trim();
        }
        else if (key === 'location') {
          // 🌍 SPECIAL: Handle location string → geocode
          if (typeof value === 'string' && value.trim()) {
            const geo = await geocodeLocation(value.trim());
            if (!geo) {
              return res.status(400).json({ message: "Location not found. Please try a more specific address." });
            }
            updateObj.location = {
              type: 'Point',
              coordinates: [geo.lng, geo.lat],
              address: geo.address,
            };
          } else if (value === null || value === '') {
            updateObj.location = undefined; // clear location
          }
          // If value is already a GeoJSON object (advanced), you could allow it — but not needed for now
        }
      }
      // 2. Handle nested dot-notation fields
      else if (key === 'providerDetails.bio') {
        const user = await User.findById(userId).select('role');
        if (!user || user.role !== 'provider') {
          return res.status(403).json({ message: "Only providers can update bio." });
        }
        if (typeof value !== 'string') {
          return res.status(400).json({ message: "Bio must be a string." });
        }
        updateObj['providerDetails.bio'] = value.trim();
      }
      // ⚠️ Reject any other field (security)
      else {
        return res.status(400).json({ message: `Invalid or unsupported update field: ${key}` });
      }
    }

    // Prevent protected field updates (extra safety)
    const protectedPaths = [
      'password', 'role', 'isActive', 'isSuspended', 'isEmailVerified',
      'providerDetails.isVerified', 'providerDetails.kycVerified',
      'providerDetails.certifications', 'providerDetails.portfolio',
      'ratings', 'reviews', 'adminNotes', 'createdAt', 'updatedAt'
    ];
    for (const path of protectedPaths) {
      if (req.body[path] !== undefined) {
        return res.status(403).json({ message: `Cannot update protected field: ${path}` });
      }
    }

    // Perform the update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateObj },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Build safe response
    const response = {
      id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      location: updatedUser.location?.coordinates ? {
        type: 'Point',
        coordinates: updatedUser.location.coordinates,
        address: updatedUser.location.address
      } : undefined,
    };

    if (updatedUser.role === 'provider') {
      response.providerDetails = {
        bio: updatedUser.providerDetails?.bio,
        skills: updatedUser.providerDetails?.skills,
        hourlyRate: updatedUser.providerDetails?.hourlyRate,
        experienceYears: updatedUser.providerDetails?.experienceYears,
      };
    }

    if (updatedUser.role === 'customer') {
      response.customerPreferences = {
        favoriteProviders: updatedUser.customerPreferences?.favoriteProviders,
        preferredCategories: updatedUser.customerPreferences?.preferredCategories,
      };
    }

    res.json({ message: "Profile updated successfully", user: response });

  } catch (error) {
    console.error("Update User Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "Validation failed",
        details: Object.values(error.errors).map(e => e.message)
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate field value entered" });
    }
    res.status(500).json({ message: "Server error during profile update." });
  }
};

// @desc    Change user password
// @route   PATCH /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { oldPassword, newPassword } = req.body;

  // Validate input
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Both old and new passwords are required." });
  }

  if (typeof oldPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ message: "Passwords must be strings." });
  }

  // Validate new password strength (same as signup)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message:
        "New password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
    });
  }

  try {
    // Fetch user with password
    const user = await User.findById(userId).select('+password'); // '+password' to include it
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect." });
    }

    // Prevent reusing same password
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ message: "New password must be different from the current one." });
    }

    // Hash and update new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // ⚠️ Optional: Invalidate current session by issuing a new token
    // (Not strictly needed since password hash changed, but good practice)
    const newToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );
    res.cookie("token", newToken, cookieOptions);

    res.json({ message: "Password updated successfully." });

  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ message: "Server error during password change." });
  }
};

// @desc    Complete or update provider onboarding details
// @route   PATCH /api/auth/onboarding
// @access  Private (Provider only)
exports.updateProviderOnboarding = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // Fetch user and verify they are a provider
    const user = await User.findById(userId).select('role');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== 'provider') {
      return res.status(403).json({ message: "Only providers can complete onboarding" });
    }

    const { 
      headline,
      workDescription,
      skills,
      rate,
      minCallOutFee,
      travelFeePerKm,
      travelThresholdKm,
      fixedRateProjects,
      availabilityStatus,
      portfolios,
      serviceAreas,
      experienceYears,
      verificationStatus
    } = req.body;

    // 🔒 Prevent changing verification status from frontend (security)
    if (verificationStatus && !['incomplete', 'pending'].includes(verificationStatus)) {
      return res.status(400).json({ message: "Invalid verification status" });
    }

    // ✅ Build update object with validation
    const update = {};

    // --- Bio & Headline ---
    if (headline !== undefined) {
      if (typeof headline !== 'string' || headline.trim().length > 120) {
        return res.status(400).json({ message: "Headline must be a string (max 120 chars)" });
      }
      update['providerDetails.headline'] = headline.trim();
    }

    if (workDescription !== undefined) {
      if (typeof workDescription !== 'string' || workDescription.trim().length > 500) {
        return res.status(400).json({ message: "Work description must be a string (max 500 chars)" });
      }
      update['providerDetails.workDescription'] = workDescription.trim();
    }

    // --- Skills ---
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({ message: "Skills must be an array" });
      }
      const validatedSkills = [];
      for (const skill of skills) {
        if (!skill.name || typeof skill.name !== 'string') {
          return res.status(400).json({ message: "Each skill must have a valid name" });
        }
        validatedSkills.push({
          name: skill.name.trim(),
          proficiency: Math.min(10, Math.max(1, parseInt(skill.proficiency) || 5)),
          years: Math.max(0, parseInt(skill.years) || 0)
        });
      }
      update['providerDetails.skills'] = validatedSkills;
    }

    // --- Rates ---
    const numericFields = [
      { key: 'rate', min: 0 },
      { key: 'minCallOutFee', min: 0 },
      { key: 'travelFeePerKm', min: 0 },
      { key: 'travelThresholdKm', min: 0 },
      { key: 'experienceYears', min: 0 }
    ];

    for (const field of numericFields) {
      const value = req.body[field.key];
      if (value !== undefined) {
        const num = Number(value);
        if (isNaN(num) || num < field.min) {
          return res.status(400).json({ message: `${field.key} must be a number >= ${field.min}` });
        }
        update[`providerDetails.${field.key}`] = num;
      }
    }

    // --- Fixed Rate Projects ---
    if (fixedRateProjects !== undefined) {
      if (!Array.isArray(fixedRateProjects)) {
        return res.status(400).json({ message: "Fixed rate projects must be an array" });
      }
      const validatedProjects = [];
      for (const proj of fixedRateProjects) {
        if (!proj.name || !proj.details || proj.rate == null) continue; // skip invalid
        validatedProjects.push({
          name: proj.name.trim(),
          details: proj.details.trim(),
          rate: Number(proj.rate) >= 0 ? Number(proj.rate) : 0
        });
      }
      update['providerDetails.fixedRateProjects'] = validatedProjects;
    }

    // --- Portfolios ---
    if (portfolios !== undefined) {
      if (!Array.isArray(portfolios)) {
        return res.status(400).json({ message: "Portfolios must be an array" });
      }
      const validatedPortfolios = [];
      for (const p of portfolios) {
        if (!p.title) continue;
        validatedPortfolios.push({
          title: p.title.trim(),
          description: (p.description || '').trim(),
          images: Array.isArray(p.images) 
            ? p.images.filter(img => typeof img === 'string').slice(0, 10)
            : []
        });
      }
      update['providerDetails.portfolios'] = validatedPortfolios;
    }

    // --- Service Areas ---
    if (serviceAreas !== undefined) {
      if (!Array.isArray(serviceAreas) || serviceAreas.length === 0) {
        return res.status(400).json({ message: "At least one service area is required" });
      }
      const validatedAreas = [];
      for (const area of serviceAreas) {
        if (!area.address || typeof area.address !== 'string') {
          return res.status(400).json({ message: "Service area must include a valid address" });
        }
        validatedAreas.push({
          address: area.address.trim(),
          radiusKm: Math.min(200, Math.max(5, parseInt(area.radiusKm) || 25)),
          coordinates: Array.isArray(area.coordinates) && area.coordinates.length === 2
            ? [parseFloat(area.coordinates[0]), parseFloat(area.coordinates[1])]
            : undefined
        });
      }
      update['providerDetails.serviceAreas'] = validatedAreas;
    }

    // --- Availability ---
    if (availabilityStatus !== undefined) {
      if (!['available', 'busy', 'offline'].includes(availabilityStatus)) {
        return res.status(400).json({ message: "Invalid availability status" });
      }
      update['providerDetails.availabilityStatus'] = availabilityStatus;
    }

    // --- Verification Status (only allow transition to 'pending') ---
    if (verificationStatus === 'pending') {
      update['providerDetails.verificationStatus'] = 'pending';
      update['providerDetails.submittedAt'] = new Date();
    } else if (verificationStatus === 'incomplete') {
      update['providerDetails.verificationStatus'] = 'incomplete';
      update['providerDetails.submittedAt'] = undefined;
    }

    // Perform the update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found after update" });
    }

    // Return only providerDetails in response for efficiency
    res.json({
      message: "Onboarding details updated successfully",
      providerDetails: updatedUser.providerDetails
    });

  } catch (error) {
    console.error("Onboarding Update Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "Validation failed",
        details: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: "Server error during onboarding update" });
  }
};