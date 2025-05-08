import React, { useState, useEffect, useRef } from "react";
import { Button, Modal, Form, InputGroup } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";
import "./Messages.module.css";
import API from "../../api";
import socket from "../../socket";

const Messages = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [friends, setFriends] = useState([]);
  const [chatPartners, setChatPartners] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const isAuthenticated = !!currentUser?.id;
  
  const location = useLocation();

  useEffect(() => {
    if (!currentUser?.id) return;
    socket.emit("join", currentUser.id);
  }, [currentUser?.id]);

  const fetchData = async () => {
    try {
      const [usersRes, requestsRes, allMsgsRes] = await Promise.all([
        fetch(`${API}/users`),
        fetch(`${API}/friend_requests/${currentUser.id}`),
        fetch(`${API}/messages/${currentUser.id}/0`)
      ]);

      const allUsers = await usersRes.json();
      const allRequests = await requestsRes.json();
      const allMsgs = await allMsgsRes.json();
      setAllMessages(allMsgs);

      const acceptedFriendIds = allRequests
        .filter(r => r.status === "accepted")
        .map(r => String(r.senderId === currentUser.id ? r.receiverId : r.senderId));

      const acceptedFriends = allUsers.filter(u => acceptedFriendIds.includes(String(u.id)));
      setFriends(acceptedFriends);

      const partnerMap = {};
      allMsgs.forEach(msg => {
        const partnerId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
        partnerMap[partnerId] = true;
      });

      const chatList = acceptedFriends.filter(user => partnerMap[user.id]);
      setChatPartners(chatList);

      const incoming = location.state?.chatWith;
      if (incoming) {
        const match = acceptedFriends.find(f => f.id === incoming.id);
        if (match) handleSelectContact(match);
      }
    } catch (err) {
      console.error("Failed to load message data:", err);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchData();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!selectedContact || !currentUser?.id) return;

    fetch(`${API}/messages/${currentUser.id}/${selectedContact.id}`)
      .then(res => res.json())
      .then(setMessages)
      .catch(err => console.error("Failed to load messages:", err));
  }, [selectedContact, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      setAllMessages(prev => [...prev, msg]);

      if (
        selectedContact &&
        (msg.senderId === selectedContact.id || msg.receiverId === selectedContact.id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleNewConversation = () => fetchData();

    const handleMessagesRead = ({ by }) => {
      if (selectedContact?.id === by) {
        setMessages(prev =>
          prev.map(msg =>
            msg.senderId === currentUser.id ? { ...msg, isRead: 1 } : msg
          )
        );
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("newConversation", handleNewConversation);
    socket.on("messagesRead", handleMessagesRead);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("newConversation", handleNewConversation);
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [selectedContact, currentUser?.id]);

  const sendMessage = () => {
    if (!newMessage || !selectedContact) return;

    socket.emit("sendMessage", {
      senderId: currentUser.id,
      receiverId: selectedContact.id,
      content: newMessage,
    });

    setNewMessage("");
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit("sendMessage", {
        senderId: currentUser.id,
        receiverId: selectedContact.id,
        content: reader.result,
      });
    };
    if (file) reader.readAsDataURL(file);
  };

  const handleSelectContact = async (user) => {
    setSelectedContact(user);

    try {
      await fetch(`${API}/messages/markAsRead`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: currentUser.id,
        }),
      });

      socket.emit("readMessages", {
        senderId: user.id,
        receiverId: currentUser.id,
      });

      const msgRes = await fetch(`${API}/messages/${currentUser.id}/${user.id}`);
      const userMsgs = await msgRes.json();
      setMessages(userMsgs);
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  if (!currentUser?.id) {
    return <div className="p-5 text-center text-muted">Please log in to use the messaging system.</div>;
  }

  return (
    <div className="d-flex vh-100 bg-light overflow-hidden rounded shadow">
      {/* Sidebar */}
      <div className="contacts border-end bg-white" style={{ width: "300px", overflowY: "auto" }}>
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
          <h5 className="mb-0 fw-semibold">Messages</h5>
          <Button size="sm" variant="success" onClick={() => setShowModal(true)}>+ New</Button>
        </div>
        {chatPartners.length === 0 ? (
          <p className="px-3 mt-3 text-muted">No recent conversations</p>
        ) : (
          chatPartners.map(user => {
            const isActive = selectedContact?.id === user.id;
            const hasUnread = allMessages.some(
              msg =>
                msg.senderId === user.id &&
                msg.receiverId === currentUser.id &&
                msg.isRead === 0
            );

            return (
              <div
                key={`chat-${user.id}`}
                className={`d-flex align-items-center gap-3 p-3 border-bottom 
                  ${isActive ? "bg-light border-start border-success border-4" : ""}
                  ${!isActive && hasUnread ? "flash-mint" : ""}
                `}
                style={{ cursor: "pointer" }}
                onClick={() => handleSelectContact(user)}
              >
                <img src={user.ProfilePic} alt="Avatar" className="rounded-circle" width="45" height="45" />
                <div>
                  <div className="fw-bold">{user.FirstName} {user.LastName}</div>
                  <small className="text-muted">@{user.Username}</small>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-grow-1 d-flex flex-column">
        {selectedContact ? (
          <>
            <div className="p-3 border-bottom bg-white shadow-sm">
              <h6 className="mb-0">{selectedContact.FirstName} {selectedContact.LastName}</h6>
              <small className="text-muted">@{selectedContact.Username}</small>
            </div>

            <div className="flex-grow-1 p-3 overflow-auto bg-body">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`p-2 px-3 my-2 rounded-4 ${
                    msg.senderId === currentUser.id
                      ? "bg-success text-white ms-auto"
                      : "bg-light me-auto"
                  }`}
                  style={{ maxWidth: "70%", width: "fit-content" }}
                >
                  {msg.content.startsWith("data:image") ? (
                    <img src={msg.content} alt="uploaded" style={{ maxWidth: "200px", borderRadius: "10px" }} />
                  ) : msg.content.startsWith("data:video") ? (
                    <video controls style={{ maxWidth: "200px", borderRadius: "10px" }}>
                      <source src={msg.content} type="video/mp4" />
                    </video>
                  ) : (
                    <span>{msg.content}</span>
                  )}

                  {msg.senderId === currentUser.id &&
                    idx === messages.length - 1 &&
                    msg.isRead === 1 && (
                      <div className="text-end text-white-50 small mt-1" style={{ fontSize: "11px" }}>
                        ✓ Seen
                      </div>
                    )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-top">
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Form.Group controlId="file-upload" className="ms-2">
                  <Form.Label className="btn btn-outline-secondary mb-0" style={{ cursor: "pointer" }}>
                    📎
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    style={{ display: "none" }}
                  />
                </Form.Group>
                <Button variant="success" onClick={sendMessage} className="ms-2">Send</Button>
              </InputGroup>
            </div>
          </>
        ) : (
          <div className="d-flex justify-content-center align-items-center flex-grow-1 text-muted">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} backdrop="static" style={{ zIndex: 9999 }}>
        <Modal.Header closeButton>
          <Modal.Title>Start New Conversation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {friends.length === 0 ? (
            <p className="text-muted">No accepted friends to message yet.</p>
          ) : (
            friends.map(user => (
              <div
                key={`modal-${user.id}`}
                className="d-flex align-items-center gap-3 p-2 hover-bg-light"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  handleSelectContact(user);
                  setShowModal(false);
                }}
              >
                <img
                  src={user.ProfilePic || "/default-avatar.png"}
                  onError={(e) => (e.target.src = "/default-avatar.png")}
                  alt="Avatar"
                  className="rounded-circle"
                  width="40"
                  height="40"
                />
                <div>
                  <div className="fw-bold">{user.FirstName ?? "Unknown"} {user.LastName ?? ""}</div>
                  <small className="text-muted">@{user.Username ?? "unknown"}</small>
                </div>
              </div>
            ))
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Messages;
