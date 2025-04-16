const express = require("express");
const pool = require("../db");

module.exports = function (io) {
  const router = express.Router();

  // ✅ Fetch all messages or between two users
  router.get("/:userId/:contactId", async (req, res) => {
    const { userId, contactId } = req.params;
    try {
      let query, params;

      if (contactId === "0") {
        query = `SELECT * FROM messages 
                 WHERE senderId = ? OR receiverId = ? 
                 ORDER BY timestamp ASC`;
        params = [userId, userId];
      } else {
        query = `SELECT * FROM messages 
                 WHERE (senderId = ? AND receiverId = ?) 
                 OR (senderId = ? AND receiverId = ?) 
                 ORDER BY timestamp ASC`;
        params = [userId, contactId, contactId, userId];
      }

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error("Fetch messages error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ Mark messages as read
  router.put("/markAsRead", async (req, res) => {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "Missing senderId or receiverId" });
    }

    try {
      await pool.query(
        `UPDATE messages 
         SET isRead = 1 
         WHERE senderId = ? AND receiverId = ? AND isRead = 0`,
        [senderId, receiverId]
      );
      res.sendStatus(200);
    } catch (err) {
      console.error("Error updating messages as read:", err);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // ✅ Socket.IO setup
  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // Join personal room
    socket.on("join", (userId) => {
      socket.join(`user-${userId}`);
      console.log(`🟢 User ${userId} joined room user-${userId}`);
    });

    // ✅ Send a message
    socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
      try {
        const [result] = await pool.query(
          "INSERT INTO messages (senderId, receiverId, content) VALUES (?, ?, ?)",
          [senderId, receiverId, content]
        );

        const [savedMsg] = await pool.query(
          "SELECT * FROM messages WHERE id = ?",
          [result.insertId]
        );

        // Send to both participants
        io.to(`user-${receiverId}`).emit("receiveMessage", savedMsg[0]);
        io.to(`user-${senderId}`).emit("receiveMessage", savedMsg[0]);

        // Check for new conversation (first 1-2 messages)
        const [existing] = await pool.query(
          `SELECT id FROM messages 
           WHERE (senderId = ? AND receiverId = ?) 
           OR (senderId = ? AND receiverId = ?) 
           LIMIT 2`,
          [senderId, receiverId, receiverId, senderId]
        );

        if (existing.length <= 1) {
          io.to(`user-${senderId}`).emit("newConversation", savedMsg[0]);
        }

        socket.emit("messageSent", savedMsg[0]);
      } catch (err) {
        console.error("❌ Message send error:", err);
        socket.emit("error", { message: "Failed to send message." });
      }
    });

    // ✅ Read receipt handler
    socket.on("readMessages", ({ senderId, receiverId }) => {
      io.to(`user-${senderId}`).emit("messagesRead", { by: receiverId });
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  return router;
};