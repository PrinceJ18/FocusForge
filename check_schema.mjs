import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
  // Sign up a fake user to get a token
  const email = `test_${Date.now()}@example.com`;
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }
  
  const user = authData.user;
  
  // Try inserting a task with all possible V2 columns
  const testTask = {
    user_id: user.id,
    title: "Test Task",
    status: "pending",
    completed_at: null,
    updated_at: new Date().toISOString(),
    recurrence_type: "none",
    recurrence_interval: null,
    recurrence_weekdays: null,
    recurrence_end_date: null,
    section_id: null,
    has_no_end_date: true
  };
  
  // Insert exactly these keys one by one to see which ones fail
  for (const key of Object.keys(testTask)) {
    if (key === 'user_id' || key === 'title') continue; // baseline
    const payload = { user_id: user.id, title: "Test", [key]: testTask[key] };
    const { error } = await supabase.from('tasks').insert(payload);
    if (error && error.message.includes("Could not find the")) {
      console.log(`Column MISSING: ${key}`);
    } else {
      console.log(`Column EXISTS: ${key}`);
    }
  }
}

checkSchema().catch(console.error);
