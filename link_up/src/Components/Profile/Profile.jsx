import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import PostCard from "../PostCard/PostCard";
import styles from "./Profile.module.css";
import API from "../../api"; // ✅ Backend API base (includes /api)
const STATIC_URL = "https://linkupsocial.onrender.com"; // ✅ Static files (images, etc.)

const ProfilePage = () => {
  const { username } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const hasCoverPhoto = !!profileUser?.hasCoverPhoto;
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");
  const [likedPosts, setLikedPosts] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const timestamp = Date.now();

  function detectEmbedType(url) {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
    if (lower.includes("soundcloud.com")) return "soundcloud";
    if (lower.includes("twitch.tv")) return "twitch";
    if (lower.includes("spotify.com")) return "spotify";
    return "audio";
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API}/users/username/${username}`);
        const data = await res.json();
        setProfileUser(data);

        const bgPromise = new Promise((resolve) => {
          const bgImg = new Image();
          bgImg.src = `${API}/users/background/${data.id}?t=${Date.now()}`;
          bgImg.onload = resolve;
          bgImg.onerror = resolve;
        });

        const coverPromise = new Promise((resolve) => {
          if (data.CoverPhoto) {
            const coverImg = new Image();
            coverImg.src = `${API}/users/${data.id}/cover-photo?t=${Date.now()}`;
            coverImg.onload = resolve;
            coverImg.onerror = resolve;
          } else {
            resolve();
          }
        });

        await Promise.all([bgPromise, coverPromise]);
        setBackgroundLoaded(true);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load user:", err);
        setProfileUser(null);
        setLoading(false);
      }
    };

    fetchUser();
  }, [username]);

  useEffect(() => {
    if (!profileUser?.id) return;

    if (tab === "liked") {
      fetch(`${API}/likes/liked/${profileUser.id}`)
        .then(res => res.json())
        .then(data => setLikedPosts(data))
        .catch(err => console.error("Failed to fetch liked posts:", err));
    }

    if (tab === "posts") {
      fetch(`${API}/posts/user/${profileUser.id}`)
        .then(res => res.json())
        .then(data => setUserPosts(data))
        .catch(err => console.error("Failed to fetch user's posts:", err));
    }
  }, [tab, profileUser?.id]);

  if (loading || !backgroundLoaded) {
    return <div className="text-center mt-5 text-muted">Loading...</div>;
  }

  if (!profileUser) return <div className="text-center mt-5 text-danger">User not found.</div>;

  const backgroundImage = `${API}/users/background/${profileUser.id}?t=${timestamp}`;
  const profilePicUrl = `${STATIC_URL}/users/${profileUser.id}/profile-pic?t=${timestamp}`;
  const coverPhotoUrl = `${API}/users/${profileUser.id}/cover-photo?t=${timestamp}`;
  const customImageUrl = `${API}/users/custom-image/${profileUser.id}?t=${Date.now()}`;
  const aboutMeHTML = profileUser.AboutMe || "<p>No info yet.</p>";

  return (
    <div
      className={styles.profileContainer}
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        paddingTop: "60px",
      }}
    >
      {/* ✅ All your UI logic and tab rendering remains unchanged */}
    </div>
  );
};

export default ProfilePage;