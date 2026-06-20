import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "sileo/styles.css";
import "./styles/hero.css";
import { applyPreferences, getPreferences } from "./services/preferences.js";
import { startBackgroundMusic } from "./services/music.js";

applyPreferences(getPreferences());
startBackgroundMusic();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
