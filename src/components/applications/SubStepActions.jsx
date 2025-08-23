import React, { useState } from "react";
import "./SubStepActions.scss";
import useAuth from "../../hooks/useAuth";

function SubStepActions({ 
  subStepText, 
  stepId, 
  applicationId, 
  application, 
  onCommentRequest 
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const handleInternetSearch = () => {
    // Simple search: MEHKO + jurisdiction + sub-step text
    const jurisdiction = application?.title || application?.id || "";
    let location = "";
    if (jurisdiction.toLowerCase().includes("los angeles")) {
      location = "Los Angeles County";
    } else if (jurisdiction.toLowerCase().includes("san diego")) {
      location = "San Diego County";
    } else if (jurisdiction.toLowerCase().includes("county")) {
      location = jurisdiction;
    }
    
    const searchQuery = encodeURIComponent(`MEHKO ${location} ${subStepText}`);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;
    
    window.open(searchUrl, "_blank", "noopener,noreferrer");
  };

  const handleAIChat = () => {
    // This will be handled by the parent component to open AI chat
    // with context about this specific sub-step
    if (onCommentRequest) {
      onCommentRequest({
        type: "ai_chat",
        subStepText,
        stepId,
        applicationId
      });
    }
  };

  const handleLike = () => {
    if (!user) return;
    if (liked) {
      setLiked(false);
    } else {
      setLiked(true);
      if (disliked) setDisliked(false);
    }
  };

  const handleDislike = () => {
    if (!user) return;
    if (disliked) {
      setDisliked(false);
    } else {
      setDisliked(true);
      if (liked) setLiked(false);
    }
  };

  const handleComment = () => {
    if (!user) return;
    if (onCommentRequest) {
      onCommentRequest({
        type: "comment",
        subStepText,
        stepId,
        applicationId
      });
    }
  };

  return (
    <div className="sub-step-actions">
      {/* Action Icons */}
      <div className="action-icons">
        <button
          className="action-icon internet-icon"
          onClick={handleInternetSearch}
          title="Search the web (opens in new tab)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </button>
        
        <button
          className="action-icon ai-icon"
          onClick={handleAIChat}
          title="Ask AI for help with this step"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>
      </div>

      {/* Like/Dislike and Comment */}
      <div className="feedback-actions">
        <button
          className={`feedback-btn like-btn ${liked ? 'active' : ''}`}
          onClick={handleLike}
          title="Like"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
          </svg>
        </button>
        
        <button
          className={`feedback-btn dislike-btn ${disliked ? 'active' : ''}`}
          onClick={handleDislike}
          title="Dislike"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </button>
        
        <button
          className="feedback-btn comment-btn"
          onClick={handleComment}
          title="Add to community discussion"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SubStepActions;
