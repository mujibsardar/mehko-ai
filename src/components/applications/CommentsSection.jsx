import React, { useEffect, useState } from "react";
import { fetchComments, addComment } from "../../firebase/comments";
import useAuth from "../../hooks/useAuth";

import "./CommentsSection.scss"; // Assuming you have some CSS for styling

function CommentsSection({ application }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (!application?.id) return;
    fetchComments(application.id).then(setComments);
  }, [application?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    await addComment(application.id, {
      text,
      userId: user?.uid || "anon",
      displayName: user?.displayName || "Anonymous",
    });

    setText("");
    fetchComments(application.id).then(setComments);
  };

  return (
    <div className="comments-section">
      <h3 className="comments-title">Community Comments</h3>

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            className="comment-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Leave a comment..."
          />
          <button type="submit" disabled={!text.trim()} className="submit-btn">
            Submit
          </button>
        </form>
      ) : (
        <p className="comments-login-msg">Please log in to leave a comment.</p>
      )}

      <ul className="comment-list">
        {comments.map((c) => (
          <li key={c.id} className="comment-item">
            <span className="comment-author">{c.displayName}</span>
            <p className="comment-text">{c.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CommentsSection;
