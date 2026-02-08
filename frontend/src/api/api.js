// src/api/api.js
import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// 📤 Special instance for file uploads (no default JSON header)
const uploadClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 30000, // longer timeout for uploads
  withCredentials: true,
});

//  Interceptor to remove content-type so browser sets boundary automatically
uploadClient.interceptors.request.use((config) => {
  // Ensure Content-Type is NOT set when sending FormData
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// 🖼️ Upload image helper
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await uploadClient.post("/upload/image", formData);
    // Expecting { url: "https://res.cloudinary.com/..." }
    return response.data.url;
  } catch (error) {
    console.error("Image upload failed:", error);
    throw new Error(error.response?.data?.message || "Upload failed");
  }
};

export default apiClient;