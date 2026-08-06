import React from 'react';
import ErrorPage from '../pages/ErrorPage';

/**
 * Catches render-time errors anywhere in the route tree and shows the
 * branded 500 error page instead of a blank white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Uncaught error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage type="500" />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
