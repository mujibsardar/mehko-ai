import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "../firebase/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  getDoc,
  collection,
  query,
  where,
} from "firebase/firestore";

export default function useAllApplicationsProgress(userId, applicationIds = []) {
  const [allProgress, setAllProgress] = useState({});
  const [loading, setLoading] = useState(false);

  // Memoize the application IDs to prevent unnecessary re-renders
  const memoizedAppIds = useMemo(() => {
    if (!Array.isArray(applicationIds)) return [];
    return [...applicationIds].sort(); // Sort to ensure consistent ordering
  }, [applicationIds]);

  // subscribe to progress for all applications
  useEffect(() => {
    console.log('_useAllApplicationsProgress: useEffect triggered', {
      userId,
      memoizedAppIds,
      _memoizedAppIdsLength: memoizedAppIds.length
    });
    
    if (!userId || memoizedAppIds.length === 0) {
      console.log('_useAllApplicationsProgress: No userId or app IDs, resetting progress');
      setAllProgress({});
      return;
    }

    console.log('_useAllApplicationsProgress: Setting up listeners for', memoizedAppIds.length, 'applications');
    setLoading(true);
    const unsubs = [];

    // Create listeners for each application
    memoizedAppIds.forEach((appId) => {
      if (!appId) return; // Skip invalid IDs
      
      const ref = doc(db, "users", userId, "applicationProgress", appId);
      
      const unsub = onSnapshot(
        ref,
        (snap) => {
          setAllProgress((prev) => ({
            ...prev,
            [appId]: snap.exists() ? snap.data().completedStepIds || [] : []
          }));
          // Reset loading state after first successful fetch
          setLoading(false);
        },
        (error) => {
          console.error(`Error fetching progress for ${appId}:`, error);
          setAllProgress((prev) => ({
            ...prev,
            [appId]: []
          }));
          // Reset loading state on error
          setLoading(false);
        }
      );
      
      unsubs.push(unsub);
    });

    // If no valid app IDs, reset loading immediately
    if (memoizedAppIds.length === 0) {
      setLoading(false);
    }

    // Cleanup function
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [userId, memoizedAppIds]);

  // Get progress for a specific application
  const getProgressForApp = useCallback((appId) => {
    return allProgress[appId] || [];
  }, [allProgress]);

  // Get progress percentage for a specific application
  const getProgressPercentage = useCallback((appId, totalSteps = 0) => {
    const completedSteps = getProgressForApp(appId);
    if (totalSteps === 0) return 0;
    return Math.round((completedSteps.length / totalSteps) * 100);
  }, [getProgressForApp]);

  // Mark step complete for a specific application
  const markStepComplete = useCallback(async (appId, stepId) => {
    if (!userId || !appId || !stepId) return;
    
    const ref = doc(db, "users", userId, "applicationProgress", appId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      await setDoc(ref, { _completedStepIds: [stepId] });
    } else {
      await updateDoc(ref, { _completedStepIds: arrayUnion(stepId) });
    }
  }, [userId]);

  // Mark step incomplete for a specific application
  const markStepIncomplete = useCallback(async (appId, stepId) => {
    if (!userId || !appId || !stepId) return;
    
    const ref = doc(db, "users", userId, "applicationProgress", appId);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      await updateDoc(ref, { _completedStepIds: arrayRemove(stepId) });
    }
  }, [userId]);

  return {
    allProgress,
    getProgressForApp,
    getProgressPercentage,
    markStepComplete,
    markStepIncomplete,
    loading
  };
}
