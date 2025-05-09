import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import PostCard from "../PostCard/PostCard";
import styles from "./Profile.module.css";
import API from "../../api";

const ProfilePage = () => {
  const { username } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");
  const [likedPosts, setLikedPosts] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

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

        const promises = [];

        if (data.backgroundImageUrl) {
          promises.push(
            new Promise((resolve) => {
              const bgImg = new Image();
              bgImg.src = data.backgroundImageUrl;
              bgImg.onload = resolve;
              bgImg.onerror = resolve;
            })
          );
        }

        if (data.coverPhotoUrl) {
          promises.push(
            new Promise((resolve) => {
              const coverImg = new Image();
              coverImg.src = data.coverPhotoUrl;
              coverImg.onload = resolve;
              coverImg.onerror = resolve;
            })
          );
        }

        await Promise.all(promises);
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

  // ✅ Use Cloudinary-hosted URLs from the backend
  const backgroundImage = profileUser.backgroundImageUrl || "";
  const profilePicUrl = profileUser.profilePicUrl || "/default-avatar.png";
  const coverPhotoUrl = profileUser.coverPhotoUrl || "";
  const customImageUrl = profileUser.customImageUrl || "";
  const aboutMeHTML = profileUser.AboutMe || "<p>No info yet.</p>";

  return (
    <div
      className={styles.profileContainer}
      style={{
        minHeight: "100vh",
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        paddingTop: "60px",
      }}
    >
      {/* ✅ Example rendering content */}
      <div className="container">
        <div className="text-center mb-4">
          <img
            src={profilePicUrl}
            alt="Profile"
            className="rounded-circle"
            width="120"
            height="120"
          />
          <h3 className="mt-3">{profileUser.FirstName} {profileUser.LastName}</h3>
          <p className="text-muted">@{profileUser.Username}</p>
        </div>

        <div className="text-center mb-3">
          {coverPhotoUrl && (
            <img
              src={coverPhotoUrl}
              alt="Cover"
              className="img-fluid rounded"
              style={{ maxHeight: "250px" }}
            />
          )}
        </div>

        <div className="card p-3 mb-4">
          <h5>About Me</h5>
          <div dangerouslySetInnerHTML={{ __html: aboutMeHTML }} />
        </div>

        <div className="d-flex justify-content-center gap-3 mb-4">
          <button
            className={`btn ${tab === "posts" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setTab("posts")}
          >
            Posts
          </button>
          <button
            className={`btn ${tab === "liked" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setTab("liked")}
          >
            Liked
          </button>
        </div>

        {tab === "posts" && (
          userPosts.length > 0 ? (
            userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <p className="text-center text-muted">No posts yet.</p>
          )
        )}

        {tab === "liked" && (
          likedPosts.length > 0 ? (
            likedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <p className="text-center text-muted">No liked posts yet.</p>
          )
        )}
      </div>
    </div>
  );
};

export default ProfilePage;