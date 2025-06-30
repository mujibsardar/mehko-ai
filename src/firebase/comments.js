import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export async function fetchComments(applicationId) {
  const ref = collection(db, "applications", applicationId, "comments");
  const q = query(ref, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function addComment(applicationId, commentData) {
  const ref = collection(db, "applications", applicationId, "comments");
  await addDoc(ref, {
    ...commentData,
    timestamp: serverTimestamp(),
  });
}
export async function deleteComment(applicationId, commentId) {
  const ref = collection(db, "applications", applicationId, "comments");
  const docRef = ref.doc(commentId);
  await docRef.delete();
}

export async function updateComment(applicationId, commentId, updatedData) {
  const ref = collection(db, "applications", applicationId, "comments");
  const docRef = ref.doc(commentId);
  await docRef.update(updatedData);
}

export async function fetchCommentById(applicationId, commentId) {
  const ref = collection(db, "applications", applicationId, "comments");
  const docRef = ref.doc(commentId);
  const doc = await docRef.get();
  if (doc.exists) {
    return { id: doc.id, ...doc.data() };
  } else {
    throw new Error("Comment not found");
  }
}
export async function fetchCommentsByUser(applicationId, userId) {
  const ref = collection(db, "applications", applicationId, "comments");
  const q = query(ref, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((comment) => comment.userId === userId);
}
