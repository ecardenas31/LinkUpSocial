import React, { useState, useEffect, useRef } from "react";
import styles from "./feed.module.css";
import PostCard from "../PostCard/PostCard";
import UserCard from "../UserCard/UserCard";
import { useNavigate } from "react-router-dom";
import API from "../../api";

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);

  const [newPostContent, setNewPostContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null); // Used to reset file input

  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
    fetch(`${API}/posts`)
      .then((res) => res.json())
      .then((data) => {
        setPosts(data); // newest already first, no .reverse()
        setLoadingPosts(false);
      })
      .catch((err) => {
        console.error("Error fetching posts:", err);
        setError("Failed to load posts");
        setLoadingPosts(false);
      });

    fetch(`${API}/users`)
      .then((res) => res.json())
      .then((data) => {
        setCreators(data);
        setLoadingUsers(false);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        setError("Failed to load users");
        setLoadingUsers(false);
      });
  }, []);

  const handlePostSubmit = async () => {
    if (!newPostContent.trim()) return;

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      alert("Please log in to post.");
      return;
    }

    const formData = new FormData();
    formData.append("userId", currentUser.id);
    formData.append("content", newPostContent);

    selectedFiles.forEach((file) => {
      formData.append("media", file); // field name matches multer
    });

    try {
      const res = await fetch(`${API}/posts`, {
        method: "POST",
        body: formData,
      });

      await res.json(); // ignore single post; we'll re-fetch all

      const refreshed = await fetch(`${API}/posts`);
      const allPosts = await refreshed.json();
      setPosts(allPosts); // ✅ newest post stays on top

      setNewPostContent("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // ✅ reset file input
      }
    } catch (err) {
      console.error("Failed to create post:", err);
      alert("Something went wrong.");
    }
  };

  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div className={`container-fluid px-4 ${styles.feedWrapper}`}>
      <div className="row justify-content-center">
        <div className="col-lg-8 col-md-12">
          <div className="card p-3 mb-4">
            <h5>Create a Post</h5>
            <textarea
              className="form-control mb-2"
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
            <input
              className="form-control mb-2"
              type="file"
              multiple
              accept="image/*,video/*"
              ref={fileInputRef}
              onChange={(e) => setSelectedFiles([...e.target.files])}
            />
            <button
              className="btn btn-success w-100"
              onClick={handlePostSubmit}
            >
              Post
            </button>
          </div>

              {loadingPosts ? (
                <p>Loading posts...</p>
                   ) : posts.length === 0 ? (
                <p className="text-muted">No posts yet. Be the first to post!</p>
                   ) : Array.isArray(posts) ? (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostDeleted={(id) =>
              setPosts((prev) => prev.filter((p) => p.id !== id))
          }
        />
      ))
    ) : (
      <p className="text-danger">Something went wrong loading posts.</p>
    )}
        </div>

        <div className="col-lg-4 mt-4 mt-lg-0">
          <div className={styles.sidebarCard}>
            <h5 className="text-center">Top Creators</h5>
            {loadingUsers ? (
              <p>Loading users...</p>
            ) : creators.length === 0 ? (
              <p className="text-muted text-center">No users yet.</p>
            ) : (
              creators.map((user) => <UserCard key={user.id} user={user} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feed;