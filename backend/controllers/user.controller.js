// controllers/authController.js
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const geocodeLocation = require("../utils/geocode");
const mongoose = require("mongoose");

require("dotenv").config();

// ============================================================================
// COOKIE & RATE LIMIT CONFIG
// ============================================================================

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { message: "Too many signups from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.signupLimiter = signupLimiter;
exports.loginLimiter = loginLimiter;

// ============================================================================
// HELPER: Format provider for frontend (list view)
// ============================================================================

const formatProviderForList = (user) => {
  const pd = user.providerDetails || {};
  const ratings = user.ratings || {};
  const loc = user.location || {};

  return {
    id: user._id?.toString() || null,
    name: user.fullName || 'Anonymous',
    avatar: user.avatar || "/placeholder.svg",
    headline: pd.headline || "Professional service provider",
    primarySkill: pd.skills?.[0]?.name || pd.skills?.[0] || "General Service",
    experience: Number(pd.experienceYears) || 0,
    rating: Number(ratings.average) || 0,
    reviewsCount: Number(ratings.count) || 0,
    rate: pd.rate !== undefined && pd.rate !== null ? Number(pd.rate) : null,
    availabilityStatus: pd.availabilityStatus || "offline",
    isVerified: !!pd.isVerified,
    location: loc.address || loc.city || null,
    bio: user.bio || pd.workDescription || "",
    // Add minimal safety for future fields
    isProfilePublic: pd.isProfilePublic !== false,
    verificationStatus: pd.verificationStatus || 'unverified',
  };
};

// ============================================================================
// HELPER: Format provider for frontend (detail/profile view)
// ============================================================================

// ============================================================================
// HELPER: Format provider for frontend (detail/profile view) - NULL-SAFE
// ============================================================================

const formatProviderProfile = (user, isOwner = false) => {
  // Safe getter helper for nested paths
  const get = (obj, path, defaultValue = null) => {
    try {
      const value = path.split('.').reduce((o, key) => o?.[key], obj);
      return value ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const pd = user.providerDetails || {};
  const loc = user.location || {};

  // Transform portfolios safely
  const portfolio = Array.isArray(pd.portfolios)
    ? pd.portfolios.map((item) => ({
      _id: item?._id || null,
      title: item?.title || '',
      image: item?.images?.[0] || "/placeholder.svg",
      images: Array.isArray(item?.images) ? item.images.slice(0, 10) : [],
      description: item?.description || '',
      url: item?.url || null,
      createdAt: item?.createdAt || null,
    }))
    : [];

  // Transform skills safely (handle both string and object formats)
  const skills = Array.isArray(pd.skills)
    ? pd.skills.map(skill => {
      if (typeof skill === 'string') {
        return { name: skill, proficiency: 'intermediate', years: null };
      }
      return {
        name: skill?.name || '',
        proficiency: skill?.proficiency || 'intermediate',
        years: skill?.years || null,
      };
    })
    : [];

  // Transform service areas safely
  const serviceAreas = Array.isArray(pd.serviceAreas)
    ? pd.serviceAreas.map(area => ({
      city: area?.city || area?.address || '',
      radius: Number(area?.radius) || Number(area?.radiusKm) || 5,
      coordinates: area?.coordinates || null,
    }))
    : [];

  // Build ratings object with full distribution fallback
  const ratings = user.ratings || {};
  const distribution = ratings.distribution || {};

  return {
    // Core identity
    _id: user._id?.toString() || null,
    fullName: get(user, 'fullName', 'Anonymous'),
    email: isOwner ? get(user, 'email', null) : undefined,
    phone: isOwner ? get(user, 'phone', null) : undefined,
    avatar: get(user, 'avatar', '/placeholder.svg'),
    bio: get(user, 'bio', ''),
    role: get(user, 'role', 'provider'),
    kycVerified: !!get(user, 'kycVerified', false),

    // Location
    location: {
      address: loc.address || null,
      city: loc.city || null,
      state: loc.state || null,
      country: loc.country || 'Nepal',
      coordinates: Array.isArray(loc.coordinates)
        ? loc.coordinates.slice(0, 2)
        : null,
    },

    // Provider details
    providerDetails: {
      headline: pd.headline || 'Professional service provider',
      workDescription: pd.workDescription || '',
      skills,
      certifications: Array.isArray(pd.certifications) ? pd.certifications : [],
      rate: pd.rate !== undefined && pd.rate !== null ? Number(pd.rate) : null,
      experienceYears: Number(pd.experienceYears) || 0,
      availabilityStatus: pd.availabilityStatus || 'unknown',
      isVerified: !!pd.isVerified,
      isProfilePublic: pd.isProfilePublic !== false,
      verificationStatus: pd.verificationStatus || 'unverified',
      profileCompletion: Number(pd.profileCompletion) || 0,
      portfolios: portfolio,
      serviceAreas,
      // Legacy fields for backward compatibility
      minCallOutFee: pd.minCallOutFee !== undefined ? Number(pd.minCallOutFee) : null,
      travelFeePerKm: pd.travelFeePerKm !== undefined ? Number(pd.travelFeePerKm) : null,
      travelThresholdKm: pd.travelThresholdKm !== undefined ? Number(pd.travelThresholdKm) : null,
      fixedRateProjects: Array.isArray(pd.fixedRateProjects) ? pd.fixedRateProjects : [],
    },

    // Ratings & reviews
    ratings: {
      average: Number(ratings.average) || 0,
      count: Number(ratings.count) || 0,
      distribution: {
        "5": Number(distribution["5"]) || 0,
        "4": Number(distribution["4"]) || 0,
        "3": Number(distribution["3"]) || 0,
        "2": Number(distribution["2"]) || 0,
        "1": Number(distribution["1"]) || 0,
      },
    },

    reviews: Array.isArray(user.reviews)
      ? user.reviews.map(r => ({
        id: r?._id?.toString() || r?.id || null,
        clientName: r?.reviewerName || r?.clientName || 'Anonymous',
        rating: Number(r?.rating) || 0,
        comment: r?.comment || '',
        date: r?.date || null,
      }))
      : [],

    // Metadata
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || user.createdAt || null,
    lastLoginAt: user.lastLoginAt || null,
    isActive: !!user.isActive,
  };
};
// ============================================================================
// AUTH: SIGNUP
// ============================================================================

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
        message: "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
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

// ============================================================================
// AUTH: LOGIN
// ============================================================================

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
        headline: userWithPassword.providerDetails?.headline,
        skills: userWithPassword.providerDetails?.skills,
        rate: userWithPassword.providerDetails?.rate,
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

// ============================================================================
// AUTH: LOGOUT
// ============================================================================

exports.logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out successfully" });
};

// ============================================================================
// AUTH: UPDATE USER PROFILE
// ============================================================================

exports.updateUser = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const updateObj = {};
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
      } else {
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
      bio: updatedUser.bio,
      location: updatedUser.location?.coordinates ? {
        type: 'Point',
        coordinates: updatedUser.location.coordinates,
        address: updatedUser.location.address
      } : undefined,
    };

    if (updatedUser.role === 'provider') {
      response.providerDetails = {
        headline: updatedUser.providerDetails?.headline,
        workDescription: updatedUser.providerDetails?.workDescription,
        skills: updatedUser.providerDetails?.skills,
        rate: updatedUser.providerDetails?.rate,
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

// ============================================================================
// AUTH: CHANGE PASSWORD
// ============================================================================

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
      message: "New password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
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

// ============================================================================
// AUTH: UPDATE PROVIDER ONBOARDING
// ============================================================================

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

    if (verificationStatus && !['incomplete', 'pending'].includes(verificationStatus)) {
      return res.status(400).json({ message: "Invalid verification status" });
    }

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

// ============================================================================
// AUTH: GET CURRENT USER PROFILE
// ============================================================================

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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

// ============================================================================
// PUBLIC: GET LIST OF PROVIDERS (FOR WORKERS PAGE)
// ============================================================================

exports.getPublicProviders = async (req, res) => {
  try {
    const {
      skills,
      minRating,
      maxRating,
      minRate,
      maxRate,
      availability,
      isVerified,
      location,
      radius,
      search,
      sortBy,
      order,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      role: "provider",
      isActive: true,
      isSuspended: { $ne: true },
      deletedAt: { $exists: false },
      "providerDetails.isProfilePublic": { $ne: false },
    };

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { fullName: searchRegex },
        { "providerDetails.headline": searchRegex },
        { "providerDetails.skills.name": searchRegex },
        { bio: searchRegex },
        { "providerDetails.workDescription": searchRegex },
      ];
    }

    // Skills filter
    if (skills) {
      const skillArray = Array.isArray(skills) ? skills : skills.split(",");
      query["providerDetails.skills.name"] = {
        $in: skillArray.map((s) => new RegExp(`^${s.trim()}$`, "i"))
      };
    }

    // Rating filter
    if (minRating || maxRating) {
      query["ratings.average"] = {};
      if (minRating) query["ratings.average"].$gte = parseFloat(minRating);
      if (maxRating) query["ratings.average"].$lte = parseFloat(maxRating);
    }

    // Rate filter
    if (minRate || maxRate) {
      query["providerDetails.rate"] = {};
      if (minRate) query["providerDetails.rate"].$gte = parseFloat(minRate);
      if (maxRate) query["providerDetails.rate"].$lte = parseFloat(maxRate);
    }

    // Availability filter
    if (availability) {
      const availabilityArray = Array.isArray(availability) ? availability : availability.split(",");
      query["providerDetails.availabilityStatus"] = { $in: availabilityArray };
    }

    // Verified filter
    if (isVerified !== undefined) {
      query["providerDetails.isVerified"] = isVerified === "true";
    }

    // Location filter (geospatial)
    if (location && radius) {
      const [lng, lat] = location.split(",").map((c) => parseFloat(c.trim()));
      if (!isNaN(lng) && !isNaN(lat) && radius > 0) {
        query["location.coordinates"] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], parseFloat(radius) / 6371],
          },
        };
      }
    }

    // Sorting
    const sortOptions = {};
    const validSortFields = {
      rating: "ratings.average",
      reviewsCount: "ratings.count",
      rate: "providerDetails.rate",
      experienceYears: "providerDetails.experienceYears",
      createdAt: "createdAt",
      lastLoginAt: "lastLoginAt",
      name: "fullName",
    };
    const sortField = validSortFields[sortBy] || "ratings.average";
    sortOptions[sortField] = order?.toLowerCase() === "asc" ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Field selection for list view
    const selectFields = `
      fullName avatar phone role 
      providerDetails.headline providerDetails.skills providerDetails.rate 
      providerDetails.availabilityStatus providerDetails.isVerified 
      providerDetails.experienceYears location 
      ratings bio
    `.trim().split(/\s+/).join(" ");

    // Execute query
    const [providers, total] = await Promise.all([
      User.find(query)
        .select(selectFields)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    const formatted = providers.map(formatProviderForList);

    res.status(200).json({
      success: true,
      data: {
        providers: formatted,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalResults: total,
          resultsPerPage: limitNum,
          hasNextPage: pageNum * limitNum < total,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching providers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch providers",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============================================================================
// PUBLIC: GET SINGLE PROVIDER BY ID (FOR PROVIDER PROFILE PAGE)
// ============================================================================

// controllers/user.controller.js


exports.getProviderById = async (req, res) => {
  console.log(`🔍 [DEBUG] GET /users/providers/:id called with ID: "${req.params.id}"`);

  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    // 🔴 Validate ID presence & format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.warn(`⚠️ Invalid or missing provider ID: "${id}"`);
      return res.status(400).json({
        success: false,
        message: "Valid provider ID is required",
        errorCode: "INVALID_ID"
      });
    }

    const providerObjectId = new mongoose.Types.ObjectId(id);

    // 🔍 Bulletproof aggregation pipeline
    const pipeline = [
      // 1️⃣ Match provider with safety filters
      {
        $match: {
          _id: providerObjectId,
          role: "provider",
          isActive: true,
          isSuspended: { $ne: true },
          deletedAt: { $exists: false }
        }
      },

      // 2️⃣ Ensure providerDetails exists as empty object if missing
      {
        $addFields: {
          providerDetails: { $ifNull: ["$providerDetails", {}] }
        }
      },

      // 3️⃣ Safe $lookup for reviewers (handles empty reviews array)
      {
        $lookup: {
          from: "users",
          let: {
            reviewerIds: {
              $cond: [
                { $isArray: "$reviews.reviewerId" },
                "$reviews.reviewerId",
                { $cond: [{ $eq: ["$reviews.reviewerId", null] }, [], ["$reviews.reviewerId"]] }
              ]
            }
          },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$reviewerIds"] } } },
            { $project: { _id: 1, fullName: 1, avatar: 1 } }
          ],
          as: "reviewers"
        }
      },

      // 4️⃣ Map reviews with full null-safety
      {
        $addFields: {
          reviews: {
            $map: {
              input: { $ifNull: ["$reviews", []] },
              as: "review",
              in: {
                _id: { $ifNull: ["$$review._id", null] },
                reviewerId: { $ifNull: ["$$review.reviewerId", null] },
                reviewerName: {
                  $let: {
                    vars: {
                      idx: { $indexOfArray: ["$reviewers._id", "$$review.reviewerId"] }
                    },
                    in: {
                      $cond: [
                        {
                          $and: [
                            { $gte: ["$$idx", 0] },
                            { $lt: ["$$idx", { $size: { $ifNull: ["$reviewers._id", []] } }] }]
                        },
                        { $ifNull: [{ $arrayElemAt: ["$reviewers.fullName", "$$idx"] }, "Anonymous"] },
                        "Anonymous"
                      ]
                    }
                  }
                },
                reviewerAvatar: {
                  $let: {
                    vars: {
                      idx: { $indexOfArray: ["$reviewers._id", "$$review.reviewerId"] }
                    },
                    in: {
                      $cond: [
                        {
                          $and: [
                            { $gte: ["$$idx", 0] },
                            { $lt: ["$$idx", { $size: { $ifNull: ["$reviewers._id", []] } }] }]
                        },
                        { $arrayElemAt: ["$reviewers.avatar", "$$idx"] },
                        null
                      ]
                    }
                  }
                },
                rating: { $ifNull: ["$$review.rating", 0] },
                comment: { $ifNull: ["$$review.comment", ""] },
                date: { $ifNull: ["$$review.date", "$$review._id"] },
                createdAt: { $ifNull: ["$$review.createdAt", "$$review.date"] }
              }
            }
          }
        }
      },

      // 5️⃣ Default ratings object with full distribution
      {
        $addFields: {
          ratings: {
            $ifNull: [
              "$ratings",
              {
                average: 0,
                count: 0,
                distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 }
              }
            ]
          }
        }
      },

      // 6️⃣ Normalize location to safe object
      {
        $addFields: {
          location: {
            $cond: [
              { $eq: ["$location", null] },
              { city: null, state: null, country: null, coordinates: null },
              {
                city: { $ifNull: ["$location.city", null] },
                state: { $ifNull: ["$location.state", null] },
                country: { $ifNull: ["$location.country", "Nepal"] },
                coordinates: {
                  $cond: [
                    { $isArray: "$location.coordinates" },
                    { $slice: ["$location.coordinates", 2] },
                    null
                  ]
                }
              }
            ]
          }
        }
      },

      // 7️⃣ Normalize providerDetails subfields with defaults
      {
        $addFields: {
          "providerDetails.skills": {
            $ifNull: [
              "$providerDetails.skills",
              []
            ]
          },
          "providerDetails.certifications": {
            $ifNull: [
              "$providerDetails.certifications",
              []
            ]
          },
          "providerDetails.portfolios": {
            $ifNull: [
              "$providerDetails.portfolios",
              []
            ]
          },
          "providerDetails.serviceAreas": {
            $ifNull: [
              "$providerDetails.serviceAreas",
              []
            ]
          },
          "providerDetails.headline": { $ifNull: ["$providerDetails.headline", ""] },
          "providerDetails.workDescription": { $ifNull: ["$providerDetails.workDescription", ""] },
          "providerDetails.rate": { $ifNull: ["$providerDetails.rate", null] },
          "providerDetails.experienceYears": { $ifNull: ["$providerDetails.experienceYears", 0] },
          "providerDetails.availabilityStatus": { $ifNull: ["$providerDetails.availabilityStatus", "unknown"] },
          "providerDetails.isVerified": { $ifNull: ["$providerDetails.isVerified", false] },
          "providerDetails.isProfilePublic": { $ifNull: ["$providerDetails.isProfilePublic", true] },
          "providerDetails.verificationStatus": { $ifNull: ["$providerDetails.verificationStatus", "unverified"] },
          "providerDetails.profileCompletion": { $ifNull: ["$providerDetails.profileCompletion", 0] }
        }
      },

      // 8️⃣ Final projection - explicit but safe
      {
        $project: {
          // Core user fields
          fullName: { $ifNull: ["$fullName", "Anonymous"] },
          email: 1,
          phone: { $ifNull: ["$phone", null] },
          avatar: { $ifNull: ["$avatar", null] },
          bio: { $ifNull: ["$bio", ""] },
          role: 1,
          kycVerified: { $ifNull: ["$kycVerified", false] },
          location: 1,

          // Provider details
          providerDetails: 1,

          // Ratings & reviews
          ratings: 1,
          reviews: 1,

          // Metadata
          createdAt: 1,
          updatedAt: 1,
          isActive: 1
        }
      }
    ];

    console.log(`🔍 [DEBUG] Running aggregation for ID: ${id}`);
    const [provider] = await User.aggregate(pipeline);

    // 🔴 Handle not found
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found or profile is unavailable",
        errorCode: "PROVIDER_NOT_FOUND"
      });
    }

    // 👁️ Visibility logic
    const isOwner = currentUserId && currentUserId.toString() === id.toString();

    const isProfilePublic = provider.providerDetails?.isProfilePublic !== false;

    if (!isProfilePublic && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "This profile is not publicly visible",
        errorCode: "PROFILE_NOT_PUBLIC"
      });
    }

    // 🧹 Format output with maximum safety
    const formattedProvider = formatProviderProfile(provider, isOwner);

    console.log(`✅ [DEBUG] Successfully fetched provider: ${provider._id}`);

    res.status(200).json({
      success: true,
      message: "Provider fetched successfully",
      data: {
        provider: formattedProvider,
        meta: {
          isOwner,
          canContact: !!currentUserId,
          lastUpdated: provider.updatedAt || provider.createdAt
        }
      }
    });

  } catch (error) {
    // 🚨 Centralized error logging
    console.error("💥 [CRITICAL] GET /users/providers/:id crashed:", {
      timestamp: new Date().toISOString(),
      errorName: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      path: req.path,
      params: req.params,
      userId: req.user?.id,
      mongoConnection: mongoose.connection.readyState
    });

    // 🎯 User-friendly error responses
    if (error.name === "CastError" || error.message?.includes("ObjectId")) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID format",
        errorCode: "CAST_ERROR"
      });
    }

    if (error.name === "MongoServerError") {
      if (error.message.includes("Unrecognized pipeline stage")) {
        return res.status(500).json({
          success: false,
          message: "Database query error. Please contact support.",
          errorCode: "MONGO_PIPELINE_ERROR",
          ...(process.env.NODE_ENV === "development" && { debug: error.message })
        });
      }
    }

    // 🌐 Generic 500
    res.status(500).json({
      success: false,
      message: "Failed to fetch provider details. Please try again later.",
      errorCode: "SERVER_ERROR",
      ...(process.env.NODE_ENV === "development" && {
        debug: { error: error.message, name: error.name }
      })
    });
  }
};
// ============================================================================
// PUBLIC: GET PROVIDER REVIEWS (PAGINATED)
// ============================================================================

exports.getProviderReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const provider = await User.findById(id)
      .select("reviews")
      .populate({
        path: "reviews.reviewerId",
        select: "fullName avatar",
        model: "User",
      })
      .lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const reviews = provider.reviews
      ?.slice(skip, skip + limitNum)
      .map((review) => ({
        id: review._id?.toString(),
        clientName: review.reviewerId?.fullName || "Anonymous",
        clientAvatar: review.reviewerId?.avatar || "/placeholder.svg",
        rating: review.rating,
        comment: review.comment,
        date: review.date,
      })) || [];

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil((provider.reviews?.length || 0) / limitNum),
          totalReviews: provider.reviews?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching provider reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};

// ============================================================================
// PRIVATE: SUBMIT REVIEW FOR PROVIDER (CUSTOMERS ONLY)
// ============================================================================

exports.submitProviderReview = async (req, res) => {
  try {
    const { id: providerId } = req.params;
    const { rating, comment } = req.body;
    const reviewerId = req.user?.id;
    const reviewerRole = req.user?.role;

    if (!reviewerId || reviewerRole !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only authenticated customers can submit reviews",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Review comment must be at least 10 characters",
      });
    }

    const provider = await User.findOne({
      _id: providerId,
      role: "provider",
      isActive: true,
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const existingReview = provider.reviews?.find(
      (r) => r.reviewerId?.toString() === reviewerId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this provider",
      });
    }

    provider.reviews.push({
      reviewerId,
      rating: parseInt(rating),
      comment: comment.trim(),
      date: new Date(),
    });

    // Update aggregate rating
    const totalReviews = provider.reviews.length;
    const totalRating = provider.reviews.reduce((sum, r) => sum + r.rating, 0);
    provider.ratings = {
      average: parseFloat((totalRating / totalReviews).toFixed(2)),
      count: totalReviews,
    };

    await provider.save();

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: {
        review: {
          id: provider.reviews[provider.reviews.length - 1]._id.toString(),
          clientName: req.user.fullName,
          rating: parseInt(rating),
          comment: comment.trim(),
          date: new Date(),
        },
        updatedRating: provider.ratings,
      },
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit review",
    });
  }
};

