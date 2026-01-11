const User = require("../models/user.model");

// Get pending providers
exports.getPendingProviders = async (req, res) => {
  try {
    const providers = await User.find({
      "providerDetails.verificationStatus": "pending",
      role: "provider", // optional but safe
    })
      .select("-password -emailVerificationToken -passwordResetToken")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    console.error("Error fetching pending providers:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Approve or reject
exports.updateProviderVerification = async (req, res) => {
  const { userId } = req.params;
  const { action, rejectionReason } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ success: false, message: "Invalid action" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role !== "provider") {
      return res.status(400).json({ success: false, message: "User is not a provider" });
    }

    const currentStatus = user.providerDetails?.verificationStatus;
    if (!["pending"].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action} a provider with status: ${currentStatus}`,
      });
    }

    // Update based on action
    if (action === "approve") {
      user.providerDetails.verificationStatus = "approved";
      user.providerDetails.isVerified = true; // Optional: mark as verified
      user.providerDetails.submittedAt = undefined; // Optional cleanup
      user.providerDetails.rejectionReason = undefined;
    } else if (action === "reject") {
      user.providerDetails.verificationStatus = "rejected";
      user.providerDetails.isVerified = false;
      user.providerDetails.rejectionReason = rejectionReason || "Application did not meet requirements.";
    }

    await user.save();

    // Optionally: send email, log audit, etc.

    return res.status(200).json({
      success: true,
      message: `Provider ${action}ed successfully`,
      data: {
        id: user._id,
        verificationStatus: user.providerDetails.verificationStatus,
      },
    });
  } catch (error) {
    console.error("Error updating provider status:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};