// scripts/migrate-active-jobs.js
const path = require("path");
const dotenv = require("dotenv");

// Load .env with explicit path and debug mode
dotenv.config({ 
  path: path.resolve(__dirname, "../.env"),
  debug: process.env.DEBUG_DOTENV === "true" // Optional: set DEBUG_DOTENV=true to see debug logs
});

const mongoose = require("mongoose");

// Validate environment variables
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI not found in environment variables!");
  console.error("\n📋 Current environment variables:");
  console.error("   MONGODB_URI:", process.env.MONGODB_URI ? "✅ Set" : "❌ Missing");
  console.error("   MONGO_URI:", process.env.MONGO_URI ? "✅ Set" : "❌ Missing");
  console.error("\n💡 Please ensure your .env file (in backend/) contains:");
  console.error("   MONGODB_URI=mongodb://localhost:27017/freelancer_app");
  console.error("\n🔍 .env file location being checked:");
  console.error("   " + path.resolve(__dirname, "../.env"));
  process.exit(1);
}

const User = require("../models/user.model");
const Job = require("../models/job.model");

const migrate = async () => {
  let conn;
  
  try {
    console.log("🔌 Connecting to MongoDB...");
    console.log("   URI:", MONGODB_URI.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@")); // Hide credentials in logs
    
    // ✅ Mongoose 6+: No need for useNewUrlParser/useUnifiedTopology
    conn = await mongoose.connect(MONGODB_URI);
    
    console.log("✅ Connected to MongoDB");
    console.log("   Database:", conn.connection.name);

    console.log("\n🔄 Starting activeJobs migration...");

    // Find all providers
    const providers = await User.find({ role: "provider" }).select("_id fullName");
    console.log(`📊 Found ${providers.length} providers to process`);

    let updatedCount = 0;
    let errorCount = 0;
    
    for (const provider of providers) {
      try {
        // Find jobs that are in_progress and assigned to this provider
        const activeJobIds = await Job.find({
          assignedWorker: provider._id,
          status: "in_progress",
          isActive: true
        }).distinct("_id");

        if (activeJobIds.length > 0) {
          // Update provider with active jobs ($addToSet prevents duplicates)
          await User.findByIdAndUpdate(
            provider._id,
            { $addToSet: { activeJobs: { $each: activeJobIds } } }
          );
          
          console.log(`✅ ${provider.fullName}: Linked ${activeJobIds.length} active job(s)`);
          updatedCount++;
        }
      } catch (err) {
        console.warn(`⚠️ Failed to process provider ${provider._id}:`, err.message);
        errorCount++;
        // Continue with next provider instead of crashing
      }
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`📈 Updated ${updatedCount} providers with activeJobs`);
    if (errorCount > 0) {
      console.log(`⚠️ ${errorCount} providers had errors (check logs above)`);
    }
    
  } catch (error) {
    console.error("💥 Migration failed:", error.name, "-", error.message);
    
    if (error.name === "MongoParseError") {
      console.error("\n🔧 Troubleshooting MongoParseError:");
      console.error("   1. Check your MongoDB URI format");
      console.error("   2. For localhost: mongodb://localhost:27017/your_db_name");
      console.error("   3. For Atlas: mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true");
      console.error("   4. Ensure no extra spaces or quotes in .env value");
    }
    
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.disconnect();
      console.log("🔌 Disconnected from MongoDB");
    }
  }
};

// Run the migration
console.log("🚀 Starting migration script...\n");
migrate();