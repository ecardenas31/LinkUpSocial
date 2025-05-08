import React, { useState, useContext } from "react";
import styles from "./LoginSignup.module.css";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../contextProvider";
import API from "../../api"; // ✅ centralized backend URL

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext); 
  const [formData, setFormData] = useState({ Username: "", Password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleanedValue =
      name === "Username" ? value.trim().toLowerCase() : value.trim();

    setFormData({
      ...formData,
      [name]: cleanedValue,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      loginId: formData.Username.trim(),
      Password: formData.Password.trim(),
    };

    if (!payload.loginId || !payload.Password) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      const res = await fetch(`${API}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.user?.id) {
        setError(data.error || "Login failed");
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      setUser(data.user);
      navigate("/feed");
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authBox}>
        <h2 className={styles.authTitle}>Login to LinkUp</h2>
        <p className={styles.authSubtitle}>
          Enter your credentials to access your account
        </p>

        <form onSubmit={handleSubmit}>
          <label className={styles.authLabel}>Username</label>
          <input
            className={styles.authInput}
            type="text"
            name="Username"
            value={formData.Username}
            placeholder="yourusername"
            autoComplete="username"
            onChange={handleChange}
            required
          />

          <div className={styles.authPasswordRow}>
            <label className={styles.authLabel}>Password</label>
            <span className={styles.forgotPassword}>Forgot password?</span>
          </div>
          <input
            className={styles.authInput}
            type="password"
            name="Password"
            value={formData.Password}
            placeholder="••••••••"
            autoComplete="current-password"
            onChange={handleChange}
            required
          />

          {error && <div className={styles.authError}>{error}</div>}

          <button type="submit" className={styles.authButton}>
            Login
          </button>
        </form>

        <div className={styles.authFooter}>
          <span>Don't have an account?</span>
          <span
            className={styles.signupLink}
            onClick={() => navigate("/signup")}
          >
            Sign up
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
