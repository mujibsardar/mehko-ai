import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { DataProvider } from "./providers/DataProvider";
import { FeedbacksProvider } from "./providers/FeedbacksProvider";
import { WindowProvider } from "./providers/WindowProvider";

import { AuthProvider } from "./hooks/useAuth";

import App from "./App.jsx";
import Preloader from "./components/Preloader.jsx";
import "./styles/overlay.css";

console.log("main.jsx loaded");

const AppProviders = ({ children }) => (
  <DataProvider>
    <FeedbacksProvider>
      <WindowProvider>{children}</WindowProvider>
    </FeedbacksProvider>
  </DataProvider>
);

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");
  const container = document.getElementById("root");
  if (!container) return;
  console.log("Container found, rendering app");

  createRoot(container).render(
    <StrictMode>
      <AuthProvider>
        <Preloader>
          <App />
        </Preloader>
      </AuthProvider>
    </StrictMode>
  );
});
