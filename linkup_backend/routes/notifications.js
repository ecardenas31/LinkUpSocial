const express = require("express");
const pool = require("../db");

module.exports = function (io) {
  const router = express.Router();

  // 🔹 GET all notifications for a user
  router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const [rows] = await pool.query(
        "SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC",
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // 🔹 POST a new notification and emit it in real-time
  router.post("/", async (req, res) => {
    const {
      userId,
      type,
      message,
      fromUserId = null,
      postId = null,
      commentId = null,
    } = req.body;

    if (!userId || !type || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Optional: validate allowed types
    const allowedTypes = [
      "message",
      "comment",
      "like",
      "friend_request",
      "friend_accepted",
    ];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid notification type" });
    }

    try {
      // ✅ Insert with createdAt from DB
      const [result] = await pool.query(
        `INSERT INTO notifications 
         (userId, type, message, fromUserId, postId, commentId, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [userId, type, message, fromUserId, postId, commentId]
      );

      const newNotification = {
        id: result.insertId,
        userId,
        type,
        message,
        fromUserId,
        postId,
        commentId,
        isRead: 0,
        createdAt: new Date(), // Frontend display fallback (optional)
      };

      // ✅ Emit to user's room
      io.to(`user-${userId}`).emit("notification", newNotification);

      res.status(201).json(newNotification);
    } catch (err) {
      console.error("Error creating notification:", err);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // 🔹 PATCH to mark one as read
  router.patch("/read/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("UPDATE notifications SET isRead = 1 WHERE id = ?", [id]);
      res.json({ message: "Notification marked as read" });
    } catch (err) {
      console.error("Error marking notification as read:", err);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // 🔹 PATCH to mark all as read for a user
  router.patch("/readAll/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      await pool.query(
        "UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0",
        [userId]
      );
      res.json({ message: "All notifications marked as read" });
    } catch (err) {
      console.error("Error marking all as read:", err);
      res.status(500).json({ error: "Failed to update all notifications" });
    }
  });

  return router;
};