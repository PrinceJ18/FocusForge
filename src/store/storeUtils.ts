import { supabase } from '../lib/supabase';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { formatLocalDate } from '../lib/dateUtils';
import { useStore } from './useStore';
import type { Task, TaskSection, Profile } from './slices/types';
import { checkUnlocksAndMilestones } from '../lib/events';
import { logEvent } from '../lib/events';

export const saveProfile = async (userId: string, data: Partial<Profile>) => {
  const { monthly_budget, total_savings, ...profileData } = data;

  const promises = [];

  if (Object.keys(profileData).length > 0) {
    promises.push(
      supabase.from('profiles').upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      })
    );
  }

  if (monthly_budget !== undefined || total_savings !== undefined) {
    const financialUpdate: any = { user_id: userId, updated_at: new Date().toISOString() };
    if (monthly_budget !== undefined) financialUpdate.monthly_budget = monthly_budget;
    if (total_savings !== undefined) financialUpdate.total_savings = total_savings;
    
    promises.push(
      supabase.from('user_financial_settings').upsert(financialUpdate)
    );
  }

  const results = await Promise.all(promises);
  results.forEach(res => {
    if (res.error) console.error('saveProfile error:', res.error);
  });
};

export const loadUserData = async (userId: string) => {
  try {
    const { supabase } = await import('../lib/supabase');
    
    // Fetch profile and preferences
    const [profileData, prefsData, financialData] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_financial_settings').select('*').eq('user_id', userId).maybeSingle()
    ]);

    let finalFinancialData = financialData.data;

    // STEP 5: New user initialization logic. If no financial settings exist, create them ONCE.
    if (!finalFinancialData) {
      const defaultSettings = {
        user_id: userId,
        monthly_budget: 10000,
        total_savings: 0,
      };
      
      const { data: newSettings, error: insertErr } = await supabase
        .from('user_financial_settings')
        .insert(defaultSettings)
        .select()
        .single();
        
      if (!insertErr && newSettings) {
        finalFinancialData = newSettings;
      } else {
        // Fallback for current session if insert fails
        finalFinancialData = defaultSettings;
      }
    }

    if (profileData.data) {
      useStore.getState().updateProfile({
        ...profileData.data,
        monthly_budget: finalFinancialData?.monthly_budget ?? 10000,
        total_savings: finalFinancialData?.total_savings ?? 0,
      });
    }

    if (prefsData.data) {
      useStore.getState().updatePreferencesLocal(prefsData.data);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
};

export const fetchTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (data) useStore.getState().setTasks(data.map(t => ({ ...t, status: t.completed ? 'completed' : 'pending' })));
};

export const createTask = async (task: Omit<Task, 'user_id' | 'created_at' | 'updated_at'>, userId: string) => {
  const now = new Date().toISOString();
  const newTask: Task = {
    ...task,
    user_id: userId,
    created_at: now,
    updated_at: now,
  };
  useStore.getState().addTaskLocal(newTask);
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: newTask.id,
      user_id: userId,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      section_id: newTask.section_id,
      scheduled_date: newTask.scheduled_date,
      deadline: newTask.deadline,
      has_no_end_date: newTask.has_no_end_date,
      reminder_enabled: newTask.reminder_enabled,
      reminder_time: newTask.reminder_time,
      recurrence_type: newTask.recurrence_type,
      recurrence_interval: newTask.recurrence_interval,
      recurrence_weekdays: newTask.recurrence_weekdays,
      recurrence_end_date: newTask.recurrence_end_date,
      status: newTask.status || 'pending',
      subject: newTask.subject,
    })
    .select()
    .single();

  if (error) {
    useStore.getState().removeTaskLocal(newTask.id);
    throw error;
  }
  if (data) {
    useStore.getState().removeTaskLocal(newTask.id);
    useStore.getState().addTaskLocal(data);
  }
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
  const store = useStore.getState();
  const original = store.tasks.find(t => t.id === id);
  const now = new Date().toISOString();

  store.updateTaskLocal(id, { ...updates, updated_at: now });

  const { error } = await supabase
    .from('tasks')
    .update({
      ...updates,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    if (original) store.updateTaskLocal(id, original);
    throw error;
  }
};

export const deleteTask = async (id: string) => {
  const store = useStore.getState();
  const original = store.tasks.find(t => t.id === id);

  store.removeTaskLocal(id);

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    if (original) store.addTaskLocal(original);
    throw error;
  }
};

export const completeTask = async (task: Task, date: Date, userId: string) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const now = new Date().toISOString();
  const store = useStore.getState();

  // Guest / Unauthenticated Fallback
  if (userId === 'local' || !store.user) {
    const xpEarned = task.priority === 'high' ? 20 : task.priority === 'medium' ? 10 : 5;
    const isRecurring = task.recurrence_type && task.recurrence_type !== 'none';
    
    if (isRecurring) {
      store.addTaskCompletionLocal({
        id: crypto.randomUUID(),
        user_id: 'local',
        task_id: task.id,
        occurrence_date: dateStr,
        status: 'completed',
        completed_at: now,
        created_at: now,
        updated_at: now,
        xp_awarded: true,
      });
      store.addXP(xpEarned);
    } else {
      store.updateTaskLocal(task.id, {
        status: 'completed',
        completed_at: now,
        updated_at: now,
        xp_awarded: true,
      });
      if (!task.xp_awarded) {
        store.addXP(xpEarned);
      }
    }
    
    checkUnlocksAndMilestones();
    return;
  }

  // Authenticated flow (RPC)
  const { data, error } = await supabase.rpc('complete_task', {
    p_task_id: task.id,
    p_occurrence_date: dateStr
  });

  if (error) {
    throw error;
  }

  const result = data as any;

  if (task.recurrence_type && task.recurrence_type !== 'none') {
    store.addTaskCompletionLocal({
      id: crypto.randomUUID(), 
      user_id: userId,
      task_id: task.id,
      occurrence_date: dateStr,
      status: 'completed',
      completed_at: result.completed_at || now,
      created_at: result.completed_at || now,
      updated_at: result.completed_at || now,
      xp_awarded: true,
    });
  } else {
    store.updateTaskLocal(task.id, {
      status: 'completed',
      completed_at: result.completed_at || now,
      updated_at: now,
    });
  }

  store.setProfileXPAuthoritative(result.total_xp);
  
  if (result.xp_earned > 0) {
    store.showNotification({
      type: 'xp',
      title: `+${result.xp_earned} XP Earned`,
      message: `Task completed: ${task.title}`,
      xp: result.xp_earned,
    });
  }

  if (!result.already_completed) {
    checkUnlocksAndMilestones();
  }
};

export const uncompleteTask = async (task: Task, date: Date, userId: string) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const store = useStore.getState();
  const now = new Date().toISOString();

  if (userId === 'local' || !store.user) {
    const isRecurring = task.recurrence_type && task.recurrence_type !== 'none';
    if (isRecurring) {
      store.removeTaskCompletionLocal(task.id, dateStr);
    } else {
      store.updateTaskLocal(task.id, {
        status: 'pending',
        completed_at: null,
        updated_at: now,
      });
    }
    return;
  }

  const { data, error } = await supabase.rpc('uncomplete_task', {
    p_task_id: task.id,
    p_occurrence_date: dateStr
  });

  if (error) {
    throw error;
  }

  const result = data as any;

  if (task.recurrence_type && task.recurrence_type !== 'none') {
    store.removeTaskCompletionLocal(task.id, dateStr);
  } else {
    store.updateTaskLocal(task.id, {
      status: 'pending',
      completed_at: null,
      updated_at: now,
    });
  }
  
  store.setProfileXPAuthoritative(result.total_xp);
};

export const markTaskWontDo = async (task: Task, date: Date, userId: string) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const store = useStore.getState();
  const now = new Date().toISOString();

  if (userId === 'local' || !store.user) {
    const isRecurring = task.recurrence_type && task.recurrence_type !== 'none';
    if (isRecurring) {
      store.addTaskCompletionLocal({
        id: crypto.randomUUID(),
        user_id: 'local',
        task_id: task.id,
        occurrence_date: dateStr,
        status: 'wont_do',
        completed_at: now,
        created_at: now,
        updated_at: now,
        xp_awarded: false,
      });
    } else {
      store.updateTaskLocal(task.id, {
        status: 'wont_do',
        completed_at: now,
        updated_at: now,
      });
    }
    return;
  }

  const { data, error } = await supabase.rpc('mark_task_wont_do', {
    p_task_id: task.id,
    p_occurrence_date: dateStr
  });

  if (error) throw error;
  const result = data as any;

  if (task.recurrence_type && task.recurrence_type !== 'none') {
    store.addTaskCompletionLocal({
      id: crypto.randomUUID(),
      user_id: userId,
      task_id: task.id,
      occurrence_date: dateStr,
      status: 'wont_do',
      completed_at: result.completed_at || now,
      created_at: now,
      updated_at: now,
      xp_awarded: false,
    });
  } else {
    store.updateTaskLocal(task.id, {
      status: 'wont_do',
      completed_at: result.completed_at || now,
      updated_at: now,
    });
  }
};

export const fetchTaskSections = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  if (data) useStore.getState().setTaskSections(data);
};

export const createTaskSection = async (
  section: Omit<TaskSection, 'user_id' | 'created_at' | 'updated_at'>,
  userId: string
) => {
  const now = new Date().toISOString();
  const newSection: TaskSection = {
    ...section,
    user_id: userId,
    created_at: now,
    updated_at: now,
  };
  useStore.getState().addTaskSectionLocal(newSection);

  const { data, error } = await supabase
    .from('task_sections')
    .insert({
      id: newSection.id,
      user_id: userId,
      name: newSection.name,
      icon: newSection.icon,
      color: newSection.color,
      sort_order: newSection.sort_order,
    })
    .select()
    .single();

  if (error) {
    useStore.getState().removeTaskSectionLocal(newSection.id);
    throw error;
  }
  if (data) {
    useStore.getState().removeTaskSectionLocal(newSection.id);
    useStore.getState().addTaskSectionLocal(data);
  }
};

export const updateTaskSection = async (id: string, updates: Partial<TaskSection>) => {
  const store = useStore.getState();
  const original = store.taskSections.find(s => s.id === id);
  const now = new Date().toISOString();

  store.updateTaskSectionLocal(id, { ...updates, updated_at: now });

  const { error } = await supabase
    .from('task_sections')
    .update({
      ...updates,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    if (original) store.updateTaskSectionLocal(id, original);
    throw error;
  }
};

export const deleteTaskSection = async (id: string) => {
  const store = useStore.getState();
  const original = store.taskSections.find(s => s.id === id);
  
  const affectedTasks = store.tasks.filter(t => t.section_id === id);

  store.removeTaskSectionLocal(id);
  affectedTasks.forEach(t => store.updateTaskLocal(t.id, { section_id: null }));

  const { error } = await supabase
    .from('task_sections')
    .delete()
    .eq('id', id);

  if (error) {
    if (original) store.addTaskSectionLocal(original);
    affectedTasks.forEach(t => store.updateTaskLocal(t.id, { section_id: id }));
    throw error;
  }
};

export const checkAndUpdateGuestStreak = () => {
  const store = useStore.getState();
  const lastActive = store.profile.last_active_date;
  if (!store.user && lastActive) {
    try {
      const todayStr = formatLocalDate(new Date());
      const lastDate = parseISO(lastActive);
      const todayDate = parseISO(todayStr);
      const diffDays = differenceInCalendarDays(todayDate, lastDate);
      if (diffDays > 1) {
        store.updateProfile({ streak: 0 });
      }
    } catch (err) {
      console.error('Failed to compute guest streak:', err);
    }
  }
};
