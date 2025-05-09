import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import styles from "./Sidebar.module.css";
import socket from "../../socket";
import API from "../../api"; // ✅ Use this instead of hardcoded localhost

const Sidebar = () => {
  const [sidebarUser, setSidebarUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || !currentUser.id) return;

    // ✅ Fetch from deployed backend
    fetch(`${API}/users/${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => setSidebarUser(data))
      .catch((err) => console.error("Failed to load sidebar user:", err));
  }, []);

  if (!sidebarUser) {
    return null; // 🔥 Don't render anything if user not loaded yet
  }

  const handleLogout = () => {
    socket.emit("logout", sidebarUser.id);
    socket.disconnect();
    localStorage.removeItem("currentUser");
    navigate("/login");
    window.location.reload();
  };

  return (
    <aside
      className="d-flex flex-column bg-white px-4 py-4 vh-100 border-end shadow-sm position-sticky top-0"
      style={{ width: "280px", minWidth: "280px" }}
    >
      <h1 className={`${styles.logo} mb-4`}>
        Link<span className={styles.mint}>Up</span>
      </h1>

      <div className="mb-4 w-100 text-center">
        <img
          src={`${API}/users/${sidebarUser.id}/profile-pic?${Date.now()}`} // ✅ Use deployed base URL
          alt="Avatar"
          className="rounded-circle mb-2 shadow-sm border"
          style={{ width: "70px", height: "70px", objectFit: "cover" }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/default.jpg"; // fallback if image fails
          }}
        />
        <div className="fw-semibold">
          {sidebarUser.FirstName} {sidebarUser.LastName}
        </div>
        <div className="text-muted small">
          @{sidebarUser.Username}
        </div>
      </div>

      <nav className="nav flex-column flex-grow-1 w-100">
        <NavLink
          to="/feed"
          className={({ isActive }) =>
            `nav-link ${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ""}`
          }
        >
          📰 Feed
        </NavLink>
        <NavLink
          to="/messages"
          className={({ isActive }) =>
            `nav-link ${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ""}`
          }
        >
          💬 Messages
        </NavLink>
        <NavLink
          to="/friends"
          className={({ isActive }) =>
            `nav-link ${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ""}`
          }
        >
          👥 Friends
        </NavLink>
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            `nav-link ${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ""}`
          }
        >
          🔍 Explore
        </NavLink>
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `nav-link ${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ""}`
          }
        >
          🔔 Notifications
        </NavLink>
        <NavLink
          to={`/profile/${sidebarUser.Username}`}
          className={({ isActive }) =>
            `nav-link ${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ""}`
          }
        >
          🙍‍♂️ Profile
        </NavLink>
      </nav>

      <button
        className="btn btn-outline-success w-100 mt-auto rounded-pill fw-semibold"
        onClick={handleLogout}
      >
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;