const express = require("express");
const pool = require("../db");

module.exports = function (io) {
  const router = express.Router();

  // 🔹 Get all comments for a post
  router.get("/post/:postId", async (req, res) => {
    const { postId } = req.params;
    try {
      const [comments] = await pool.query(
        `SELECT comments.*, CONCAT(users.FirstName, ' ', users.LastName) AS authorName
         FROM comments
         JOIN users ON comments.userId = users.id
         WHERE postId = ?
         ORDER BY comments.createdAt ASC`,
        [postId]
      );
      res.json(comments);
    } catch (err) {
      console.error("Fetch comments error:", err);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // 🔹 Create new comment or reply
  router.post("/", async (req, res) => {
    const { userId, postId, text, parentId = null } = req.body;

    if (!userId || !postId || !text) {
      return res.status(400).json({ error: "Missing comment fields" });
    }

    try {
      const [result] = await pool.query(
        "INSERT INTO comments (userId, postId, text, parentId) VALUES (?, ?, ?, ?)",
        [userId, postId, text, parentId]
      );

      const [saved] = await pool.query(
        `SELECT comments.*, CONCAT(users.FirstName, ' ', users.LastName) AS authorName
         FROM comments
         JOIN users ON comments.userId = users.id
         WHERE comments.id = ?`,
        [result.insertId]
      );

      const newComment = saved[0];

      // 🔔 Notify post owner if not commenting on own post
      const [[post]] = await pool.query("SELECT userId FROM posts WHERE id = ?", [postId]);

      if (post && post.userId !== userId) {
        io.to(`user-${post.userId}`).emit("notification", {
          type: "comment",
          postId,
          commentId: newComment.id,
          fromUserId: userId,
          toUserId: post.userId,
          message: `${newComment.authorName} commented on your post.`,
          createdAt: new Date(),
        });
      }

      res.status(201).json(newComment);
    } catch (err) {
      console.error("Post comment error:", err);
      res.status(500).json({ error: "Failed to post comment" });
    }
  });

  // 🔹 Edit a comment
  router.put("/:id", async (req, res) => {
    const { text } = req.body;
    const { id } = req.params;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      await pool.query("UPDATE comments SET text = ? WHERE id = ?", [text, id]);
      res.json({ message: "Comment updated" });
    } catch (err) {
      console.error("Update comment error:", err);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  // 🔹 Delete a comment and its replies
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM comments WHERE parentId = ?", [id]);
      await pool.query("DELETE FROM comments WHERE id = ?", [id]);
      res.json({ message: "Comment deleted" });
    } catch (err) {
      console.error("Delete comment error:", err);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  return router;
};