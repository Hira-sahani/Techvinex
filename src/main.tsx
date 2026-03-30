import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Hide splash screen
const splash = document.getElementById("splash-screen");
if (splash) splash.style.display = "none";
