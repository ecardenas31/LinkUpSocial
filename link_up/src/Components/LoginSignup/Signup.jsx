import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginSignup.module.css";
import API from "../../api"; // ✅ Centralized backend URL

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    const trimmed = value.trim();
    const normalized =
      name === "email" || name === "username" ? trimmed.toLowerCase() : trimmed;

    setFormData({ ...formData, [name]: normalized });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const key in formData) {
      if (!formData[key]) {
        setError("All fields are required.");
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FirstName: formData.firstName,
          LastName: formData.lastName,
          Username: formData.username,
          email: formData.email,
          Password: formData.password,
          ProfilePic: `https://i.pravatar.cc/150?u=${formData.username}`,
        }),
      });

      const data = await response.json();
      console.log("Signup response:", response.status, data);

      if (!response.ok) {
        setError(data.error || "Failed to create account. Please try again.");
        return;
      }

      alert("Sign-up successful! Redirecting to Log In...");
      setTimeout(() => navigate("/login"), 1000);
    } catch (error) {
      console.error("Error signing up:", error);
      setError("Sign-up failed. Please try again.");
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authBox}>
        <h2 className={styles.authTitle}>Create an account</h2>
        <p className={styles.authSubtitle}>
          Join LinkUp today and connect with your friends.
        </p>

        {error && <div className={styles.authError}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className={styles.authLabel}>First Name</label>
          <input
            className={styles.authInput}
            type="text"
            name="firstName"
            placeholder="John"
            value={formData.firstName}
            autoComplete="given-name"
            onChange={handleChange}
            required
          />

          <label className={styles.authLabel}>Last Name</label>
          <input
            className={styles.authInput}
            type="text"
            name="lastName"
            placeholder="Doe"
            value={formData.lastName}
            autoComplete="family-name"
            onChange={handleChange}
            required
          />

          <label className={styles.authLabel}>Username</label>
          <input
            className={styles.authInput}
            type="text"
            name="username"
            placeholder="johndoe123"
            value={formData.username}
            autoComplete="username"
            onChange={handleChange}
            required
          />

          <label className={styles.authLabel}>Email</label>
          <input
            className={styles.authInput}
            type="email"
            name="email"
            placeholder="name@example.com"
            value={formData.email}
            autoComplete="email"
            onChange={handleChange}
            required
          />

          <label className={styles.authLabel}>Password</label>
          <input
            className={styles.authInput}
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            autoComplete="new-password"
            onChange={handleChange}
            required
          />

          <label className={styles.authLabel}>Confirm Password</label>
          <input
            className={styles.authInput}
            type="password"
            name="confirmPassword"
            placeholder="••••••••"
            value={formData.confirmPassword}
            autoComplete="new-password"
            onChange={handleChange}
            required
          />

          <button type="submit" className={styles.authButton}>
            Sign Up
          </button>
        </form>

        <div className={styles.authFooter}>
          Already have an account?
          <span
            className={styles.signupLink}
            onClick={() => navigate("/login")}
          >
            Log In
          </span>
        </div>
      </div>
    </div>
  );
};

export default Signup;