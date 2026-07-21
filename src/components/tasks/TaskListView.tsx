import React from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { useStore, Task } from '../../store/useStore';
import { getTasksForDate } from '../../lib/taskRecurrence';
import TaskItem from './TaskItem';
import { AlertCircle, CheckCircle2, Calendar, Star, Search } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

interface TaskListViewProps {
  searchQuery: string;
  filterPriority: 'all' | 'low' | 'medium' | 'high';
  filterSectionId: string;
  onOpenDetails: (task: Task, completed: boolean, date: string) => void;
  onToggleTask: (task: Task, completed: boolean, date: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => Promise<void>;
}

export default function TaskListView({
  searchQuery,
  filterPriority,
  filterSectionId,
  onOpenDetails,
  onToggleTask,
  onEditTask,
  onDeleteTask,
}: TaskListViewProps) {
  const { tasks, taskCompletions, taskSections } = useStore();

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Bounded list scanning range: from 30 days in the past to 14 days in the future
  const startDate = subDays(today, 30);
  const endDate = addDays(today, 14);

  // Generate all task occurrences across this range
  const allOccurrences: Array<{ task: Task; completed: boolean; occurrenceDate: string }> = [];
  
  // To avoid duplicate one-time tasks across multiple dates (if any date bugs exist),
  // we scan date by date. For recurring tasks, occurrences are generated per date.
  // One-time tasks will only appear on their scheduled_date.
  let currentDate = startDate;
  while (currentDate <= endDate) {
    const occurrencesForDate = getTasksForDate(tasks, currentDate, taskCompletions);
    allOccurrences.push(...occurrencesForDate);
    currentDate = addDays(currentDate, 1);
  }

  // Filter occurrences based on Priority, Section, and Search
  const filtered = allOccurrences.filter(({ task }) => {
    // 1. Priority Filter
    if (filterPriority !== 'all' && task.priority !== filterPriority) {
      return false;
    }

    // 2. Section Filter
    if (filterSectionId !== 'all') {
      if (filterSectionId === '' && task.section_id !== null) return false;
      if (filterSectionId && task.section_id !== filterSectionId) return false;
    }

    // 3. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(q);
      const descMatch = (task.description || '').toLowerCase().includes(q);
      const subjectMatch = (task.subject || '').toLowerCase().includes(q);
      
      const sectionObj = taskSections.find((s) => s.id === task.section_id);
      const sectionMatch = sectionObj ? sectionObj.name.toLowerCase().includes(q) : false;

      if (!titleMatch && !descMatch && !subjectMatch && !sectionMatch) {
        return false;
      }
    }

    return true;
  });

  // Group occurrences
  const overdue: typeof filtered = [];
  const todayList: typeof filtered = [];
  const upcoming: typeof filtered = [];
  const completed: typeof filtered = [];

  // Deduplicate occurrences to avoid listing the same recurring completed occurrence multiple times
  const seenKeys = new Set<string>();

  filtered.forEach((occ) => {
    const key = `${occ.task.id}_${occ.occurrenceDate}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    if (occ.completed) {
      completed.push(occ);
    } else if (occ.occurrenceDate < todayStr) {
      overdue.push(occ);
    } else if (occ.occurrenceDate === todayStr) {
      todayList.push(occ);
    } else {
      upcoming.push(occ);
    }
  });

  // Sorting helper: High > Medium > Low
  const priorityWeight = (p: string) => {
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    return 1;
  };

  const sortOccurrences = (a: any, b: any) => {
    // Sort by date ascending
    if (a.occurrenceDate !== b.occurrenceDate) {
      return a.occurrenceDate.localeCompare(b.occurrenceDate);
    }
    // Sort by priority descending
    return priorityWeight(b.task.priority) - priorityWeight(a.task.priority);
  };

  overdue.sort(sortOccurrences);
  todayList.sort(sortOccurrences);
  upcoming.sort(sortOccurrences);
  
  // Sort completed occurrences showing the most recently completed first
  completed.sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate));

  const hasTasks = overdue.length > 0 || todayList.length > 0 || upcoming.length > 0 || completed.length > 0;

  if (!hasTasks) {
    return (
      <div className="glass-card py-16 flex flex-col items-center justify-center text-center">
        <CheckCircle2 size={40} className="text-gray-600 mb-3 opacity-40" />
        <p className="text-base text-gray-400 font-medium">No tasks found matching these filters.</p>
        <p className="text-xs text-gray-600 mt-1">Try resetting filters or adding a new task!</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={searchQuery ? Search : CheckCircle2}
        title={searchQuery ? "No results found" : "All Caught Up!"}
        description={searchQuery ? "Try adjusting your search or filters." : "You have no tasks matching the current filters. Enjoy your free time or add a new task."}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. OVERDUE SECTION */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold uppercase tracking-wider pl-1">
            <AlertCircle size={14} />
            Overdue ({overdue.length})
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {overdue.map((occ) => (
              <TaskItem
                key={`${occ.task.id}_${occ.occurrenceDate}`}
                task={occ.task}
                completed={occ.completed}
                occurrenceDate={occ.occurrenceDate}
                onToggle={() => onToggleTask(occ.task, occ.completed, occ.occurrenceDate)}
                onEdit={() => onEditTask(occ.task)}
                onDelete={() => onDeleteTask(occ.task)}
                onClick={() => onOpenDetails(occ.task, occ.completed, occ.occurrenceDate)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. TODAY SECTION */}
      {todayList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold uppercase tracking-wider pl-1">
            <Star size={14} />
            Today ({todayList.length})
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {todayList.map((occ) => (
              <TaskItem
                key={`${occ.task.id}_${occ.occurrenceDate}`}
                task={occ.task}
                completed={occ.completed}
                occurrenceDate={occ.occurrenceDate}
                onToggle={() => onToggleTask(occ.task, occ.completed, occ.occurrenceDate)}
                onEdit={() => onEditTask(occ.task)}
                onDelete={() => onDeleteTask(occ.task)}
                onClick={() => onOpenDetails(occ.task, occ.completed, occ.occurrenceDate)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. UPCOMING SECTION */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider pl-1">
            <Calendar size={14} />
            Upcoming ({upcoming.length})
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {upcoming.map((occ) => (
              <TaskItem
                key={`${occ.task.id}_${occ.occurrenceDate}`}
                task={occ.task}
                completed={occ.completed}
                occurrenceDate={occ.occurrenceDate}
                onToggle={() => onToggleTask(occ.task, occ.completed, occ.occurrenceDate)}
                onEdit={() => onEditTask(occ.task)}
                onDelete={() => onDeleteTask(occ.task)}
                onClick={() => onOpenDetails(occ.task, occ.completed, occ.occurrenceDate)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. COMPLETED SECTION */}
      {completed.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold uppercase tracking-wider pl-1">
            <CheckCircle2 size={14} />
            Completed ({completed.length})
          </div>
          <div className="grid grid-cols-1 gap-2.5 opacity-70">
            {completed.map((occ) => (
              <TaskItem
                key={`${occ.task.id}_${occ.occurrenceDate}`}
                task={occ.task}
                completed={occ.completed}
                occurrenceDate={occ.occurrenceDate}
                onToggle={() => onToggleTask(occ.task, occ.completed, occ.occurrenceDate)}
                onEdit={() => onEditTask(occ.task)}
                onDelete={() => onDeleteTask(occ.task)}
                onClick={() => onOpenDetails(occ.task, occ.completed, occ.occurrenceDate)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
