import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Fire-and-forget: Sentry init fetches its DSN from a public edge function.
// Errors thrown before init resolves are still caught by AppErrorBoundary
// (which re-captures on next render after Sentry is ready).
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
