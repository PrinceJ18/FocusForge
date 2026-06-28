import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string;
          xp: number;
          streak: number;
          last_active_date: string;
          monthly_budget: number;
          total_savings: number;
          badges: Badge[];
          created_at: string;
          updated_at: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          amount: number;
          category: string;
          note: string;
          expense_date: string;
          created_at: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          priority: string;
          deadline: string | null;
          completed: boolean;
          subject: string;
          created_at: string;
          completed_at: string | null;
        };
      };
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_date: string;
          minutes: number;
          sessions_count: number;
          created_at: string;
        };
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          target_amount: number;
          current_amount: number;
          deadline: string | null;
          color: string;
          created_at: string;
          updated_at: string;
        };
      };
      custom_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          created_at: string;
        };
      };
    };
  };
};

export type Badge = {
  id: string;
  name: string;
  icon: string;
  unlockedAt: string;
};
