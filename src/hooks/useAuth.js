import { useState } from "react";

export default function useAuth() {
  const [userId] = useState(null); // Replace with real ID when implemented
  const [isAuthenticated] = useState(false);

  const signIn = () => {
    console.log("Sign-in not implemented yet");
  };

  const signOut = () => {
    console.log("Sign-out not implemented yet");
  };

  return {
    userId,
    isAuthenticated,
    signIn,
    signOut,
  };
}
