import { createRoot } from "react-dom/client";


import "./styles/overlay.css";
import "./styles/app.scss";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DataProvider>
      <FeedbacksProvider>
        <WindowProvider>
          <BrowserRouter>
            <AuthProvider>
              <Preloader>
                <App />
              </Preloader>
            </AuthProvider>
          </BrowserRouter>
        </WindowProvider>
      </FeedbacksProvider>
    </DataProvider>
  </StrictMode>
);
