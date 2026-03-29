import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ThreeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[3D Scene Error]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: "oklch(0.08 0.02 232)",
              color: "oklch(0.6 0.05 232)",
              fontFamily: "sans-serif",
              fontSize: "0.9rem",
            }}
          >
            3D scene unavailable in this environment
          </div>
        )
      );
    }
    return this.props.children;
  }
}
