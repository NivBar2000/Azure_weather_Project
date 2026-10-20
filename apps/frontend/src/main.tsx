import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import App from "./App";
import { initializeAuthentication } from "./auth/authConfig";
import "./styles.css";

async function bootstrap(): Promise<void> {
  const root = createRoot(document.getElementById("root")!);
  try {
    const authentication = await initializeAuthentication();
    root.render(
      <StrictMode>
        <MsalProvider instance={authentication}>
          <App />
        </MsalProvider>
      </StrictMode>,
    );
  } catch {
    root.render(
      <main className="page-shell">
        <p className="notice error-message" role="alert">
          Authentication could not be initialized. Check the public Entra
          configuration and rebuild the frontend.
        </p>
      </main>,
    );
  }
}

void bootstrap();
