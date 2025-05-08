import React, { useEffect, useState } from "react";
import styles from "./Friends.module.css";
import { Button, Card, Nav, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import API from "../../api";

const Friends = () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const [tab, setTab] = useState("friends");
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const usersRes = await fetch(`${API}/users`);
      const allUsers = await usersRes.json();

      const requestsRes = await fetch(`${API}/friend_requests/${currentUser.id}`);
      const allRequests = await requestsRes.json();

      const acceptedFriendIds = allRequests
        .filter(r => r.status === "accepted")
        .map(r => (r.senderId === currentUser.id ? r.receiverId : r.senderId));

      const pendingOutgoingIds = allRequests
        .filter(r => r.status === "pending" && r.senderId === currentUser.id)
        .map(r => r.receiverId);

      const pendingIncoming = allRequests
        .filter(r => r.status === "pending" && r.receiverId === currentUser.id);

      const friendList = allUsers.filter(u => acceptedFriendIds.includes(u.id));
      const suggestionsList = allUsers.filter(u =>
        u.id !== currentUser.id &&
        !acceptedFriendIds.includes(u.id) &&
        !pendingOutgoingIds.includes(u.id) &&
        !pendingIncoming.find(r => r.senderId === u.id)
      );

      setUsers(allUsers);
      setFriends(friendList);
      setIncomingRequests(pendingIncoming);
      setSuggestions(suggestionsList);
    } catch (err) {
      console.error("Failed to fetch friend data:", err);
    }
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      await fetch(`${API}/friend_requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUser.id, receiverId }),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to send request:", err);
    }
  };

  const respondToRequest = async (requestId, action) => {
    try {
      await fetch(`${API}/friend_requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to respond to request:", err);
    }
  };

  const unfriend = async (friendId) => {
    try {
      await fetch(`${API}/friend_requests/${currentUser.id}/${friendId}`, {
        method: "DELETE",
      });
      fetchData();
    } catch (err) {
      console.error("Failed to unfriend:", err);
    }
  };

  const goToMessages = (user) => {
    navigate("/messages", { state: { chatWith: user } });
  };

  const renderCard = (user, footer) => (
    <Card className={styles.card + " mb-3 shadow-sm"} key={user.id}>
      <Card.Body className="d-flex align-items-center">
        <img src={user.ProfilePic} alt={user.Username} className={styles.avatar} />
        <div className="ms-3">
          <h6 className="mb-0">{user.FirstName} {user.LastName}</h6>
          <small className="text-muted">@{user.Username}</small>
        </div>
      </Card.Body>
      {footer && <Card.Footer className="d-flex justify-content-between">{footer}</Card.Footer>}
    </Card>
  );

  const renderFriends = () =>
    friends.length ? (
      friends.map(user =>
        renderCard(user, [
          <Button
            key="message"
            variant="outline-primary"
            size="sm"
            onClick={() => goToMessages(user)}
          >
            Message
          </Button>,
          <Button
            key="unfriend"
            variant="outline-danger"
            size="sm"
            onClick={() => unfriend(user.id)}
          >
            Unfriend
          </Button>,
        ])
      )
    ) : (
      <p className="text-muted">You have no friends yet.</p>
    );

  const renderRequests = () =>
    incomingRequests.length ? (
      incomingRequests.map(req => {
        const sender = users.find(u => u.id === req.senderId);
        if (!sender) return null;
        return renderCard(sender, [
          <Button
            key="accept"
            variant="success"
            size="sm"
            onClick={() => respondToRequest(req.id, "accepted")}
          >
            Accept
          </Button>,
          <Button
            key="reject"
            variant="outline-danger"
            size="sm"
            onClick={() => respondToRequest(req.id, "rejected")}
          >
            Reject
          </Button>,
        ]);
      })
    ) : (
      <p className="text-muted">No incoming friend requests.</p>
    );

  const renderSuggestions = () => {
    const filtered = suggestions.filter((u) =>
      `${u.FirstName} ${u.LastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.length ? (
      filtered.map(user =>
        renderCard(user, [
          <Button
            key="add"
            className="w-100 btn-success"
            size="sm"
            onClick={() => sendFriendRequest(user.id)}
          >
            Add Friend
          </Button>,
        ])
      )
    ) : (
      <p className="text-muted">No other users found.</p>
    );
  };

  return (
    <div className="container mt-4">
      <Nav variant="tabs" activeKey={tab} onSelect={(key) => setTab(key)}>
        <Nav.Item>
          <Nav.Link eventKey="friends">Friends</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="requests">Friend Requests</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="suggestions">Suggestions</Nav.Link>
        </Nav.Item>
      </Nav>

      {tab === "suggestions" && (
        <Form className="my-3">
          <Form.Control
            type="text"
            placeholder="Search for users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Form>
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 mt-2">
        {tab === "friends" && renderFriends()}
        {tab === "requests" && renderRequests()}
        {tab === "suggestions" && renderSuggestions()}
      </div>
    </div>
  );
};

export default Friends;