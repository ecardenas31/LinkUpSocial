const express = require("express");
const pool = require("../db");

module.exports = (upload) => {
  const router = express.Router();

  // GET all posts
  router.get("/", async (req, res) => {
    try {
      const [posts] = await pool.query(`
        SELECT posts.*, users.FirstName, users.LastName, users.ProfilePic,
          CONCAT(LEFT(users.FirstName, 1), LEFT(users.LastName, 1)) AS authorInitials,
          CONCAT(users.FirstName, ' ', users.LastName) AS authorName,
          (SELECT COUNT(*) FROM likes WHERE likes.postId = posts.id) AS likeCount
        FROM posts
        JOIN users ON posts.userId = users.id
        ORDER BY posts.createdAt DESC
      `);

      for (const post of posts) {
        const [media] = await pool.query(
          "SELECT url, type FROM media WHERE postId = ?",
          [post.id]
        );
        post.media = media || [];
      }

      res.json(posts);
    } catch (err) {
      console.error("Fetch posts error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // POST create new post
  router.post("/", upload.array("media"), async (req, res) => {
    const { userId, content } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: "Missing userId or content" });
    }

    try {
      const [result] = await pool.query(
        "INSERT INTO posts (userId, content) VALUES (?, ?)",
        [userId, content]
      );
      const postId = result.insertId;

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const type = file.mimetype.startsWith("video") ? "video" : "image";
          const url = `/uploads/${file.filename}`;
          await pool.query("INSERT INTO media (postId, url, type) VALUES (?, ?, ?)", [
            postId, url, type
          ]);
        }
      }

      const [newPost] = await pool.query("SELECT * FROM posts WHERE id = ?", [postId]);
      res.status(201).json(newPost[0]);
    } catch (err) {
      console.error("Create post error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // PUT update post content
  router.put("/:id", async (req, res) => {
    const { content } = req.body;
    const { id } = req.params;
    if (!content) return res.status(400).json({ error: "Content is required" });

    try {
      await pool.query("UPDATE posts SET content = ? WHERE id = ?", [content, id]);
      res.json({ message: "Post updated successfully" });
    } catch (err) {
      console.error("Update post error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // DELETE post and associated data
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM likes WHERE postId = ?", [id]);
      await pool.query("DELETE FROM comments WHERE postId = ?", [id]);
      await pool.query("DELETE FROM media WHERE postId = ?", [id]);
      await pool.query("DELETE FROM posts WHERE id = ?", [id]);

      res.json({ message: "Post and all associated data deleted successfully." });
    } catch (err) {
      console.error("Delete post error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};