import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import useAuth from "./useAuth";

export default function usePinnedApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const snapshot = await getDocs(
        collection(db, "users", user.uid, "pinnedApplications")
      );

      const appIds = snapshot.docs.map((doc) => doc.id);
      const appDocs = await Promise.all(
        appIds.map((id) => getDoc(doc(db, "applications", id)))
      );

      const apps = appDocs
        .filter((snap) => snap.exists())
        .map((snap) => ({ _id: snap.id, ...snap.data() }));

      setApplications(apps);
      setLoading(false);
    }

    load();
  }, [user]);

  return { applications, loading };
}
