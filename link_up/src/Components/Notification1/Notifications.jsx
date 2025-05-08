import React, { useEffect, useState } from "react";
import { Container, ListGroup, Badge, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import styles from "./Notifications.module.css";
import API from "../../api";
import socket from "../../socket";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.emit("join", currentUser.id);

    // Initial fetch
    fetch(`${API}/notifications/${currentUser.id}`)
      .then(res => res.json())
      .then(data => {
        setNotifications(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load notifications:", err);
        setLoading(false);
      });

    // Real-time notification handler
    socket.on("notification", (notification) => {
      if (notification.userId === currentUser.id) {
        setNotifications(prev => [notification, ...prev]);
      }
    });

    return () => {
      socket.off("notification");
    };
  }, [currentUser?.id]);

  const handleClick = async (notif) => {
    try {
      // Mark as read
      await fetch(`${API}/notifications/read/${notif.id}`, { method: "PATCH" });

      // Remove from state
      setNotifications(prev => prev.filter(n => n.id !== notif.id));

      // Navigate based on type
      switch (notif.type) {
        case "message":
          navigate(`/messages?user=${notif.fromUserId}`);
          break;
        case "friend_request":
        case "friend_accepted":
          navigate("/friends");
          break;
        case "like":
        case "comment":
          navigate(`/post/${notif.postId}`);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error("Failed to handle notification click:", err);
    }
  };

  const renderTypeBadge = (type) => {
    switch (type) {
      case "like":
        return <Badge bg="success">👍 Like</Badge>;
      case "comment":
        return <Badge bg="info">💬 Comment</Badge>;
      case "friend_request":
        return <Badge bg="primary">🤝 Friend</Badge>;
      case "friend_accepted":
        return <Badge bg="success">✅ Accepted</Badge>;
      case "message":
        return <Badge bg="warning" text="dark">📩 Message</Badge>;
      default:
        return <Badge bg="secondary">🔔 Other</Badge>;
    }
  };

  return (
    <Container className="mt-5">
      <h3 className="text-center mb-4 text-mint">🔔 Notifications</h3>
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" variant="success" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center text-muted">No notifications yet.</div>
      ) : (
        <ListGroup className="shadow">
          {notifications.map((notif) => (
            <ListGroup.Item
              key={notif.id}
              action
              onClick={() => handleClick(notif)}
              className={`d-flex justify-content-between align-items-start ${!notif.isRead ? "bg-mint" : ""} ${styles.notificationItem}`}
            >
              <div className="ms-2 me-auto">
                <div className="fw-bold">{notif.message}</div>
                <small className="text-muted">
                  {new Date(notif.createdAt).toLocaleString()}
                </small>
              </div>
              {renderTypeBadge(notif.type)}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </Container>
  );
};

export default Notifications;