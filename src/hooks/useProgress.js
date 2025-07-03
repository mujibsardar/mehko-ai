import { useState, useEffect } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function useProgress(userId, applicationId) {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  const ref = doc(db, "users", userId, "applicationProgress", applicationId);

  useEffect(() => {
    const unsub = onSnapshot(ref, (docSnap) => {
      setCompletedSteps(
        docSnap.exists() ? docSnap.data().completedStepIds || [] : []
      );
      setLoading(false);
    });
    return unsub;
  }, [userId, applicationId]);

  const markStepComplete = async (stepId) => {
    await setDoc(
      ref,
      { completedStepIds: arrayUnion(stepId) },
      { merge: true }
    );
  };

  const markStepIncomplete = async (stepId) => {
    await setDoc(
      ref,
      { completedStepIds: arrayRemove(stepId) },
      { merge: true }
    );
  };

  return {
    completedSteps,
    loading,
    markStepComplete,
    markStepIncomplete,
  };
}
