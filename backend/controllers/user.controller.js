// controllers/authController.js
const User = require("../models/user.model");
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
  secure: false,
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000,
};

// Rate limiters
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: "Too many signups from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.signupLimiter = signupLimiter;
exports.loginLimiter = loginLimiter;

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  const { fullName, email, password, phone, role } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields: fullName, email, password" });
    }

    const validRoles = ["customer", "provider", "admin"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Use 'customer', 'provider', or 'admin'." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      ...(phone && { phone: phone.trim() }),
      role: role || "customer",
    };

    const newUser = new User(userData);
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.cookie("token", token, cookieOptions);

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone || null,
      },
    });

  } catch (error) {
    console.error("Signup Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: "Validation failed", details: messages });
    }

    res.status(500).json({ message: "Server error during signup. Please try again later." });
  }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('-password');
    if (!user || !user.isActive) {
      return res.status(400).json({ message: "Invalid credentials or inactive account" });
    }

    const userWithPassword = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!userWithPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, userWithPassword.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: userWithPassword._id, role: userWithPassword.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.cookie("token", token, cookieOptions);

    // ✅ FIXED: Use 'rate' instead of 'hourlyRate'
    const responseUser = {
      id: userWithPassword._id,
      fullName: userWithPassword.fullName,
      email: userWithPassword.email,
      role: userWithPassword.role,
      phone: userWithPassword.phone,
      isActive: userWithPassword.isActive,
      kycVerified: userWithPassword.kycVerified,
    };

    if (userWithPassword.role === 'provider') {
      responseUser.providerDetails = {
        bio: userWithPassword.providerDetails?.bio,
        skills: userWithPassword.providerDetails?.skills,
        rate: userWithPassword.providerDetails?.rate, // ✅ CORRECT FIELD
        experienceYears: userWithPassword.providerDetails?.experienceYears,
        isVerified: userWithPassword.providerDetails?.isVerified,
      };
    }

    res.json({
      message: "Login successful",
      token,
      user: responseUser,
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login. Please try again later." });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Public
exports.logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out successfully" });
};

// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
exports.updateUser = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const updateObj = {};

    // ✅ Allow top-level 'bio' (universal)
    const allowedTopLevel = ['fullName', 'email', 'phone', 'avatar', 'location', 'bio'];

    for (const [key, value] of Object.entries(req.body)) {
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
            updateObj.location = undefined;
          }
        }
        else if (key === 'bio') {
          if (typeof value !== 'string') {
            return res.status(400).json({ message: "Bio must be a string." });
          }
          updateObj.bio = value.trim().substring(0, 500);
        }
      }
      // ❌ REMOVED: providerDetails.bio — it doesn't exist in schema
      else {
        return res.status(400).json({ message: `Invalid or unsupported update field: ${key}` });
      }
    }

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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateObj },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const response = {
      id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      bio: updatedUser.bio, // ✅ Include top-level bio
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
        rate: updatedUser.providerDetails?.rate, // ✅ CORRECT
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

// @desc    Change password
// @route   PATCH /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Both old and new passwords are required." });
  }

  if (typeof oldPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ message: "Passwords must be strings." });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message:
        "New password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
    });
  }

  try {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect." });
    }

    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ message: "New password must be different from the current one." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

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

// @desc    Update provider onboarding
// @route   PATCH /api/auth/onboarding
// @access  Private (Provider only)
exports.updateProviderOnboarding = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
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

    // 🔒 Security: Only allow 'incomplete' or 'pending'
    if (verificationStatus && !['incomplete', 'pending'].includes(verificationStatus)) {
      return res.status(400).json({ message: "Invalid verification status" });
    }

    // ✅ COMPLETENESS CHECK: Require fields when submitting for review
    if (verificationStatus === 'pending') {
      const requiredFields = ['headline', 'workDescription', 'skills', 'serviceAreas'];
      for (const field of requiredFields) {
        if (
          req.body[field] === undefined ||
          (Array.isArray(req.body[field]) && req.body[field].length === 0) ||
          (typeof req.body[field] === 'string' && !req.body[field].trim())
        ) {
          return res.status(400).json({
            message: `Missing required field for submission: ${field}`
          });
        }
      }
    }

    const update = {};

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

    if (fixedRateProjects !== undefined) {
      if (!Array.isArray(fixedRateProjects)) {
        return res.status(400).json({ message: "Fixed rate projects must be an array" });
      }
      const validatedProjects = [];
      for (const proj of fixedRateProjects) {
        if (!proj.name || !proj.details || proj.rate == null) continue;
        validatedProjects.push({
          name: proj.name.trim(),
          details: proj.details.trim(),
          rate: Number(proj.rate) >= 0 ? Number(proj.rate) : 0
        });
      }
      update['providerDetails.fixedRateProjects'] = validatedProjects;
    }

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

    if (availabilityStatus !== undefined) {
      if (!['available', 'busy', 'offline'].includes(availabilityStatus)) {
        return res.status(400).json({ message: "Invalid availability status" });
      }
      update['providerDetails.availabilityStatus'] = availabilityStatus;
    }

    if (verificationStatus === 'pending') {
      update['providerDetails.verificationStatus'] = 'pending';
      update['providerDetails.submittedAt'] = new Date();
    } else if (verificationStatus === 'incomplete') {
      update['providerDetails.verificationStatus'] = 'incomplete';
      update['providerDetails.submittedAt'] = undefined;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found after update" });
    }

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

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Build response (same as in updateUser)
    const response = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      bio: user.bio,
      kycVerified: user.kycVerified,
      location: user.location?.coordinates ? {
        type: 'Point',
        coordinates: user.location.coordinates,
        address: user.location.address
      } : undefined,
    };

    if (user.role === 'provider') {
      response.providerDetails = {
        headline: user.providerDetails?.headline,
        workDescription: user.providerDetails?.workDescription,
        skills: user.providerDetails?.skills || [],
        rate: user.providerDetails?.rate,
        minCallOutFee: user.providerDetails?.minCallOutFee,
        travelFeePerKm: user.providerDetails?.travelFeePerKm,
        travelThresholdKm: user.providerDetails?.travelThresholdKm,
        fixedRateProjects: user.providerDetails?.fixedRateProjects || [],
        availabilityStatus: user.providerDetails?.availabilityStatus,
        portfolios: user.providerDetails?.portfolios || [],
        serviceAreas: user.providerDetails?.serviceAreas || [],
        experienceYears: user.providerDetails?.experienceYears,
        verificationStatus: user.providerDetails?.verificationStatus || "incomplete",
        isVerified: user.providerDetails?.isVerified,
      };
    }

    if (user.role === 'customer') {
      response.customerPreferences = {
        favoriteProviders: user.customerPreferences?.favoriteProviders,
        preferredCategories: user.customerPreferences?.preferredCategories,
      };
    }

    res.json({ user: response });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};


// @desc    Get public list of verified providers
// @route   GET /api/users/providers
// @access  Public
exports.getPublicProviders = async (req, res) => {
  try {
    const providers = await User.find({
      role: "provider",
      "providerDetails.isVerified": true,
      "providerDetails.isProfilePublic": true,
      isActive: true,
      deletedAt: { $exists: false }
    })
      .select('fullName avatar providerDetails ratings')
      .limit(50); // Adjust as needed

    // In getPublicProviders
    const formatted = providers.map(user => ({
      id: user._id.toString(),
      name: user.fullName,
      avatar: user.avatar || "/placeholder.svg",
      // 👇 HEADLINE goes here (as the prominent subheading)
      headline: user.providerDetails?.headline || "Professional service provider",
      // 👇 First skill for filtering/search, but NOT displayed prominently
      primarySkill: user.providerDetails?.skills?.[0]?.name || "General Service",
      experience: user.providerDetails?.experienceYears || 0,
      rating: user.ratings?.average || 0,
      reviewsCount: user.ratings?.count || 0,
      // Optional: full bio or workDescription if needed later
      bio: user.providerDetails?.workDescription || ""
    }));

    res.json({ providers: formatted });
  } catch (error) {
    console.error("Fetch providers error:", error);
    res.status(500).json({ message: "Failed to fetch providers" });
  }
};