const express = require("express");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { promisify } = require("util");
const { pipeline: streamPipeline } = require("stream");
const path = require("path");

const pipeline = promisify(streamPipeline);

const router = express.Router();

// Function to dynamically import multer
async function getMulter() {
  const multerModule = await import("multer");
  return multerModule.default;
}

// Middleware to handle file uploads
async function handleFileUpload(req, res, next) {
  try {
    const multer = await getMulter();

    // Configure multer with storage and file size limits
    const upload = multer({
      storage: multer.diskStorage({
        destination: function (req, file, cb) {
          if (req.path.includes("/resume")) {
            cb(null, path.join(__dirname, "../public/resume"));
          } else {
            cb(null, path.join(__dirname, "../public/profile"));
          }
        },
        filename: function (req, file, cb) {
          const ext = path.extname(file.originalname);
          const filename = `${uuidv4()}${ext}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    });

    // Handle file upload with error handling
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res
            .status(400)
            .json({ message: `File upload error: ${err.message}` });
        }
        return res
          .status(500)
          .json({ message: "Server error during file upload" });
      }
      next();
    });
  } catch (err) {
    next(err);
  }
}

router.post("/resume", handleFileUpload, async (req, res) => {
  try {
    const { file } = req;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (file.mimetype !== "application/pdf") {
      return res
        .status(400)
        .json({ message: "Invalid format. Only PDF files are allowed." });
    }

    res.json({
      message: "File uploaded successfully",
      url: `/host/resume/${file.filename}`,
    });
  } catch (err) {
    console.error("Error while uploading:", err);
    res.status(500).json({ message: "Error while uploading" });
  }
});

router.post("/profile", handleFileUpload, async (req, res) => {
  try {
    const { file } = req;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png") {
      return res.status(400).json({
        message: "Invalid format. Only JPG and PNG images are allowed.",
      });
    }

    res.json({
      message: "Profile image uploaded successfully",
      url: `/host/profile/${file.filename}`,
    });
  } catch (err) {
    console.error("Error while uploading:", err);
    res.status(500).json({ message: "Error while uploading" });
  }
});

module.exports = router;
