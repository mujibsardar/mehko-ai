import React, { useState } from "react";
import useAuth from "../../hooks/useAuth";
import "./CommentsSection.scss";

const initialComments = [
  {
    id: 1,
    author: "Sabrina from Santa Clara",
    text: "The inspection in my county was super fast — just 3 days!",
  },
  {
    id: 2,
    author: "Kevin in Lake County",
    text: "Be sure to include the SOP with your application.",
  },
];

const CommunityComments = ({ county }) => {
  if (!county) return null;
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const nextComment = {
      id: Date.now(),
      author: "You",
      text: newComment.trim(),
    };

    setComments([nextComment, ...comments]);
    setNewComment("");
  };

  if (!user) return <p>Please log in to use this feature.</p>;
  return (
    <div className="community-comments">
      <h3>Community Comments ({county.name})</h3>

      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={newComment}
          placeholder="Share your experience, advice, or question..."
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button type="submit">Post</button>
      </form>

      <div className="comment-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment-item">
            <strong>{comment.author}</strong>
            <p>{comment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityComments;
