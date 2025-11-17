// controllers/authController.js
const User = require("../models/user.model"); // Adjust path as needed
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
require("dotenv").config();

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // Use 'secure' in production (HTTPS)
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
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
    const userWithPassword = await User.findOne({ email: normalizedEmail });
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

    // Set token in HTTP-only cookie
    res.cookie("token", token, cookieOptions);

    // Send success response (password was already excluded in the token payload query)
    res.json({
      message: "Login successful",
      user: {
        id: userWithPassword._id,
        fullName: userWithPassword.fullName,
        email: userWithPassword.email,
        role: userWithPassword.role,
        phone: userWithPassword.phone,
        isActive: userWithPassword.isActive,
        // Include provider details in response if the user is a provider
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
