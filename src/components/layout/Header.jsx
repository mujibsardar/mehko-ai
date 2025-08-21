import React from "react";
import useAuth from "../../hooks/useAuth";
import AuthModal from "../auth/AuthModal";
import { useAuthModal } from "../../providers/AuthModalProvider";

export default function Header() {
  const { user, logout } = useAuth();
  const { isOpen, openAuthModal, closeAuthModal } = useAuthModal();

  const handleLogout = async () => {
    await logout();
  };

  const handleAuthSuccess = () => {
    // Auth was successful, modal will close automatically
  };

  return (
    <header style={styles.header}>
      <h1
        style={{ cursor: "pointer" }}
        onClick={() => window.location.reload()}
      >
        MEHKO.ai
      </h1>
      <div>
        {!user ? (
          <div style={styles.authBox}>
            <button
              onClick={openAuthModal}
              style={styles.authButton}
            >
              Sign In
            </button>
          </div>
        ) : (
          <div style={styles.authBox}>
            <span style={{ marginRight: "1rem" }}>
              {user.displayName || user.email}
            </span>
            <button onClick={handleLogout} style={styles.button}>
              Log Out
            </button>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isOpen}
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </header>
  );
}

const styles = {
  header: {
    background: "#f8f9fa",
    padding: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #ddd",
  },
  authBox: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    flexWrap: "wrap",
    maxWidth: "500px",
  },
  authButton: {
    padding: "0.5rem 1.5rem",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(102, 126, 234, 0.2)",
  },
  button: {
    padding: "0.25rem 0.75rem",
    cursor: "pointer",
    background: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.85rem",
    transition: "background-color 0.2s ease",
  },
};
