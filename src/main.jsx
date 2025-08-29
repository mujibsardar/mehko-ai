import { _StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { _BrowserRouter } from "react-router-dom";

import { DataProvider } from "./providers/DataProvider";
import { FeedbacksProvider } from "./providers/FeedbacksProvider";
import { WindowProvider } from "./providers/WindowProvider";
import { AuthProvider } from "./hooks/useAuth";
import { AuthModalProvider } from "./providers/AuthModalProvider";

import App from "./App.jsx";
import Preloader from "./components/Preloader.jsx";
import "./styles/overlay.css";
import "./styles/app.scss";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DataProvider>
      <FeedbacksProvider>
        <WindowProvider>
          <BrowserRouter>
            <AuthProvider>
              <AuthModalProvider>
                <Preloader>
                  <App />
                </Preloader>
              </AuthModalProvider>
            </AuthProvider>
          </BrowserRouter>
        </WindowProvider>
      </FeedbacksProvider>
    </DataProvider>
  </StrictMode>
);
