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
          recurring_expense_id: string | null;
          recurring_occurrence_date: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          priority: string;
          section_id: string | null;
          scheduled_date: string | null;
          deadline: string | null;
          has_no_end_date: boolean;
          reminder_enabled: boolean;
          reminder_time: string | null;
          recurrence_type: string;
          recurrence_interval: number | null;
          recurrence_weekdays: string[] | null;
          recurrence_end_date: string | null;
          completed: boolean;
          status: 'pending' | 'completed' | 'wont_do';
          subject: string;
          created_at: string;
          completed_at: string | null;
          updated_at: string;
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
      task_sections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
      };
      task_completions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          occurrence_date: string;
          completed: boolean;
          status: 'pending' | 'completed' | 'wont_do';
          completed_at: string;
          created_at: string;
          updated_at: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          period: 'daily' | 'weekly' | 'monthly' | 'custom' | 'long_term';
          progress_method: 'milestone' | 'manual';
          manual_progress_pct: number;
          start_date: string;
          deadline: string | null;
          status: 'in_progress' | 'completed' | 'delayed' | 'abandoned';
          is_strict: boolean;
          base_xp: number;
          bonus_xp: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      goal_milestones: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          title: string;
          completed: boolean;
          completed_at: string | null;
          xp_reward: number;
          sort_order: number;
          linked_task_id: string | null;
          created_at: string;
          updated_at: string;
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
