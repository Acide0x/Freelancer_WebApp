const express = require("express");
const router = express.Router();

const jobController = require("../controllers/job.controller");
const verifyAuth = require("../middlewares/authMiddleware");

console.log("✅ Job routes file loaded and exporting router");

// 🔓 Public
router.get("/", jobController.getAllJobs);

// 🔐 Protected
router.post("/add", verifyAuth, jobController.createJob);
router.get("/my", verifyAuth, jobController.getMyJobs);
router.patch("/:id", verifyAuth, jobController.updateJob);
router.patch("/:id/end", verifyAuth, jobController.endJob);

module.exports = router;
