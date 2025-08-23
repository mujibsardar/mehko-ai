import React from "react";
import useAuth from "../../hooks/useAuth";
import AuthModal from "../auth/AuthModal";
import { useAuthModal } from "../../providers/AuthModalProvider";
import { Link } from "react-router-dom";
import "./Header.scss";

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { isOpen, openAuthModal, closeAuthModal } = useAuthModal();

  const handleLogout = async () => {
    await logout();
  };

  const handleAuthSuccess = () => {
    // Auth was successful, modal will close automatically
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="app-title" onClick={() => window.location.reload()}>
            <span className="app-icon">🏛️</span>
            MEHKO.ai
          </h1>
        </div>

        <div className="header-right">
          {!user ? (
            <div className="auth-section">
              <button onClick={openAuthModal} className="auth-button">
                <span className="button-icon">🔐</span>
                Sign In
              </button>
            </div>
          ) : (
            <div className="user-section">
              {isAdmin && (
                <Link to="/admin" className="admin-dashboard-link">
                  <span className="admin-icon">👑</span>
                  <span className="admin-text">Admin Dashboard</span>
                </Link>
              )}

              <div className="user-info">
                <span className="user-avatar">
                  {user.displayName
                    ? user.displayName.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </span>
                <span className="user-name">
                  {user.displayName || user.email}
                </span>
              </div>

              <button onClick={handleLogout} className="logout-button">
                <span className="button-icon">🚪</span>
                <span className="button-text">Log Out</span>
              </button>
            </div>
          )}
        </div>
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
