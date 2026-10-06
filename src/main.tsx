import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AccountProvider } from "./account";
import { PrivacyPage } from "./components/PrivacyPage";
import "./styles/app.css";
import "./styles/work-preview.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    {window.location.pathname.replace(/\/$/, "") === "/privacy" ? (
      <PrivacyPage />
    ) : (
      <AccountProvider>
        <App />
      </AccountProvider>
    )}
  </StrictMode>,
);
