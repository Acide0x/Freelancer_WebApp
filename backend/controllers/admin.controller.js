// controllers/adminController.js
const User = require("../models/user.model");

// @desc    Get all pending providers
// @route   GET /api/admin/providers/pending
// @access  Private (Admin only)
exports.getPendingProviders = async (req, res) => {
  try {
    const providers = await User.find({
      role: "provider",
      "providerDetails.verificationStatus": "pending"
    })
      .select("-password -emailVerificationToken -passwordResetToken")
      .sort({ "providerDetails.submittedAt": -1 });

    return res.status(200).json({
      success: true,
      count: providers.length,
      data: providers, // ✅ Fixed: added "data" property
    });
  } catch (error) {
    console.error("Error fetching pending providers:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error while fetching provider applications" 
    });
  }
};

// @desc    Approve or reject a provider application
// @route   PATCH /api/admin/providers/:userId/verify
// @access  Private (Admin only)
exports.updateProviderVerification = async (req, res) => {
  const { userId } = req.params;
  const { action, rejectionReason } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid action. Use 'approve' or 'reject'." 
    });
  }

  if (action === "reject") {
    if (!rejectionReason || typeof rejectionReason !== "string" || rejectionReason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required and must be at least 10 characters."
      });
    }
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (user.role !== "provider") {
      return res.status(400).json({ 
        success: false, 
        message: "User is not a provider" 
      });
    }

    if (!user.providerDetails) {
      return res.status(400).json({ 
        success: false, 
        message: "Provider details not initialized" 
      });
    }

    const currentStatus = user.providerDetails.verificationStatus;
    if (currentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action} provider with status: ${currentStatus}. Only 'pending' applications can be reviewed.`
      });
    }

    if (action === "approve") {
      user.providerDetails.verificationStatus = "approved";
      user.providerDetails.isVerified = true;
      user.providerDetails.submittedAt = undefined;
      user.providerDetails.rejectionReason = undefined;
    } else if (action === "reject") {
      user.providerDetails.verificationStatus = "rejected";
      user.providerDetails.isVerified = false;
      user.providerDetails.rejectionReason = rejectionReason.trim();
    }

    await user.save();

    if (req.user) {
      console.log(`Admin ${req.user.id} ${action}d provider ${userId}`);
    }

    return res.status(200).json({
      success: true,
      message: `Provider ${action}ed successfully`,
      data: { // ✅ Fixed: added "data" property
        id: user._id,
        verificationStatus: user.providerDetails.verificationStatus,
        ...(action === "reject" && { 
          rejection_reason: user.providerDetails.rejectionReason 
        })
      },
    });

  } catch (error) {
    console.error("Error updating provider verification status:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed during update",
        details: messages
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate value detected in provider data"
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: "Server error during verification update" 
    });
  }
};