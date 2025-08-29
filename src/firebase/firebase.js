import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  _apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  _authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  _projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
