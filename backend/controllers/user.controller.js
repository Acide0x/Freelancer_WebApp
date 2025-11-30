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


// @desc    Update user profile (authenticated users only)
// @route   PATCH /api/auth/profile
// @access  Private
exports.updateUser = async (req, res) => {
  const { 
    fullName, 
    email, 
    phone, 
    location, 
    avatar, 
    providerDetails, 
    customerPreferences 
  } = req.body;

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const updates = {};

    // --- Basic fields ---
    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2) {
        return res.status(400).json({ message: "Full name must be a string with at least 2 characters." });
      }
      updates.fullName = fullName.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!validator.isEmail(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ message: "Email already in use." });
      }
      updates.email = normalizedEmail;
    }

    if (phone !== undefined) {
      updates.phone = typeof phone === 'string' ? phone.trim() || undefined : undefined;
    }

    if (avatar !== undefined) {
      if (typeof avatar !== 'string') {
        return res.status(400).json({ message: "Avatar must be a URL string." });
      }
      updates.avatar = avatar.trim();
    }

    // --- Location (GeoJSON) ---
    if (location !== undefined) {
      // Only allow full update of location object to maintain schema integrity
      if (
        !location ||
        location.type !== 'Point' ||
        !Array.isArray(location.coordinates) ||
        location.coordinates.length !== 2 ||
        typeof location.coordinates[0] !== 'number' ||
        typeof location.coordinates[1] !== 'number'
      ) {
        return res.status(400).json({
          message: "Invalid location. Must be { type: 'Point', coordinates: [lng, lat], address?: string }"
        });
      }
      updates.location = {
        type: 'Point',
        coordinates: location.coordinates,
        address: typeof location.address === 'string' ? location.address.trim() : undefined
      };
    }

    // --- Provider details (role-restricted) ---
    if (providerDetails !== undefined) {
      const user = await User.findById(userId).select('role');
      if (!user || user.role !== 'provider') {
        return res.status(403).json({ message: "Only providers can update provider details." });
      }

      const allowedProviderFields = ['bio', 'skills', 'hourlyRate', 'experienceYears'];
      const sanitized = {};

      if (providerDetails.bio !== undefined) {
        if (typeof providerDetails.bio !== 'string') return res.status(400).json({ message: "Bio must be a string." });
        sanitized.bio = providerDetails.bio.trim();
      }

      if (providerDetails.skills !== undefined) {
        if (!Array.isArray(providerDetails.skills)) return res.status(400).json({ message: "Skills must be an array." });
        sanitized.skills = providerDetails.skills.map(s => s.trim()).filter(s => s);
      }

      if (providerDetails.hourlyRate !== undefined) {
        if (typeof providerDetails.hourlyRate !== 'number' || providerDetails.hourlyRate < 0) {
          return res.status(400).json({ message: "Hourly rate must be a non-negative number." });
        }
        sanitized.hourlyRate = providerDetails.hourlyRate;
      }

      if (providerDetails.experienceYears !== undefined) {
        if (!Number.isInteger(providerDetails.experienceYears) || providerDetails.experienceYears < 0) {
          return res.status(400).json({ message: "Experience years must be a non-negative integer." });
        }
        sanitized.experienceYears = providerDetails.experienceYears;
      }

      // IMPORTANT: Do NOT allow updating isVerified, kycVerified, certifications, portfolio, serviceAreas here
      updates['providerDetails'] = sanitized;
    }

    // --- Customer preferences (role-restricted) ---
    if (customerPreferences !== undefined) {
      const user = await User.findById(userId).select('role');
      if (!user || user.role !== 'customer') {
        return res.status(403).json({ message: "Only customers can update customer preferences." });
      }

      const pref = {};
      if (customerPreferences.preferredCategories !== undefined) {
        if (!Array.isArray(customerPreferences.preferredCategories)) {
          return res.status(400).json({ message: "Preferred categories must be an array of strings." });
        }
        pref.preferredCategories = customerPreferences.preferredCategories
          .map(c => c.trim())
          .filter(c => c);
      }

      if (customerPreferences.favoriteProviders !== undefined) {
        if (!Array.isArray(customerPreferences.favoriteProviders)) {
          return res.status(400).json({ message: "Favorite providers must be an array of user IDs." });
        }
        // Validate ObjectId format
        const invalidId = customerPreferences.favoriteProviders.find(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidId) {
          return res.status(400).json({ message: "Invalid provider ID in favoriteProviders." });
        }
        pref.favoriteProviders = customerPreferences.favoriteProviders.map(id => new mongoose.Types.ObjectId(id));
      }

      updates.customerPreferences = pref;
    }

    // Prevent modification of protected fields
    const protectedFields = [
      'password', 'role', 'isActive', 'isSuspended', 'isEmailVerified',
      'providerDetails.isVerified', 'providerDetails.kycVerified',
      'providerDetails.certifications', 'providerDetails.portfolio', 'providerDetails.serviceAreas',
      'ratings', 'reviews', 'adminNotes'
    ];

    // Check if any protected field is accidentally included
    const updateKeys = Object.keys(req.body);
    for (const key of updateKeys) {
      if (protectedFields.includes(key) || key.startsWith('providerDetails.isVerified') || key.startsWith('ratings') || key === 'role') {
        return res.status(403).json({ message: `Cannot update protected field: ${key}` });
      }
    }

    // Perform update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
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
        // Excluded: isVerified, kycVerified, certifications, portfolio, serviceAreas
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