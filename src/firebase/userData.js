import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function saveChatMessages(userId, applicationId, messages) {
  const ref = doc(db, "users", userId, "aiChats", applicationId);
  await setDoc(ref, { messages }, { merge: true });
}

export async function loadChatMessages(userId, applicationId) {
  const ref = doc(db, "users", userId, "aiChats", applicationId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().messages : [];
}

export async function saveFormData(userId, applicationId, formName, data) {
  const ref = doc(db, "users", userId, "formProgress", applicationId);
  await setDoc(ref, { [formName]: data }, { merge: true });
}

export async function loadFormData(userId, applicationId, formName) {
  const ref = doc(db, "users", userId, "formProgress", applicationId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data()[formName] || {} : {};
}

export async function pinApplication(userId, applicationId, source = "form") {
  const ref = doc(db, "users", userId, "pinnedApplications", applicationId);
  await setDoc(
    ref,
    {
      pinnedAt: new Date(),
      triggeredBy: source,
    },
    { merge: true }
  );
}

export async function unpinApplication(userId, applicationId) {
  const ref = doc(db, "users", userId, "pinnedApplications", applicationId);
  await deleteDoc(ref);
}
