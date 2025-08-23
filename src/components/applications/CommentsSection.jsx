import React, { useEffect, useState, useRef } from "react";
import {
  fetchComments,
  addComment,
  addReaction,
  removeReaction,
} from "../../firebase/comments";
import useAuth from "../../hooks/useAuth";

import "./CommentsSection.scss";

// Common emojis for quick reactions - matching the screenshot
const QUICK_EMOJIS = ["👍", "👎", "😊", "🎉", "😢", "❤️", "🚀", "👀"];

function CommentsSection({ application, context = null }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [activeEmojiPicker, setActiveEmojiPicker] = useState(null); // Track which comment's emoji picker is open
  const { user } = useAuth();
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    if (!application?.id) return;
    fetchComments(application.id).then(setComments);
  }, [application?.id]);

  // Handle context changes to pre-populate comment
  useEffect(() => {
    if (context && context.subStepText) {
      const commentText = `Question/comment about this sub-step: "${context.subStepText}"\n\n`;
      setText(commentText);
    }
  }, [context]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setActiveEmojiPicker(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

    const comment = comments.find((c) => c.id === commentId);
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
    return Object.values(reactions)
      .flat()
      .filter((r) => r === emoji).length;
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
              {/* Emoji Picker - appears on hover/click */}
              {activeEmojiPicker === c.id && (
                <div className="emoji-picker" ref={emojiPickerRef}>
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className={`emoji-option ${
                        hasUserReacted(c.reactions, emoji) ? "active" : ""
                      }`}
                      onClick={() => {
                        handleReaction(c.id, emoji);
                        setActiveEmojiPicker(null); // Close picker after selection
                      }}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Smiley Face Button to Open Emoji Picker */}
              <button
                className="emoji-trigger-btn"
                onClick={() =>
                  setActiveEmojiPicker(activeEmojiPicker === c.id ? null : c.id)
                }
                title="Add reaction"
              >
                😊
              </button>

              {/* Display Existing Reactions */}
              {QUICK_EMOJIS.map((emoji) => {
                const count = getReactionCount(c.reactions, emoji);
                if (count === 0) return null;

                return (
                  <div key={emoji} className="reaction-display">
                    <span className="emoji">{emoji}</span>
                    <span className="count">{count}</span>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CommentsSection;
