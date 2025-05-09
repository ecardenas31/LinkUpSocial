const express = require("express");
const pool = require("../db");

module.exports = function (io) {
  const router = express.Router();

  // ✅ Fetch messages between users or for all
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
      res.status(500).json({ error: "Failed to fetch messages" });
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

  // ✅ Socket.IO events
  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(`user-${userId}`);
      console.log(`🟢 User ${userId} joined room user-${userId}`);
    });

    socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
      if (!senderId || !receiverId || !content) {
        return socket.emit("error", { message: "Missing required fields." });
      }

      try {
        const [result] = await pool.query(
          "INSERT INTO messages (senderId, receiverId, content, createdAt) VALUES (?, ?, ?, NOW())",
          [senderId, receiverId, content]
        );

        const [savedMsg] = await pool.query(
          "SELECT * FROM messages WHERE id = ?",
          [result.insertId]
        );

        io.to(`user-${receiverId}`).emit("receiveMessage", savedMsg[0]);
        io.to(`user-${senderId}`).emit("receiveMessage", savedMsg[0]);

        // 🔔 Emit notification to receiver
        const [[senderInfo]] = await pool.query(
          "SELECT CONCAT(FirstName, ' ', LastName) AS name FROM users WHERE id = ?",
          [senderId]
        );

        if (senderInfo) {
          io.to(`user-${receiverId}`).emit("notification", {
            type: "message",
            fromUserId: senderId,
            toUserId: receiverId,
            message: `${senderInfo.name} sent you a message.`,
            createdAt: new Date(),
          });
        }

        // ✅ If it's a new conversation
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

    socket.on("readMessages", ({ senderId, receiverId }) => {
      io.to(`user-${senderId}`).emit("messagesRead", { by: receiverId });
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  return router;
};