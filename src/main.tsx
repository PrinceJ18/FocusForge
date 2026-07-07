import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase';
import { formatLocalDate } from './lib/dateUtils';

if (import.meta.env.DEV) {
  (window as any).__focusforgeDebug = {
    testFocusRPC: async () => {
      const today = formatLocalDate(new Date());

      const payload = {
        p_session_date: today,
        p_minutes: 1,
        p_reference_id: `manual_test_${Date.now()}`,
        p_today: today,
      };

      const result = await supabase.rpc('log_focus_session', payload);

      console.log('Focus RPC test payload:', payload);
      console.log('Focus RPC test result:', result);

      return result;
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

