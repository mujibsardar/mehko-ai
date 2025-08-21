import React, { useEffect, useState } from "react";
import { fetchComments, addComment, addReaction, removeReaction } from "../../firebase/comments";
import useAuth from "../../hooks/useAuth";

import "./CommentsSection.scss";

// Common emojis for quick reactions
const QUICK_EMOJIS = ["👍", "❤️", "😊", "🎉", "👏", "🔥", "💯", "🚀"];

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
      displayName: user?.displayName || user?.email || "Anonymous",
      userEmail: user?.email || "anonymous@example.com",
    });

    setText("");
    fetchComments(application.id).then(setComments);
  };

  const handleReaction = async (commentId, emoji) => {
    if (!user) return;
    
    const comment = comments.find(c => c.id === commentId);
    const hasReacted = comment?.reactions?.[user.uid]?.includes(emoji);
    
    if (hasReacted) {
      await removeReaction(application.id, commentId, user.uid, emoji);
    } else {
      await addReaction(application.id, commentId, user.uid, emoji);
    }
    
    // Refresh comments to get updated reactions
    fetchComments(application.id).then(setComments);
  };

  const getReactionCount = (reactions, emoji) => {
    if (!reactions) return 0;
    return Object.values(reactions).flat().filter(r => r === emoji).length;
  };

  const hasUserReacted = (reactions, emoji) => {
    if (!reactions || !user) return false;
    return reactions[user.uid]?.includes(emoji) || false;
  };

  return (
    <div className="comments-section">
      <h3 className="comments-title">Community Comments</h3>

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <div className="comment-form-header">
            <span className="comment-author-label">
              Commenting as: <strong>{user.displayName || user.email}</strong>
            </span>
          </div>
          <textarea
            className="comment-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience or ask a question..."
          />
          <button type="submit" disabled={!text.trim()} className="submit-btn">
            Submit Comment
          </button>
        </form>
      ) : (
        <p className="comments-login-msg">Please log in to leave a comment.</p>
      )}

      <ul className="comment-list">
        {comments.map((c) => (
          <li key={c.id} className="comment-item">
            <div className="comment-header">
              <span className="comment-author">{c.displayName}</span>
              <span className="comment-timestamp">
                {c.timestamp?.toDate
                  ? new Date(c.timestamp.toDate()).toLocaleDateString()
                  : "Recently"}
              </span>
            </div>
            <p className="comment-text">{c.text}</p>
            
            {/* Emoji Reactions */}
            <div className="comment-reactions">
              {QUICK_EMOJIS.map((emoji) => {
                const count = getReactionCount(c.reactions, emoji);
                const isActive = hasUserReacted(c.reactions, emoji);
                
                if (count === 0) return null;
                
                return (
                  <button
                    key={emoji}
                    className={`reaction-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleReaction(c.id, emoji)}
                    title={`${emoji} ${count}`}
                  >
                    <span className="emoji">{emoji}</span>
                    <span className="count">{count}</span>
                  </button>
                );
              })}
              
              {/* Add Reaction Button */}
              <button
                className="add-reaction-btn"
                onClick={() => {
                  const emoji = prompt("Enter an emoji:");
                  if (emoji && emoji.trim()) {
                    handleReaction(c.id, emoji.trim());
                  }
                }}
                title="Add reaction"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CommentsSection;
