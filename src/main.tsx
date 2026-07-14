import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase';

declare global {
  interface Window {
    __focusforgeDebug?: {
      testAchievementRPC: (achievementId: string) => Promise<any>;
    };
  }
}

if (import.meta.env.DEV) {
  window.__focusforgeDebug = {
    testAchievementRPC: async (achievementId: string) => {
      const { data, error } = await supabase.rpc('unlock_achievement', {
        p_achievement_id: achievementId
      });
      
      const result = {
        achievementId,
        data,
        error: error ? {
          message: error.message,
          details: error.details,
          hint: (error as any).hint,
          code: error.code
        } : null
      };

      console.log('__focusforgeDebug.testAchievementRPC:', result);
      return result;
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
