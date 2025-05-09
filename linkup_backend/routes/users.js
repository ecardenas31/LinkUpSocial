const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "LinkUpProfiles",
    resource_type: "auto",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
  },
});

const upload = multer({ storage });

// ==================== GET: User by Username ====================
router.get("/username/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE Username = ? LIMIT 1", [username]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    let parsedLinks = [];
    try {
      parsedLinks = user.links ? JSON.parse(user.links) : [];
    } catch {
      parsedLinks = [];
    }

    res.json({
      id: user.id,
      Username: user.Username,
      FirstName: user.FirstName,
      LastName: user.LastName,
      email: user.email,
      bio: user.bio,
      AboutMe: user.AboutMe,
      background_color: user.background_color,
      links: parsedLinks,
      themeSongUrl: user.themeSongUrl,
      themeSongTitle: user.themeSongTitle,
      profilePicUrl: user.profilePicUrl || null,
      coverPhotoUrl: user.coverPhotoUrl || null,
      backgroundImageUrl: user.backgroundImageUrl || null,
      customImageUrl: user.customImageUrl || null,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Error fetching user by username:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== GET: All Users ====================
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== POST: Register User ====================
router.post("/", async (req, res) => {
  const { FirstName, LastName, Username, email, Password, ProfilePic } = req.body;
  if (!FirstName || !LastName || !Username || !Password || !email) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const [existing] = await db.execute("SELECT * FROM users WHERE Username = ? OR email = ?", [Username, email]);
    if (existing.length > 0) return res.status(409).json({ error: "Username or email already exists" });

    const hashedPassword = await bcrypt.hash(Password, 10);

    const [result] = await db.execute(
      "INSERT INTO users (FirstName, LastName, Username, email, Password, ProfilePic) VALUES (?, ?, ?, ?, ?, ?)",
      [FirstName, LastName, Username, email, hashedPassword, ProfilePic || null]
    );

    res.status(201).json({ message: "User created", userId: result.insertId });
  } catch (err) {
    console.error("Sign-up error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== POST: Login ====================
router.post("/login", async (req, res) => {
  const { loginId, Password } = req.body;

  if (!loginId || !Password) {
    return res.status(400).json({ error: "Username/Email and Password are required." });
  }

  try {
    const [users] = await db.execute("SELECT * FROM users WHERE Username = ? OR email = ?", [loginId, loginId]);

    if (!users.length) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(Password, user.Password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    const token = jwt.sign({ id: user.id, Username: user.Username }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: {
        id: user.id,
        Username: user.Username,
        FirstName: user.FirstName,
        LastName: user.LastName,
        email: user.email,
        AboutMe: user.AboutMe,
        background_color: user.background_color,
        profilePicUrl: user.profilePicUrl ?? null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed", detail: err.message });
  }
});

// ==================== GET: User by ID ====================
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== PUT: Update Profile ====================
router.put("/update-profile/:id", async (req, res) => {
  const { AboutMe, background_color, bio, links, themeSongUrl } = req.body;

  try {
    const fields = [];
    const values = [];

    if (AboutMe !== undefined) fields.push("AboutMe = ?") && values.push(AboutMe);
    if (links !== undefined) fields.push("links = ?") && values.push(links);
    if (background_color !== undefined) fields.push("background_color = ?") && values.push(background_color);
    if (bio !== undefined) fields.push("bio = ?") && values.push(bio);
    if (themeSongUrl !== undefined) fields.push("themeSongUrl = ?") && values.push(themeSongUrl);

    if (!fields.length) return res.status(400).json({ error: "No fields provided to update." });

    values.push(req.params.id);
    const updateQuery = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    await db.execute(updateQuery, values);

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to update profile:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// ==================== Cloudinary Upload Routes ====================

router.post("/upload-profile-pic", upload.single("profilePic"), async (req, res) => {
  const { userId } = req.body;
  if (!req.file || !userId) return res.status(400).json({ error: "Missing file or userId" });

  try {
    const imageUrl = req.file.path;
    await db.execute("UPDATE users SET profilePicUrl = ? WHERE id = ?", [imageUrl, userId]);
    res.json({ url: imageUrl });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

router.post("/upload-cover-photo", upload.single("coverPhoto"), async (req, res) => {
  const { userId } = req.body;
  if (!req.file || !userId) return res.status(400).json({ error: "Missing file or userId" });

  try {
    const imageUrl = req.file.path;
    await db.execute("UPDATE users SET coverPhotoUrl = ? WHERE id = ?", [imageUrl, userId]);
    res.json({ url: imageUrl });
  } catch (err) {
    console.error("Cover photo upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

router.post("/upload-background", upload.single("background"), async (req, res) => {
  const { userId } = req.body;
  if (!req.file || !userId) return res.status(400).json({ error: "Missing file or userId" });

  try {
    const imageUrl = req.file.path;
    await db.execute("UPDATE users SET backgroundImageUrl = ? WHERE id = ?", [imageUrl, userId]);
    res.json({ url: imageUrl });
  } catch (err) {
    console.error("Background upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

router.post("/upload-custom-image", upload.single("customImage"), async (req, res) => {
  const { userId } = req.body;
  if (!req.file || !userId) return res.status(400).json({ error: "Missing file or userId" });

  try {
    const imageUrl = req.file.path;
    await db.execute("UPDATE users SET customImageUrl = ? WHERE id = ?", [imageUrl, userId]);
    res.json({ url: imageUrl });
  } catch (err) {
    console.error("Custom image upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;