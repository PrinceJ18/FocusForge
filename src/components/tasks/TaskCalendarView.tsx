import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { useStore, Task } from '../../store/useStore';
import { getTasksForDate } from '../../lib/taskRecurrence';
import TaskItem from './TaskItem';
import { ChevronLeft, ChevronRight, Plus, Star } from 'lucide-react';

interface TaskCalendarViewProps {
  searchQuery: string;
  filterPriority: 'all' | 'low' | 'medium' | 'high';
  filterSectionId: string;
  onOpenDetails: (task: Task, completed: boolean, date: string) => void;
  onToggleTask: (task: Task, completed: boolean, date: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => Promise<void>;
  onAddTaskForDate: (date: string) => void;
}

export default function TaskCalendarView({
  searchQuery,
  filterPriority,
  filterSectionId,
  onOpenDetails,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddTaskForDate,
}: TaskCalendarViewProps) {
  const { tasks, taskCompletions, taskSections } = useStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const today = new Date();

  // Navigation handlers
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleGoToday = () => {
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Generate days for Month Grid (timezone safe)
  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    
    // Start on Monday (weekStartsOn: 1)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Priority colors mapping
  const getPriorityColor = (p: string) => {
    if (p === 'high') return '#ef4444';
    if (p === 'medium') return '#f59e0b';
    return '#10b981';
  };

  // Helper to get and filter tasks for a given date
  const getFilteredTasksForDate = (date: Date) => {
    const dateTasks = getTasksForDate(tasks, date, taskCompletions);
    
    return dateTasks.filter(({ task }) => {
      // 1. Priority filter
      if (filterPriority !== 'all' && task.priority !== filterPriority) {
        return false;
      }
      
      // 2. Section filter
      if (filterSectionId !== 'all') {
        if (filterSectionId === '' && task.section_id !== null) return false;
        if (filterSectionId && task.section_id !== filterSectionId) return false;
      }

      // 3. Search query filter
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
  };

  // List of tasks matching filters for currently selected date
  const selectedDateTasks = useMemo(() => {
    return getFilteredTasksForDate(selectedDate);
  }, [selectedDate, tasks, taskCompletions, searchQuery, filterPriority, filterSectionId, taskSections]);

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <div 
        className="glass-card p-5"
        style={{
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px',
        }}
      >
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="text-base font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handlePrevMonth}
              className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleGoToday}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 border border-white/5 text-purple-400 hover:text-purple-300 transition-colors"
            >
              Today
            </button>
            <button 
              onClick={handleNextMonth}
              className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-xs font-bold text-gray-500 py-1 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1">
          {daysInGrid.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDay = isSameDay(day, today);
            
            // Get filtered tasks/occurrences for this cell
            const occurrences = getFilteredTasksForDate(day);
            const pendingOccs = occurrences.filter((o) => !o.completed);
            const completedCount = occurrences.filter((o) => o.completed).length;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`relative aspect-square p-1 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                  isCurrentMonth ? 'text-white' : 'text-gray-600'
                }`}
                style={{
                  background: isSelected 
                    ? 'rgba(168,85,247,0.15)' 
                    : isTodayDay 
                      ? 'rgba(255,255,255,0.03)' 
                      : 'transparent',
                  borderColor: isSelected 
                    ? '#a855f7' 
                    : isTodayDay 
                      ? 'rgba(168,85,247,0.3)' 
                      : 'rgba(255,255,255,0.03)',
                  opacity: isCurrentMonth ? 1 : 0.35,
                }}
              >
                {/* Day Number */}
                <span 
                  className="text-xs font-bold"
                  style={{
                    color: isSelected 
                      ? '#a855f7' 
                      : isTodayDay 
                        ? '#ec4899' 
                        : isCurrentMonth 
                          ? 'white' 
                          : '#4b5563'
                  }}
                >
                  {format(day, 'd')}
                </span>

                {/* Indicators */}
                <div className="flex gap-0.5 justify-center w-full min-h-[6px] mb-1 flex-wrap px-0.5">
                  {/* Show up to 3 priority color-coded dots */}
                  {pendingOccs.slice(0, 3).map((occ, oIdx) => (
                    <span 
                      key={oIdx}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getPriorityColor(occ.task.priority) }}
                    />
                  ))}
                  
                  {/* Plus dot if more than 3 pending */}
                  {pendingOccs.length > 3 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" title={`${pendingOccs.length} tasks`} />
                  )}

                  {/* Checkmark if all completed */}
                  {occurrences.length > 0 && pendingOccs.length === 0 && (
                    <span className="text-[8px] text-green-400 font-bold">✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pl-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Star size={14} className="text-purple-400" />
            Tasks for {format(selectedDate, 'MMM d, yyyy')} ({selectedDateTasks.length})
          </div>
          
          <button
            onClick={() => onAddTaskForDate(format(selectedDate, 'yyyy-MM-dd'))}
            className="btn-neon px-3 py-1.5 text-xs flex items-center gap-1.5 font-bold rounded-lg"
          >
            <Plus size={12} /> Add Task
          </button>
        </div>

        {selectedDateTasks.length === 0 ? (
          <div className="glass-card py-10 flex flex-col items-center justify-center text-center opacity-60">
            <p className="text-xs text-gray-500 font-medium">No tasks scheduled for this date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {selectedDateTasks.map((occ) => (
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
        )}
      </div>
    </div>
  );
}
