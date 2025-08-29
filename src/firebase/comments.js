import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";

export async function fetchComments(applicationId) {
  const ref = collection(db, "applications", applicationId, "comments");
  const q = query(ref, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
}

export async function addComment(applicationId, commentData) {
  const ref = collection(db, "applications", applicationId, "comments");
  await addDoc(ref, {
    ...commentData,
    _timestamp: serverTimestamp(),
    _reactions: {},
  });
}

export async function deleteComment(applicationId, commentId) {
  const ref = collection(db, "applications", applicationId, "comments");
  const docRef = doc(ref, commentId);
  await updateDoc(docRef, { _deleted: true });
}

export async function updateComment(applicationId, commentId, updatedData) {
  const ref = collection(db, "applications", applicationId, "comments");
  const docRef = doc(ref, commentId);
  await updateDoc(docRef, updatedData);
}

export async function fetchCommentById(applicationId, commentId) {
  const ref = collection(db, "applications", applicationId, "comments");
  const docRef = doc(ref, commentId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { _id: docSnap.id, ...docSnap.data() };
  } else {
    throw new Error("Comment not found");
  }
}

export async function fetchCommentsByUser(applicationId, userId) {
  const ref = collection(db, "applications", applicationId, "comments");
  const q = query(ref, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((doc) => ({ _id: doc.id, ...doc.data() }))
    .filter((comment) => comment.userId === userId);
}

// New reaction functions
export async function addReaction(applicationId, commentId, userId, emoji) {
  const ref = collection(db, "applications", applicationId, "comments");
  const docRef = doc(ref, commentId);

  // Get current comment to check existing reactions
  const commentDoc = await getDoc(docRef);
  if (!commentDoc.exists()) return;

  const commentData = commentDoc.data();
  const currentReactions = commentData.reactions || {};
  const userReactions = currentReactions[userId] || [];

  // Add emoji to user's reactions if not already present
  if (!userReactions.includes(emoji)) {
    await updateDoc(docRef, {
      [`reactions.${userId}`]: arrayUnion(emoji),
    });
  }
}

export async function removeReaction(applicationId, commentId, userId, emoji) {
  const ref = collection(db, "applications", applicationId, "comments");
  const docRef = doc(ref, commentId);

  await updateDoc(docRef, {
    [`reactions.${userId}`]: arrayRemove(emoji),
  });
}
