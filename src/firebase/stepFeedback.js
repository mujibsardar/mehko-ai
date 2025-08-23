import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// Structure: applications/{applicationId}/steps/{stepId}/substeps/{subStepIndex}/feedback/{userId}
// Each user can have one feedback record per sub-step

export async function getSubStepFeedback(applicationId, stepId, subStepIndex, userId) {
  try {
    const feedbackRef = doc(
      db,
      "applications",
      applicationId,
      "steps",
      stepId,
      "substeps",
      subStepIndex.toString(),
      "feedback",
      userId
    );
    const feedbackDoc = await getDoc(feedbackRef);
    
    if (feedbackDoc.exists()) {
      return feedbackDoc.data();
    }
    
    // Return default feedback state if none exists
    return {
      liked: false,
      disliked: false,
      timestamp: null,
    };
  } catch (error) {
    console.error("Error fetching sub-step feedback:", error);
    return {
      liked: false,
      disliked: false,
      timestamp: null,
    };
  }
}

export async function updateSubStepFeedback(applicationId, stepId, subStepIndex, userId, feedback) {
  try {
    const feedbackRef = doc(
      db,
      "applications",
      applicationId,
      "steps",
      stepId,
      "substeps",
      subStepIndex.toString(),
      "feedback",
      userId
    );
    
    // Use setDoc with merge to create or update the document
    await setDoc(
      feedbackRef,
      {
        ...feedback,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    
    return true;
  } catch (error) {
    console.error("Error updating sub-step feedback:", error);
    throw error;
  }
}

export async function toggleSubStepLike(applicationId, stepId, subStepIndex, userId) {
  try {
    const currentFeedback = await getSubStepFeedback(applicationId, stepId, subStepIndex, userId);
    
    const newFeedback = {
      liked: !currentFeedback.liked,
      disliked: false, // Remove dislike when liking
      timestamp: serverTimestamp(),
    };
    
    await updateSubStepFeedback(applicationId, stepId, subStepIndex, userId, newFeedback);
    return newFeedback;
  } catch (error) {
    console.error("Error toggling sub-step like:", error);
    throw error;
  }
}

export async function toggleSubStepDislike(applicationId, stepId, subStepIndex, userId) {
  try {
    const currentFeedback = await getSubStepFeedback(applicationId, stepId, subStepIndex, userId);
    
    const newFeedback = {
      liked: false, // Remove like when disliking
      disliked: !currentFeedback.disliked,
      timestamp: serverTimestamp(),
    };
    
    await updateSubStepFeedback(applicationId, stepId, subStepIndex, userId, newFeedback);
    return newFeedback;
  } catch (error) {
    console.error("Error toggling sub-step dislike:", error);
    throw error;
  }
}

// Legacy functions for backward compatibility (can be removed later)
export async function getStepFeedback(applicationId, stepId, userId) {
  console.warn("getStepFeedback is deprecated. Use getSubStepFeedback instead.");
  return getSubStepFeedback(applicationId, stepId, "0", userId);
}

export async function updateStepFeedback(applicationId, stepId, userId, feedback) {
  console.warn("updateStepFeedback is deprecated. Use updateSubStepFeedback instead.");
  return updateSubStepFeedback(applicationId, stepId, "0", userId, feedback);
}

export async function toggleStepLike(applicationId, stepId, userId) {
  console.warn("toggleStepLike is deprecated. Use toggleSubStepLike instead.");
  return toggleSubStepLike(applicationId, stepId, "0", userId);
}

export async function toggleStepDislike(applicationId, stepId, userId) {
  console.warn("toggleStepDislike is deprecated. Use toggleSubStepDislike instead.");
  return toggleSubStepDislike(applicationId, stepId, "0", userId);
}

export async function getStepFeedbackStats(applicationId, stepId) {
  try {
    // This would require a more complex query to aggregate all feedback
    // For now, we'll return a placeholder structure
    // In a production app, you might want to use Cloud Functions or maintain counters
    return {
      totalLikes: 0, // Would need to be calculated
      totalDislikes: 0, // Would need to be calculated
      totalFeedback: 0, // Would need to be calculated
    };
  } catch (error) {
    console.error("Error fetching step feedback stats:", error);
    return {
      totalLikes: 0,
      totalDislikes: 0,
      totalFeedback: 0,
    };
  }
}
