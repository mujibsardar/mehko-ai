import React, { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/firebase";

export default function Header() {
  const { user, login, logout } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [mode, setMode] = useState("login"); // or 'signup'
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setError("");
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await createUserWithEmailAndPassword(auth, form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
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
            <input
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              style={styles.input}
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              style={styles.input}
            />
            <button onClick={handleSubmit} style={styles.button}>
              {mode === "login" ? "Log In" : "Sign Up"}
            </button>
            <button
              type="button"
              style={styles.linkButton}
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Log in"}
            </button>
            {error && <p style={styles.error}>{error}</p>}
          </div>
        ) : (
          <div style={styles.authBox}>
            <span style={{ marginRight: "1rem" }}>{user.email}</span>
            <button onClick={handleLogout} style={styles.button}>
              Log Out
            </button>
          </div>
        )}
      </div>
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
  input: {
    padding: "0.25rem 0.5rem",
    fontSize: "0.9rem",
  },
  button: {
    padding: "0.25rem 0.75rem",
    cursor: "pointer",
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#007bff",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "0.85rem",
  },
  error: {
    color: "red",
    fontSize: "0.8rem",
    marginLeft: "1rem",
  },
};
