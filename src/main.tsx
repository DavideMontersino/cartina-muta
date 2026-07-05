import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/theme.css";

// iOS Safari ignores `user-scalable=no`, so a stray pinch zooms the whole page
// (and scrolls the HUD off-screen). Block the page-level pinch gesture; the map
// does its own in-canvas zoom via pointer events.
for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
  document.addEventListener(type, (e) => e.preventDefault(), {
    passive: false,
  });
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
