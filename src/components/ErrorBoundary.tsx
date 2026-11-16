import { Component, type ReactNode } from "react";
import { STORAGE_KEY } from "../lib/store";

/**
 * Keeps the app usable if something fails to render and offers a way out.
 * `scope="page"` wraps one page inside the frame; `scope="app"` wraps everything
 * and can also throw away the saved demo data, the most likely cause at that level.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; scope: "page" | "app" }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const app = this.props.scope === "app";
    return (
      <div className={app ? "state" : "card"} role="alert">
        <h1>{app ? "The app could not be shown." : "This page could not be shown."}</h1>
        <p className="lead">{app ? "Resetting the demo data usually fixes it. Nothing outside this browser is affected." : "Go back to the start page. If it happens again, reset the demo data in the menu at the top right."}</p>
        <p style={{ marginTop: 16 }}>
          {app ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                try {
                  localStorage.removeItem(STORAGE_KEY);
                } catch {
                  // Storage blocked: a reload is still worth a try.
                }
                window.location.hash = "/";
                window.location.reload();
              }}
            >
              Reset the demo data and reload
            </button>
          ) : (
            <a className="btn" href="#/">
              Back to the start page
            </a>
          )}
        </p>
      </div>
    );
  }
}
