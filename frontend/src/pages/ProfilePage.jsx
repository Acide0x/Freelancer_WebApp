"use client";

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Edit2, X, Check, Eye, EyeOff, Upload, Loader2 } from "lucide-react";
import api from "@/api/api"


// Helper to safely get user from localStorage
const getUserFromStorage = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
        try {
            const parsed = JSON.parse(userStr);
            const isProvider = parsed.role === 'provider';
            return {
                ...parsed,
                _id: parsed.id || parsed._id,
                name: parsed.fullName || parsed.name || "",
                email: parsed.email || "",
                phone: parsed.phone || "",
                bio: isProvider
                    ? (parsed.providerDetails?.bio || "No bio yet.")
                    : (parsed.bio || "No bio yet."),
                location: parsed.location?.address || parsed.location || "Not specified",
                joinDate: parsed.createdAt
                    ? new Date(parsed.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                    })
                    : "Unknown",
                avatar: parsed.avatar || "/placeholder.svg",
            };
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            toast.error("Session corrupted. Please log in again.");
        }
    }
    return null;
};

export default function ProfilePage() {
    const navigate = useNavigate();
    const initialUser = getUserFromStorage();

    if (!initialUser) {
        toast.error("Please log in to view your profile.");
        navigate("/login", { replace: true });
        return null;
    }

    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState(initialUser);
    const [formData, setFormData] = useState({ ...initialUser });
    const [isSaving, setIsSaving] = useState(false);

    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [passwordError, setPasswordError] = useState("");

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData((prev) => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);

        const payload = {};
        if (formData.name !== profile.name) payload.fullName = formData.name;
        if (formData.email !== profile.email) payload.email = formData.email;
        if (formData.phone !== profile.phone) payload.phone = formData.phone;
        if (formData.location !== profile.location) payload.location = formData.location;
        if (formData.avatar !== profile.avatar) payload.avatar = formData.avatar;

        // Handle bio based on role
        if (initialUser.role === "provider") {
            const currentBio = profile.bio || "";
            if (formData.bio !== currentBio) {
                payload.providerDetails = { bio: formData.bio };
            }
        } else {
            if (formData.bio !== profile.bio) {
                payload.bio = formData.bio;
            }
        }

        try {
            // ✅ Use your api client (Axios)
            const response = await api.patch("/users/profile", payload);
            const data = response.data; // Axios stores response body in .data

            // Reconstruct profile with normalized fields
            const updatedProfile = {
                ...data.user,
                name: data.user.fullName,
                bio: initialUser.role === "provider"
                    ? (data.user.providerDetails?.bio || "No bio yet.")
                    : (data.user.bio || "No bio yet."),
                location: data.user.location?.address || data.user.location || "Not specified",
            };

            setProfile(updatedProfile);
            setFormData(updatedProfile);
            setIsEditing(false);
            localStorage.setItem("user", JSON.stringify(data.user));

            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Profile update error:", error);
            const message =
                error.response?.data?.message ||
                error.message ||
                "Failed to update profile. Please try again.";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData(profile);
        setIsEditing(false);
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
        setPasswordError("");
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError("");

        const { oldPassword, newPassword, confirmPassword } = passwordForm;

        if (!oldPassword) {
            setPasswordError("Please enter your old password");
            toast.error("Please enter your old password");
            return;
        }
        if (!newPassword) {
            setPasswordError("Please enter a new password");
            toast.error("Please enter a new password");
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError("New password must be at least 8 characters");
            toast.error("New password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match");
            toast.error("New passwords do not match");
            return;
        }
        if (oldPassword === newPassword) {
            setPasswordError("New password must be different from old password");
            toast.error("New password must be different from old password");
            return;
        }

        try {
            await api.patch("/api/users/change-password", {
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
            });
            toast.success("Password updated successfully!");
            setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
            setShowPasswordSection(false);
        } catch (error) {
            const message =
                error.response?.data?.message ||
                "Failed to update password. Please try again.";
            toast.error(message);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-green-50/30">
            <div className="max-w-3xl mx-auto p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                        <Link
                            to="/"
                            className="mt-1 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            ← Back to Home
                        </Link>
                    </div>
                    {!isEditing ? (
                        <Button
                            onClick={() => {
                                setFormData(profile);
                                setIsEditing(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit Profile
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSave}
                                size="sm"
                                disabled={isSaving}
                                className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                {isSaving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                                onClick={handleCancel}
                                variant="outline"
                                size="sm"
                                className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>

                {/* Profile Card */}
                <Card className="p-6 sm:p-8 mb-6 border border-blue-200/60 shadow-lg">
                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                        <div className="relative">
                            <Avatar className="w-24 h-24">
                                <AvatarImage
                                    src={isEditing ? formData.avatar : profile.avatar}
                                    alt={profile.name}
                                />
                                <AvatarFallback className="bg-blue-100 text-blue-800">
                                    {profile.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            {isEditing && (
                                <label className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full p-2 cursor-pointer shadow-md hover:shadow-lg transition-shadow">
                                    <Upload className="w-4 h-4" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                        <div className="flex-1 w-full">
                            {isEditing ? (
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="mb-2 text-lg font-bold border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                    placeholder="Full name"
                                />
                            ) : (
                                <h2 className="text-2xl font-bold mb-2 text-gray-900">
                                    {profile.name}
                                </h2>
                            )}
                            {isEditing ? (
                                <Input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="text-gray-600 border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                    placeholder="Email address"
                                />
                            ) : (
                                <p className="text-gray-600">{profile.email}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-800">
                                Phone Number
                            </label>
                            {isEditing ? (
                                <Input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="Your phone number"
                                    className="border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{profile.phone || "—"}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-800">
                                Location
                            </label>
                            {isEditing ? (
                                <Input
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="Your location"
                                    className="border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                />
                            ) : (
                                <p className="text-gray-900">{profile.location}</p>
                            )}
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-semibold mb-2 text-gray-800">
                            Bio
                        </label>
                        {isEditing ? (
                            <Textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                placeholder="Tell us about yourself"
                                className="min-h-24 border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                            />
                        ) : (
                            <p className="text-gray-900">{profile.bio}</p>
                        )}
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        <p className="text-sm text-gray-500">
                            Member since {profile.joinDate}
                        </p>
                    </div>
                </Card>

                {/* Password Section */}
                <Card className="p-6 sm:p-8 border border-blue-200/60 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            Password & Security
                        </h2>
                        <Button
                            onClick={() => {
                                setShowPasswordSection(!showPasswordSection);
                                setPasswordError("");
                            }}
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                            {showPasswordSection ? "Hide" : "Update Password"}
                        </Button>
                    </div>

                    {showPasswordSection && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-800">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showOldPassword ? "text" : "password"}
                                        name="oldPassword"
                                        value={passwordForm.oldPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter your current password"
                                        className="pr-10 border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOldPassword(!showOldPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showOldPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-800">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showNewPassword ? "text" : "password"}
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter your new password"
                                        className="pr-10 border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-800">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirm your new password"
                                        className="pr-10 border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(!showConfirmPassword)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {passwordError && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                                    {passwordError}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button
                                    type="submit"
                                    className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white w-full sm:w-auto"
                                >
                                    <Check className="w-4 h-4" />
                                    Update Password
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowPasswordSection(false)}
                                    className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </Button>
                            </div>

                            <div className="text-center">
                                <a
                                    href="#"
                                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toast.info("Password reset link will be sent to your email.");
                                    }}
                                >
                                    Forgot your password?
                                </a>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </main>
    );
}