import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/common/Toast';
import ErrorBoundary     from './components/common/ErrorBoundary';
import LoadingSpinner    from './components/common/LoadingSpinner';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <Suspense fallback={<LoadingSpinner variant="page" text="Loading..." />}>
                <App />
              </Suspense>
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
