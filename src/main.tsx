import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { supabase } from './lib/supabase';

// Keep the Supabase client import so it initializes on app startup.
// This prevents tree-shaking if your app relies on initialization side effects.
void supabase;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
