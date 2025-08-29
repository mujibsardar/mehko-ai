import { useEffect, useState, useCallback } from "react";
import { db } from "../firebase/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  getDoc,
} from "firebase/firestore";

export default function useProgress(userId, applicationId) {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loading, setLoading] = useState(false);

  // subscribe only when both IDs are ready
  useEffect(() => {
    if (!userId || !applicationId) {
      setCompletedSteps([]); // reset for safety
      return; // no Firestore calls
    }

    setLoading(true);
    const ref = doc(db, "users", userId, "applicationProgress", applicationId);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setCompletedSteps(
          snap.exists() ? snap.data().completedStepIds || [] : []
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [userId, applicationId]);

  const ensureDoc = useCallback(async () => {
    if (!userId || !applicationId) return null;
    const ref = doc(db, "users", userId, "applicationProgress", applicationId);
    const snap = await getDoc(ref);
    if (!snap.exists()) await setDoc(ref, { _completedStepIds: [] });
    return ref;
  }, [userId, applicationId]);

  const markStepComplete = useCallback(
    async (stepId) => {
      if (!userId || !applicationId || !stepId) return;
      const ref = await ensureDoc();
      if (!ref) return;
      await updateDoc(ref, { _completedStepIds: arrayUnion(stepId) });
    },
    [userId, applicationId, ensureDoc]
  );

  const markStepIncomplete = useCallback(
    async (stepId) => {
      if (!userId || !applicationId || !stepId) return;
      const ref = await ensureDoc();
      if (!ref) return;
      await updateDoc(ref, { _completedStepIds: arrayRemove(stepId) });
    },
    [userId, applicationId, ensureDoc]
  );

  return { completedSteps, loading, markStepComplete, markStepIncomplete };
}
