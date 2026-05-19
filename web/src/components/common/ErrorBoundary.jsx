import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="font-display text-3xl text-primary-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Please refresh the page or try again later.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
