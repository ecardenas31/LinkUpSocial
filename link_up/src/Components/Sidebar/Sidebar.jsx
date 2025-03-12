import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";
import defaultProfilePic from "../images/profile.png";

const Sidebar = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // ✅ Get the current user's ID from localStorage
    const userId = localStorage.getItem("userId");

    if (!userId) {
      console.error("No user logged in.");
      return;
    }

    // ✅ Fetch user data based on logged-in user ID
    fetch(`https://67bea66cb2320ee05010d2b4.mockapi.io/linkup/api/Users/${userId}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error("Failed to fetch user", err));
  }, []);

  return (
    <nav className={styles.sidebar}>
      {/* App Logo & Name */}
      <h1 className={styles.logo}>LinkUp</h1>

      {/* User Profile Section */}
      <div className={styles.profile}>
        <img
          src={user?.ProfilePic || defaultProfilePic}
          alt="User"
          className={styles.profilePic}
        />
        <p className={styles.username}>{user?.FirstName} {user?.LastName}</p>
        <span className={styles.userHandle}>@{user?.Username}</span>
      </div>

      {/* Navigation Menu */}
      <ul className={styles.navList}>
        <li><NavLink to="/" className={styles.navItem}>🏠 Home</NavLink></li>
        <li><NavLink to="/explore" className={styles.navItem}>🔍 Explore</NavLink></li>
        <li><NavLink to="/people" className={styles.navItem}>👥 People</NavLink></li>
        <li><NavLink to="/saved" className={styles.navItem}>📌 Saved</NavLink></li>
        <li><NavLink to="/create-post" className={styles.navItem}>➕ Create Post</NavLink></li>
      </ul>

      {/* Logout Button */}
      <button
        className={styles.logout}
        onClick={() => {
          localStorage.clear();
          window.location.href = "/login"; // Redirect after logout
        }}
      >
        🚪 Logout
      </button>
    </nav>
  );
};

export default Sidebar;