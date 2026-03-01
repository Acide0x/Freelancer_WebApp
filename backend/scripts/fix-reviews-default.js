// scripts/fix-reviews-default.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") }); // ← Load .env from backend root

const mongoose = require("mongoose");
const User = require("../models/user.model");

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in your .env file");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");
    
    const result = await User.updateMany(
      { 
        $or: [
          { reviews: { $exists: false } },
          { reviews: null },
          { reviews: { $eq: null } }
        ] 
      },
      { $set: { reviews: [] } }
    );
    
    console.log(`✅ Migration complete: Fixed ${result.modifiedCount} documents`);
    console.log(`📊 Matched ${result.matchedCount} documents total`);
    
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  })
  .catch(err => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  });