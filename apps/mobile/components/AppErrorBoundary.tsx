import React from "react";
import { FullscreenMessage } from "./FullscreenMessage";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("AppErrorBoundary caught a render error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <FullscreenMessage
          title="ElevateX could not start"
          detail={this.state.errorMessage || "A startup error occurred. Please reopen the app."}
        />
      );
    }

    return this.props.children;
  }
}