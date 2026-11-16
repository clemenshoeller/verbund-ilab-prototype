import { Component, type ReactNode } from "react";

/** Keeps the frame of the app alive if a page fails, and offers a way back. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: { resetKey: string }) {
    // Moving to another page clears the error.
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="card">
        <h1>This page could not be shown.</h1>
        <p className="lead">Nothing was lost. Go back to the dashboard, or reset the demo data in the menu at the top right if it happens again.</p>
        <p style={{ marginTop: 16 }}>
          <a className="btn" href="#/team">
            Back to the dashboard
          </a>
        </p>
      </div>
    );
  }
}
