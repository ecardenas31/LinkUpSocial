import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import PostCard from "../PostCard/PostCard";
import styles from "./Profile.module.css";
import API from "../../api"; // ✅ Import centralized backend URL

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
        const res = await fetch(`${API}/api/users/username/${username}`);
        const data = await res.json();
        setProfileUser(data);

        const bgPromise = new Promise((resolve) => {
          const bgImg = new Image();
          bgImg.src = `${API}/api/users/background/${data.id}?t=${Date.now()}`;
          bgImg.onload = resolve;
          bgImg.onerror = resolve;
        });

        const coverPromise = new Promise((resolve) => {
          if (data.CoverPhoto) {
            const coverImg = new Image();
            coverImg.src = `${API}/api/users/${data.id}/cover-photo?t=${Date.now()}`;
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
      fetch(`${API}/api/likes/liked/${profileUser.id}`)
        .then(res => res.json())
        .then(data => setLikedPosts(data))
        .catch(err => console.error("Failed to fetch liked posts:", err));
    }

    if (tab === "posts") {
      fetch(`${API}/api/posts/user/${profileUser.id}`)
        .then(res => res.json())
        .then(data => setUserPosts(data))
        .catch(err => console.error("Failed to fetch user's posts:", err));
    }
  }, [tab, profileUser?.id]);

  if (loading || !backgroundLoaded) {
    return <div className="text-center mt-5 text-muted">Loading...</div>;
  }

  if (!profileUser) return <div className="text-center mt-5 text-danger">User not found.</div>;

  const backgroundImage = `${API}/api/users/background/${profileUser.id}?t=${timestamp}`;
  const profilePicUrl = `${API}/users/${profileUser.id}/profile-pic?t=${timestamp}`;
  const coverPhotoUrl = `${API}/api/users/${profileUser.id}/cover-photo?t=${timestamp}`;
  const customImageUrl = `${API}/api/users/custom-image/${profileUser.id}?t=${Date.now()}`;
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
      <div className="container p-4">
        <div
          style={{
            width: "100%",
            height: "200px",
            maxHeight: "100vh",
            backgroundImage: hasCoverPhoto ? `url(${coverPhotoUrl})` : "none",
            backgroundColor: hasCoverPhoto ? "transparent" : "rgba(255, 255, 255, 0.1)",
            backdropFilter: hasCoverPhoto ? "none" : "blur(10px)",
            WebkitBackdropFilter: hasCoverPhoto ? "none" : "blur(10px)",
            borderRadius: "12px",
            border: hasCoverPhoto ? "none" : "1px solid rgba(255, 255, 255, 0.3)",
            padding: "10px",
            marginBottom: "1rem",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            position: "relative",
          }}
        >
          <ul className="nav nav-tabs mb-0 justify-content-center" style={{ backgroundColor: hasCoverPhoto ? "rgba(255,255,255,0.2)" : "transparent", borderRadius: "8px" }}>
            <li className="nav-item"><button className={`nav-link ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>Profile</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === "posts" ? "active" : ""}`} onClick={() => setTab("posts")}>Posts</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === "liked" ? "active" : ""}`} onClick={() => setTab("liked")}>Liked</button></li>
          </ul>
        </div>

        <div className="row p-3">
          <div className="col-md-4 mb-4">
            <div className="card text-center p-4" style={{
              backgroundColor: profileUser.background_color || "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}>
              <div className="d-flex justify-content-center pb-3">
                <img
                  src={profilePicUrl}
                  alt="Profile"
                  className="rounded-circle"
                  style={{ width: "120px", height: "120px", objectFit: "cover" }}
                  onError={(e) => { e.target.onerror = null; e.target.src = "/default.jpg"; }}
                />
              </div>
              <h4>{profileUser.FirstName} {profileUser.LastName}</h4>
              <p className="text-muted" style={{ whiteSpace: "pre-wrap" }}>
                {(profileUser.bio && profileUser.bio.trim() !== "") ? profileUser.bio : "Hello, World!"}
              </p>
              {profileUser.Username === JSON.parse(localStorage.getItem("currentUser"))?.Username && (
                <Link to={`/customize-profile/${profileUser.Username}`}>
                  <button className="btn btn-success mt-2">Edit Profile</button>
                </Link>
              )}
            </div>
            {tab === "profile" && profileUser.customImage && (
              <div className="card p-3 mt-4" style={{
                backgroundColor: profileUser.background_color || "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                textAlign: "center"
              }}>
                <img
                  src={customImageUrl}
                  alt="Custom"
                  style={{ width: "100%", height: "auto", borderRadius: "8px", objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}
          </div>

          <div className="col-md-8">
            {tab === "profile" && (
              <div className="card p-4 mb-4" style={{
                backgroundColor: profileUser.background_color || "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)"
              }}>
                <h5>Profile</h5>
                <p><strong>Username:</strong> @{profileUser.Username}</p>
                {profileUser.links && profileUser.links.length > 0 && (
                  <div className="mt-4">
                    <h5>Links</h5>
                    <ul className="list-unstyled">
                      {profileUser.links.map((link, idx) => (
                        <li key={idx}>
                          <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p><strong>Joined:</strong> {new Date(profileUser.createdAt).toLocaleDateString()}</p>
                <div className="mt-3">
                  <h5>About Me</h5>
                  <div dangerouslySetInnerHTML={{ __html: aboutMeHTML }} />
                </div>
              </div>
            )}

            {tab === "profile" && profileUser.themeSongUrl?.trim() !== "" && (
              <div className="card p-4 mb-4" style={{
                backgroundColor: profileUser.background_color || "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)"
              }}>
                {profileUser.themeSongTitle && (
                  <h5 className="mb-3 text-center">{profileUser.themeSongTitle}</h5>
                )}
                {(() => {
                  const type = detectEmbedType(profileUser.themeSongUrl);
                  switch (type) {
                    case "youtube":
                      const videoId = new URLSearchParams(new URL(profileUser.themeSongUrl).search).get('v') ||
                                      profileUser.themeSongUrl.split("youtu.be/")[1];
                      return (
                        <iframe
                          width="100%"
                          height="300"
                          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`}
                          allow="autoplay"
                          allowFullScreen
                          style={{ borderRadius: "8px" }}
                        />
                      );
                    case "soundcloud":
                      return (
                        <iframe
                          width="100%"
                          height="80"
                          allow="autoplay"
                          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(profileUser.themeSongUrl)}&auto_play=true`}
                          style={{ borderRadius: "8px" }}
                        ></iframe>
                      );
                    case "twitch":
                      const twitchChannel = profileUser.themeSongUrl.split("twitch.tv/")[1].split("/")[0];
                      return (
                        <iframe
                          src={`https://player.twitch.tv/?channel=${twitchChannel}&parent=localhost&muted=true`}
                          height="300"
                          width="100%"
                          allowFullScreen
                          style={{ borderRadius: "8px" }}
                        ></iframe>
                      );
                    case "spotify":
                      const spotifyEmbed = profileUser.themeSongUrl.replace("/track/", "/embed/track/");
                      return (
                        <iframe
                          src={spotifyEmbed}
                          width="100%"
                          height="80"
                          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                          style={{ borderRadius: "8px" }}
                        ></iframe>
                      );
                    default:
                      return (
                        <audio
                          src={profileUser.themeSongUrl}
                          autoPlay
                          loop
                          controls
                          style={{ width: "100%", borderRadius: "8px" }}
                        />
                      );
                  }
                })()}
              </div>
            )}

            {tab === "posts" && (
              <div className="card p-4 mb-4">
                <h5>Posts Created</h5>
                {userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <p className="text-muted">No posts yet.</p>
                )}
              </div>
            )}

            {tab === "liked" && (
              <div className="card p-4 mb-4">
                <h5>Liked Posts</h5>
                {likedPosts.length > 0 ? (
                  likedPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <p className="text-muted">No liked posts yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;