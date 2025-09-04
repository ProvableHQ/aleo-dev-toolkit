import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { init } from "@amplitude/analytics-browser";
import "./index.css";
import App from "./App.jsx";

// Initialize Amplitude only if API key is provided
if (import.meta.env.VITE_AMPLITUDE_API_KEY) {
  init(import.meta.env.VITE_AMPLITUDE_API_KEY, {
    autocapture: true,
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>
);
