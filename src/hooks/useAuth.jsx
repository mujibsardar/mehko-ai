// src/hooks/useAuth.js
import { useEffect, useState, createContext, useContext } from "react";
import { auth } from "../firebase/firebase";
import { db } from "../firebase/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Check for admin status using Firebase custom claims
        try {
          const token = await user.getIdTokenResult();
          if (token.claims.admin === true) {
            setIsAdmin(true);
          } else {
            // Fallback to Firestore user document check
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === "admin") {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  // Helper function to check if current user is admin
  const checkAdminStatus = async () => {
    if (!user) return false;

    try {
      const token = await user.getIdTokenResult();
      if (token.claims.admin === true) {
        setIsAdmin(true);
        return true;
      }

      // Fallback to Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        setIsAdmin(true);
        return true;
      }

      setIsAdmin(false);
      return false;
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        checkAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default function useAuth() {
  return useContext(AuthContext);
}
