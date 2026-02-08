// src/components/MyProfile/ProfileTab.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Edit2, X, Check, Upload, Loader2, LogOut } from "lucide-react"; // ✅ LogOut imported
import api from "@/api/api";

export default function ProfileTab({ profile: initialProfile, onUpdateProfile, onLogout }) {
  const navigate = useNavigate();

  // Normalize location to ensure it's always an object with address & coordinates
  const normalizeLocation = (loc) => {
    if (!loc) return { address: "Not specified", coordinates: null };
    if (typeof loc === "string") return { address: loc, coordinates: null };
    return {
      address: loc.address || "Not specified",
      coordinates: loc.coordinates || null,
    };
  };

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    ...initialProfile,
    location: normalizeLocation(initialProfile.location),
  });

  const [formData, setFormData] = useState({
    name: initialProfile.name || initialProfile.fullName || "",
    email: initialProfile.email || "",
    phone: initialProfile.phone || "",
    bio: initialProfile.bio || (initialProfile.role === "provider"
      ? (initialProfile.providerDetails?.bio || "No bio yet.")
      : "No bio yet."),
    locationAddress: normalizeLocation(initialProfile.location).address,
    avatar: initialProfile.avatar || "/placeholder.svg",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Sync if parent updates profile
  useEffect(() => {
    const normalizedLoc = normalizeLocation(initialProfile.location);
    setProfile({
      ...initialProfile,
      location: normalizedLoc,
    });
    setFormData({
      name: initialProfile.name || initialProfile.fullName || "",
      email: initialProfile.email || "",
      phone: initialProfile.phone || "",
      bio: initialProfile.bio || (initialProfile.role === "provider"
        ? (initialProfile.providerDetails?.bio || "No bio yet.")
        : "No bio yet."),
      locationAddress: normalizedLoc.address,
      avatar: initialProfile.avatar || "/placeholder.svg",
    });
  }, [initialProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file (JPEG, PNG, etc.)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const cloudinaryUrl = response.data.url;
      setFormData((prev) => ({ ...prev, avatar: cloudinaryUrl }));
      toast.success("Avatar uploaded!");
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast.error(error.response?.data?.message || "Failed to upload avatar");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    const payload = {};

    // Basic fields
    if (formData.name !== (profile.name || profile.fullName)) payload.fullName = formData.name;
    if (formData.email !== profile.email) payload.email = formData.email;
    if (formData.phone !== profile.phone) payload.phone = formData.phone;
    if (formData.avatar !== profile.avatar) payload.avatar = formData.avatar;

    // Location: send full object (preserve coordinates if exist)
    const currentAddress = profile.location?.address || "Not specified";
    if (formData.locationAddress !== currentAddress) {
      payload.location = {
        address: formData.locationAddress,
        coordinates: profile.location?.coordinates || null, // preserve or null
      };
    }

    // Bio (provider only)
    const currentBio = profile.bio ||
      (profile.role === "provider" ? (profile.providerDetails?.bio || "No bio yet.") : "No bio yet.");
    if (formData.bio !== currentBio && profile.role === "provider") {
      payload["providerDetails.bio"] = formData.bio;
    }

    try {
      const response = await api.patch("/users/profile", payload);
      const data = response.data;

      // Reconstruct updated profile
      const updatedLocation = normalizeLocation(data.user.location);
      const updatedBio = profile.role === "provider"
        ? (data.user.providerDetails?.bio || "No bio yet.")
        : "No bio yet.";

      const updatedProfile = {
        ...data.user,
        name: data.user.fullName,
        bio: updatedBio,
        location: updatedLocation,
        avatar: data.user.avatar || "/placeholder.svg",
        joinDate: data.user.createdAt
          ? new Date(data.user.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          })
          : "Unknown",
      };

      setProfile(updatedProfile);
      setFormData({
        name: updatedProfile.name,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        bio: updatedBio,
        locationAddress: updatedLocation.address,
        avatar: updatedProfile.avatar,
      });

      setIsEditing(false);
      onUpdateProfile(updatedProfile);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update profile.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const normalizedLoc = normalizeLocation(profile.location);
    setFormData({
      name: profile.name || profile.fullName || "",
      email: profile.email,
      phone: profile.phone,
      bio: profile.bio || (profile.role === "provider"
        ? (profile.providerDetails?.bio || "No bio yet.")
        : "No bio yet."),
      locationAddress: normalizedLoc.address,
      avatar: profile.avatar,
    });
    setIsEditing(false);
  };

  const getRoleBadgeStyles = (role) => {
    if (role === "provider") {
      return {
        background: "bg-purple-100",
        text: "text-purple-700",
        label: "Service Provider",
      };
    }
    return {
      background: "bg-blue-100",
      text: "text-blue-700",
      label: "Customer",
    };
  };

  // ✅ Safe fallback for avatar initial
  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  return (
    <Card className="p-6 sm:p-8 border border-blue-200/60 shadow-lg">
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src={formData.avatar} alt={profile.name || "User"} />
            <AvatarFallback className="bg-blue-100 text-blue-800">
              {getInitials(profile.name || profile.fullName)} {/* ✅ Safe */}
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
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {profile.name || profile.fullName || "User"}
              </h2>
              <span
                className={`${getRoleBadgeStyles(profile.role).background} ${getRoleBadgeStyles(profile.role).text} px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide`}
              >
                {getRoleBadgeStyles(profile.role).label}
              </span>
            </div>
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
          <label className="block text-sm font-semibold mb-2 text-gray-800">Phone Number</label>
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
          <label className="block text-sm font-semibold mb-2 text-gray-800">Location</label>
          {isEditing ? (
            <Input
              name="locationAddress"
              value={formData.locationAddress}
              onChange={handleInputChange}
              placeholder="Your location"
              className="border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
          ) : (
            <p className="text-gray-900">
              {profile.location?.address || "Not specified"}
            </p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-semibold mb-2 text-gray-800">Bio</label>
        {isEditing ? (
          <Textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Tell us about yourself"
            className="min-h-24 border-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
        ) : (
          <p className="text-gray-900">{formData.bio}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {!isEditing ? (
          <Button
            onClick={() => {
              const normalizedLoc = normalizeLocation(profile.location);
              setFormData({
                name: profile.name || profile.fullName || "",
                email: profile.email,
                phone: profile.phone,
                bio: profile.bio || (profile.role === "provider"
                  ? (profile.providerDetails?.bio || "No bio yet.")
                  : "No bio yet."),
                locationAddress: normalizedLoc.address,
                avatar: profile.avatar,
              });
              setIsEditing(true);
            }}
            variant="outline"
            className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </Button>
        ) : (
          <>
            <Button
              onClick={handleSave}
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
              className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </>
        )}
        <Button
          onClick={onLogout}
          variant="outline"
          className="gap-2 border-red-300 text-red-600 hover:bg-red-50 ml-auto sm:ml-0"
        >
          <LogOut className="w-4 h-4" /> {/* ✅ Now defined */}
          Log Out
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-500">
          Member since {profile.joinDate || "Unknown"}
        </p>
      </div>
    </Card>
  );
}