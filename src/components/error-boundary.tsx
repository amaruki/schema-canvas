"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Uncaught render error:", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            An unexpected error occurred while rendering the app. Your schema
            data is safe - reload to continue.
          </p>
          <Button onClick={this.handleReload}>Reload App</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
