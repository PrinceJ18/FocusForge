import React, { useState, useId } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { useStore, Task } from '../../store/useStore';
import { getTasksForDate } from '../../lib/taskRecurrence';
import TaskItem from './TaskItem';
import { AlertCircle, CheckCircle2, Calendar, Star, Search, ChevronDown } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

// ──────────────────────────────────────────────
// Section Header Component
// ──────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  count: number;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  id: string;
}

function SectionHeader({ icon: Icon, title, count, color, expanded, onToggle, id }: SectionHeaderProps) {
  const contentId = `${id}-content`;
  const label = count === 1 ? '1 Task' : `${count} Tasks`;

  return (
    <button
      type="button"
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-expanded={expanded}
      aria-controls={contentId}
      id={id}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors duration-150 hover:bg-white/[0.03] sticky top-0 z-10 group"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Chevron */}
      <ChevronDown
        size={14}
        className="flex-shrink-0 transition-transform duration-200"
        style={{
          color,
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
        }}
      />

      {/* Section Icon */}
      <Icon size={14} className="flex-shrink-0" style={{ color }} />

      {/* Title */}
      <span
        className="text-[11px] font-bold uppercase tracking-wider"
        style={{ color }}
      >
        {title}
      </span>

      {/* Count badge */}
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-auto"
        style={{
          backgroundColor: `${color}12`,
          color,
          border: `1px solid ${color}20`,
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ──────────────────────────────────────────────
// Collapsible Content Wrapper
// ──────────────────────────────────────────────

interface CollapsibleContentProps {
  expanded: boolean;
  id: string;
  children: React.ReactNode;
  className?: string;
}

function CollapsibleContent({ expanded, id, children, className = '' }: CollapsibleContentProps) {
  return (
    <div
      id={id}
      role="region"
      className={className}
      style={{
        display: 'grid',
        gridTemplateRows: expanded ? '1fr' : '0fr',
        transition: 'grid-template-rows 200ms ease-out',
      }}
    >
      <div style={{ overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main TaskListView
// ──────────────────────────────────────────────

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

  // Collapse state for each section (default: all expanded)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const baseId = useId();

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isExpanded = (key: string) => !collapsed[key];

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

  // Helper to render a task list for a section
  const renderTasks = (
    items: typeof filtered,
    extraClass = '',
  ) => (
    <div className={`grid grid-cols-1 gap-2 pt-1.5 pb-1 ${extraClass}`}>
      {items.map((occ) => (
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
  );

  return (
    <div className="space-y-3">
      {/* 1. OVERDUE */}
      {overdue.length > 0 && (
        <div>
          <SectionHeader
            icon={AlertCircle}
            title="Overdue"
            count={overdue.length}
            color="#f87171"
            expanded={isExpanded('overdue')}
            onToggle={() => toggleSection('overdue')}
            id={`${baseId}-overdue`}
          />
          <CollapsibleContent expanded={isExpanded('overdue')} id={`${baseId}-overdue-content`}>
            {renderTasks(overdue)}
          </CollapsibleContent>
        </div>
      )}

      {/* 2. TODAY */}
      {todayList.length > 0 && (
        <div>
          <SectionHeader
            icon={Star}
            title="Today"
            count={todayList.length}
            color="#a855f7"
            expanded={isExpanded('today')}
            onToggle={() => toggleSection('today')}
            id={`${baseId}-today`}
          />
          <CollapsibleContent expanded={isExpanded('today')} id={`${baseId}-today-content`}>
            {renderTasks(todayList)}
          </CollapsibleContent>
        </div>
      )}

      {/* 3. UPCOMING */}
      {upcoming.length > 0 && (
        <div>
          <SectionHeader
            icon={Calendar}
            title="Upcoming"
            count={upcoming.length}
            color="#60a5fa"
            expanded={isExpanded('upcoming')}
            onToggle={() => toggleSection('upcoming')}
            id={`${baseId}-upcoming`}
          />
          <CollapsibleContent expanded={isExpanded('upcoming')} id={`${baseId}-upcoming-content`}>
            {renderTasks(upcoming)}
          </CollapsibleContent>
        </div>
      )}

      {/* 4. COMPLETED */}
      {completed.length > 0 && (
        <div className="pt-1.5 border-t border-white/5">
          <SectionHeader
            icon={CheckCircle2}
            title="Completed"
            count={completed.length}
            color="#6b7280"
            expanded={isExpanded('completed')}
            onToggle={() => toggleSection('completed')}
            id={`${baseId}-completed`}
          />
          <CollapsibleContent expanded={isExpanded('completed')} id={`${baseId}-completed-content`}>
            {renderTasks(completed, 'opacity-70')}
          </CollapsibleContent>
        </div>
      )}
    </div>
  );
}
