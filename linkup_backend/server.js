// Imports
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const pool = require("./db");

// Cloudinary Setup
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "linkup_uploads",
    format: file.mimetype.split("/")[1],
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// App + Socket.IO setup
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

function safeLoad(path, args = []) {
  try {
    const routeModule = require(path);
    if (typeof routeModule === "function" && args.length > 0) {
      const result = routeModule(...args);
      console.log(`✅ Loaded ${path} with args`);
      return result;
    } else {
      console.log(`✅ Loaded ${path} as plain router`);
      return routeModule;
    }
  } catch (err) {
    console.error(`❌ Failed to load ${path}:`, err.message);
    process.exit(1);
  }
}

// Routes
const userRoutes = safeLoad("./routes/users");
const postRoutes = safeLoad("./routes/posts", [upload, cloudinary]);
const commentRoutes = safeLoad("./routes/comments", [io]);
const likeRoutes = safeLoad("./routes/likes", [io]);
const friendRoutes = safeLoad("./routes/friend_requests", [io]);
const messageRoutes = safeLoad("./routes/messages", [io]);
const notificationRoutes = safeLoad("./routes/notifications", [io]);

// Apply routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/friend_requests", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

// Home route
app.get("/", (req, res) => res.send("API is running ✅"));

// Socket.IO
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined room user-${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// Start server (Render expects app to use PORT and bind properly)
const PORT = process.env.PORT || 5001;
app.set("port", PORT); // Optional for Render clarity

http.listen(PORT, () => {
  console.log(`🚀 HTTP + Socket.IO server running on port ${PORT}`);
});

module.exports.io = io;