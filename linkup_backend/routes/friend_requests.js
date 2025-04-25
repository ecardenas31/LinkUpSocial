const express = require("express");
const pool = require("../db");

module.exports = function (io) {
  const router = express.Router();

  // POST send a friend request
  router.post("/", async (req, res) => {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "Missing senderId or receiverId" });
    }

    try {
      const [existing] = await pool.query(
        "SELECT * FROM friend_requests WHERE senderId = ? AND receiverId = ? AND status = 'pending'",
        [senderId, receiverId]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: "Friend request already sent" });
      }

      const [senderInfo] = await pool.query(
        "SELECT CONCAT(FirstName, ' ', LastName) AS name FROM users WHERE id = ?",
        [senderId]
      );

      await pool.query(
        "INSERT INTO friend_requests (senderId, receiverId) VALUES (?, ?)",
        [senderId, receiverId]
      );

      // 🔔 Emit real-time notification to receiver
      io.to(`user-${receiverId}`).emit("notification", {
        type: "friend_request",
        fromUserId: senderId,
        toUserId: receiverId,
        message: `${senderInfo[0].name} sent you a friend request.`,
        createdAt: new Date(),
      });

      res.status(201).json({ message: "Friend request sent" });
    } catch (err) {
      console.error("Send request error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // GET all friend requests for a user
  router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const [requests] = await pool.query(
        "SELECT * FROM friend_requests WHERE senderId = ? OR receiverId = ?",
        [userId, userId]
      );
      res.json(requests);
    } catch (err) {
      console.error("Fetch requests error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // PUT accept or reject a request
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      await pool.query("UPDATE friend_requests SET status = ? WHERE id = ?", [status, id]);

      if (status === "accepted") {
        const [[request]] = await pool.query(
          "SELECT senderId, receiverId FROM friend_requests WHERE id = ?",
          [id]
        );

        const [receiverInfo] = await pool.query(
          "SELECT CONCAT(FirstName, ' ', LastName) AS name FROM users WHERE id = ?",
          [request.receiverId]
        );

        io.to(`user-${request.senderId}`).emit("notification", {
          type: "friend_accepted",
          fromUserId: request.receiverId,
          toUserId: request.senderId,
          message: `${receiverInfo[0].name} accepted your friend request.`,
          createdAt: new Date(),
        });
      }

      res.json({ message: `Friend request ${status}` });
    } catch (err) {
      console.error("Update request error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // DELETE accepted friendship
  router.delete("/friend_requests/:userId/:friendId", async (req, res) => {
    const { userId, friendId } = req.params;
    try {
      await pool.query(
        `DELETE FROM friend_requests 
         WHERE ((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)) 
         AND status = 'accepted'`,
        [userId, friendId, friendId, userId]
      );
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  });

  return router; // ✅ This is what allows your server.js to work
};