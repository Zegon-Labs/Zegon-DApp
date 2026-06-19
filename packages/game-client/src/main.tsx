import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "sileo/styles.css";
import "./styles/hero.css";
import { applyPreferences, getPreferences } from "./services/preferences.js";

applyPreferences(getPreferences());

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
