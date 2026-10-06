import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AccountProvider } from "./account";
import "./styles/app.css";
import "./styles/work-preview.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AccountProvider>
      <App />
    </AccountProvider>
  </StrictMode>,
);
