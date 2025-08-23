import React, { useState, useEffect } from "react";
import "./SubStepActions.scss";
import useAuth from "../../hooks/useAuth";
import {
  getSubStepFeedback,
  toggleSubStepLike,
  toggleSubStepDislike,
  getSubStepFeedbackStats,
} from "../../firebase/stepFeedback";

function SubStepActions({
  subStepText,
  stepId,
  applicationId,
  application,
  step,
  onCommentRequest,
  subStepIndex,
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState({
    totalLikes: 0,
    totalDislikes: 0,
  });

  // Load existing feedback when component mounts
  useEffect(() => {
    if (user?.uid && applicationId && stepId && subStepIndex !== undefined) {
      loadFeedback();
    }
  }, [user?.uid, applicationId, stepId, subStepIndex]);

  const loadFeedback = async () => {
    console.log("🔍 Debug - Loading feedback:", {
      applicationId,
      stepId,
      subStepIndex,
      userId: user.uid,
    });
    try {
      const feedback = await getSubStepFeedback(
        applicationId,
        stepId,
        subStepIndex,
        user.uid
      );
      console.log("✅ Feedback loaded:", feedback);
      setLiked(feedback.liked || false);
      setDisliked(feedback.disliked || false);

      // Load feedback stats
      const stats = await getSubStepFeedbackStats(
        applicationId,
        stepId,
        subStepIndex
      );
      setFeedbackStats(stats);
    } catch (error) {
      console.error("❌ Error loading feedback:", error);
    }
  };

  const handleInternetSearch = () => {
    // Use searchTerms from the step if available, otherwise fall back to content
    let searchText = "";

    if (
      step?.searchTerms &&
      Array.isArray(step.searchTerms) &&
      step.searchTerms.length > 0
    ) {
      // Use the first search term as the primary search
      searchText = step.searchTerms[0];
    } else if (subStepText) {
      // Fallback to using the sub-step text (truncated)
      searchText =
        subStepText.length > 100
          ? subStepText.substring(0, 100) + "..."
          : subStepText;
    } else {
      searchText = "MEHKO application";
    }

    let location = "";

    // First try to get the county name from the title
    if (application?.title) {
      if (application.title.toLowerCase().includes("los angeles")) {
        location = "Los Angeles County";
      } else if (application.title.toLowerCase().includes("san diego")) {
        location = "San Diego County";
      } else if (application.title.toLowerCase().includes("alameda")) {
        location = "Alameda County";
      } else if (application.title.toLowerCase().includes("santa barbara")) {
        location = "Santa Barbara County";
      } else if (application.title.toLowerCase().includes("sonoma")) {
        location = "Sonoma County";
      } else if (application.title.toLowerCase().includes("county")) {
        location = application.title;
      }
    }

    // If no location found from title, use the application ID
    if (!location && application?.id) {
      location = application.id
        .replace(/_/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase());
    }

    // Final fallback
    if (!location) {
      location = "MEHKO";
    }

    // Don't duplicate the county name if it's already in the search text
    let finalSearchText = searchText;
    if (location && searchText.toLowerCase().includes(location.toLowerCase())) {
      // If the location is already in the search text, just use the search text
      finalSearchText = searchText;
    } else {
      // Otherwise, combine location and search text
      finalSearchText = `${location} ${searchText}`;
    }
    
    const searchQuery = encodeURIComponent(finalSearchText);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

    window.open(searchUrl, "_blank", "noopener,noreferrer");
  };

  const handleAIChat = () => {
    // This will be handled by the parent component to open AI chat
    // with context about this specific sub-step
    if (onCommentRequest) {
      // Use searchTerms for better AI context if available
      const aiContext =
        step?.searchTerms &&
        Array.isArray(step.searchTerms) &&
        step.searchTerms.length > 0
          ? step.searchTerms.join(", ")
          : subStepText;

      onCommentRequest({
        type: "ai_chat",
        subStepText: aiContext,
        stepId,
        applicationId,
      });
    }
  };

  const handleLike = async () => {
    if (!user || isLoading) return;

    console.log("🔍 Debug - Like clicked:", {
      applicationId,
      stepId,
      subStepIndex,
      userId: user.uid,
    });

    setIsLoading(true);

    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.warn("⚠️ Like operation timed out after 5 seconds");
      setIsLoading(false);
    }, 5000);

    try {
      const newFeedback = await toggleSubStepLike(
        applicationId,
        stepId,
        subStepIndex,
        user.uid
      );
      console.log("✅ Like updated successfully:", newFeedback);
      setLiked(newFeedback.liked);
      setDisliked(newFeedback.disliked);

      // Update local feedback stats
      if (newFeedback.liked) {
        setFeedbackStats((prev) => ({
          ...prev,
          totalLikes: prev.totalLikes + 1,
          totalDislikes: prev.totalDislikes > 0 ? prev.totalDislikes - 1 : 0,
        }));
      } else {
        setFeedbackStats((prev) => ({
          ...prev,
          totalLikes: prev.totalLikes > 0 ? prev.totalLikes - 1 : 0,
        }));
      }
    } catch (error) {
      console.error("❌ Error toggling like:", error);
      // Revert local state on error
      setLiked(!liked);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!user || isLoading) return;

    console.log("🔍 Debug - Dislike clicked:", {
      applicationId,
      stepId,
      subStepIndex,
      userId: user.uid,
    });

    setIsLoading(true);

    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.warn("⚠️ Dislike operation timed out after 5 seconds");
      setIsLoading(false);
    }, 5000);

    try {
      const newFeedback = await toggleSubStepDislike(
        applicationId,
        stepId,
        subStepIndex,
        user.uid
      );
      console.log("✅ Dislike updated successfully:", newFeedback);
      setLiked(newFeedback.liked);
      setDisliked(newFeedback.disliked);

      // Update local feedback stats
      if (newFeedback.disliked) {
        setFeedbackStats((prev) => ({
          ...prev,
          totalDislikes: prev.totalDislikes + 1,
          totalLikes: prev.totalLikes > 0 ? prev.totalLikes - 1 : 0,
        }));
      } else {
        setFeedbackStats((prev) => ({
          ...prev,
          totalDislikes: prev.totalDislikes > 0 ? prev.totalDislikes - 1 : 0,
        }));
      }
    } catch (error) {
      console.error("❌ Error toggling dislike:", error);
      // Revert local state on error
      setIsLoading(false);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleComment = () => {
    if (!user) return;
    if (onCommentRequest) {
      onCommentRequest({
        type: "comment",
        subStepText,
        stepId,
        applicationId,
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
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </button>

        <button
          className="action-icon ai-icon"
          onClick={handleAIChat}
          title="Ask AI for help with this step"
        >
          <span style={{ fontSize: "16px" }}>🤖</span>
        </button>
      </div>

      {/* Like/Dislike and Comment */}
      <div className="feedback-actions">
        <button
          className={`feedback-btn like-btn ${liked ? "active" : ""}`}
          onClick={handleLike}
          disabled={isLoading}
          title="Like"
        >
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
            </svg>
          )}
        </button>

        <button
          className={`feedback-btn dislike-btn ${disliked ? "active" : ""}`}
          onClick={handleDislike}
          disabled={isLoading}
          title="Dislike"
        >
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2z" />
            </svg>
          )}
        </button>

        <button
          className="feedback-btn comment-btn"
          onClick={handleComment}
          title="Add to community discussion"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        </button>
      </div>

      {/* Subtle Feedback Counts */}
      {(feedbackStats.totalLikes > 0 || feedbackStats.totalDislikes > 0) && (
        <div className="feedback-counts">
          {feedbackStats.totalLikes > 0 && (
            <span className="count-item like-count">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
              </svg>
              {feedbackStats.totalLikes}
            </span>
          )}
          {feedbackStats.totalDislikes > 0 && (
            <span className="count-item dislike-count">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2z" />
              </svg>
              {feedbackStats.totalDislikes}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default SubStepActions;
