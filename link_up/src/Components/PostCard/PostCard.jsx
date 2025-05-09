import React, { useState, useEffect } from "react";
import styles from "./PostCard.module.css";
import API from "../../api";

const STATIC_URL = API;

const PostCard = ({ post, onPostDeleted }) => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const [likes, setLikes] = useState(post.likeCount || 0);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyBox, setReplyBox] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});

  const [isPostEditing, setIsPostEditing] = useState(false);
  const [postEditedContent, setPostEditedContent] = useState(post.content);

  const [isCommentEditing, setIsCommentEditing] = useState(null);
  const [commentEditedContent, setCommentEditedContent] = useState("");

  const [pendingCommentDelete, setPendingCommentDelete] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`${API}/likes/check?postId=${post.id}&userId=${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => setLiked(data.liked))
      .catch((err) => console.error("Like check failed:", err));
  }, [post.id, currentUser]);

  const handleLike = async () => {
    if (!currentUser || isLiking) return;
    setIsLiking(true);
    try {
      const res = await fetch(`${API}/likes`, {
        method: liked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, userId: currentUser.id }),
      });
      if (res.ok) {
        setLikes((prev) => prev + (liked ? -1 : 1));
        setLiked(!liked);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const toggleComments = async () => {
    if (!showComments) {
      try {
        const res = await fetch(`${API}/comments/post/${post.id}`);
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      }
    }
    setShowComments(!showComments);
  };

  const handleCommentSubmit = async (parentId = null, text = newComment) => {
    if (!text.trim() || !currentUser) return;
    const commentData = {
      postId: post.id,
      userId: currentUser.id,
      text,
      parentId,
    };
    try {
      const response = await fetch(`${API}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentData),
      });
      const saved = await response.json();
      setComments([...comments, saved]);
      parentId ? setReplyBox((prev) => ({ ...prev, [parentId]: "" })) : setNewComment("");
    } catch (error) {
      console.error("Failed to post comment:", error);
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await fetch(`${API}/posts/${post.id}`, { method: "DELETE" });
      document.getElementById(`closeModal-${post.id}`)?.click();
      if (typeof onPostDeleted === "function") {
        onPostDeleted(post.id);
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Could not delete post.");
    }
  };

  const handleEditSave = async () => {
    try {
      const res = await fetch(`${API}/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postEditedContent }),
      });
      if (res.ok) {
        post.content = postEditedContent;
        setIsPostEditing(false);
      }
    } catch (err) {
      console.error("Failed to update post:", err);
    }
  };

  const handleCommentEditSave = async (commentId) => {
    try {
      const res = await fetch(`${API}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentEditedContent }),
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, text: commentEditedContent } : c))
        );
        setIsCommentEditing(null);
        setCommentEditedContent("");
      }
    } catch (err) {
      console.error("Failed to update comment:", err);
    }
  };

  const handleConfirmCommentDelete = async () => {
    try {
      await fetch(`${API}/comments/${pendingCommentDelete}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== pendingCommentDelete));
      setPendingCommentDelete(null);
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert("Could not delete comment.");
    }
  };

  const renderComments = (parentId = null) =>
    comments
      .filter((c) => c.parentId === parentId)
      .map((comment) => {
        const isOwner = currentUser?.id === comment.userId;
        const isBeingEdited = isCommentEditing === comment.id;

        return (
          <div key={comment.id} className={`comment mb-3 ${comment.parentId ? styles.reply : ""}`}>
            <div className="d-flex justify-content-between align-items-center">
              <strong>{comment.authorName || "Anonymous"}</strong>
              <small className="text-muted">{new Date(comment.createdAt).toLocaleString()}</small>
            </div>

            {isBeingEdited ? (
              <>
                <textarea
                  className="form-control mb-2"
                  value={commentEditedContent}
                  onChange={(e) => setCommentEditedContent(e.target.value)}
                />
                <div className="d-flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={() => handleCommentEditSave(comment.id)}>Save</button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => {
                    setIsCommentEditing(null);
                    setCommentEditedContent("");
                  }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <p className="mb-1">{comment.text}</p>
            )}

            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setReplyBox((prev) => ({ ...prev, [comment.id]: "" }))}>Reply</button>

              {comments.some((c) => c.parentId === comment.id) && (
                <button className="btn btn-sm btn-outline-info" onClick={() => setExpandedReplies((prev) => ({
                  ...prev,
                  [comment.id]: !prev[comment.id],
                }))}>
                  {expandedReplies[comment.id] ? "Hide Replies" : "View Replies"}
                </button>
              )}

              {isOwner && !isBeingEdited && (
                <>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => {
                    setIsCommentEditing(comment.id);
                    setCommentEditedContent(comment.text);
                  }}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target={`#deleteCommentModal-${comment.id}`} onClick={() => setPendingCommentDelete(comment.id)}>Delete</button>
                </>
              )}
            </div>

            {replyBox[comment.id] !== undefined && (
              <div className="d-flex mt-2">
                <input
                  type="text"
                  className="form-control me-2"
                  placeholder="Write a reply..."
                  value={replyBox[comment.id]}
                  onChange={(e) =>
                    setReplyBox((prev) => ({ ...prev, [comment.id]: e.target.value }))
                  }
                />
                <button
                  className="btn btn-success"
                  onClick={() => handleCommentSubmit(comment.id, replyBox[comment.id])}
                >
                  Post
                </button>
              </div>
            )}

            {expandedReplies[comment.id] && (
              <div className="ms-4 border-start ps-3 mt-2">{renderComments(comment.id)}</div>
            )}

            {/* Delete Comment Modal */}
            <div className="modal fade" id={`deleteCommentModal-${comment.id}`} tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Delete Comment</h5>
                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                  </div>
                  <div className="modal-body">Are you sure you want to delete this comment?</div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" className="btn btn-danger" onClick={handleConfirmCommentDelete}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      });

  return (
    <>
      <div className={`card mb-4 shadow-sm ${styles.postCard}`}>
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <div className={`rounded-circle ${styles.avatar}`}>{post.authorInitials || "?"}</div>
            <div className="ms-3">
              <h6 className="mb-0">{post.authorName || "Unknown"}</h6>
              <small className="text-muted">{new Date(post.createdAt).toLocaleString()}</small>
            </div>
          </div>

          {isPostEditing ? (
            <>
              <textarea className="form-control mb-2" value={postEditedContent} onChange={(e) => setPostEditedContent(e.target.value)} />
              <div className="d-flex gap-2 mb-3">
                <button className="btn btn-primary btn-sm" onClick={handleEditSave}>Save</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setIsPostEditing(false)}>Cancel</button>
              </div>
            </>
          ) : (
            <p className="mb-3">{post.content}</p>
          )}

          {Array.isArray(post.media) &&
            post.media.map((file, index) =>
              file.type === "image" ? (
                <img
                  key={index}
                  src={`${STATIC_URL}${file.url}`}
                  alt={`media-${index}`}
                  className="img-fluid rounded mb-3"
                />
              ) : (
                <video
                  key={index}
                  controls
                  className="img-fluid rounded mb-3"
                  style={{ maxHeight: "500px" }}
                >
                  <source src={`${STATIC_URL}${file.url}`} type="video/mp4" />
                </video>
              )
            )}

          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex gap-2">
              <button onClick={handleLike} disabled={isLiking} className={`btn btn-sm ${liked ? styles.liked : styles.likeBtn}`}>
                ❤️ {likes}
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={toggleComments}>
                💬
              </button>
            </div>

            {currentUser?.id === post.userId && (
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" onClick={() => setIsPostEditing(true)}>✏️</button>
                <button className="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target={`#deleteModal-${post.id}`}>🗑️</button>
              </div>
            )}
          </div>

          {showComments && (
            <div className="comment-section mt-3">
              <div>{renderComments(null)}</div>
              <div className="d-flex mt-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="form-control me-2"
                  placeholder="Write a comment..."
                />
                <button className="btn btn-success" onClick={() => handleCommentSubmit()}>Post</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Post Modal */}
      <div className="modal fade" id={`deleteModal-${post.id}`} tabIndex="-1" aria-labelledby={`deleteModalLabel-${post.id}`} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Confirm Delete</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" id={`closeModal-${post.id}`} />
            </div>
            <div className="modal-body">Are you sure you want to permanently delete this post?</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmed}>Yes, Delete</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PostCard;