import { useState } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useDailyGoalsStore } from '../store/useDailyGoalsStore';
import type { DailyGoalConfig, GoalDifficulty, GoalUnit } from '../store/useDailyGoalsStore';

// ============================================================
// Preset options for built-in goals
// ============================================================

const FOCUS_PRESETS = [30, 60, 90, 120, 180];
const TASK_PRESETS = [3, 5, 10, 15];
const XP_PRESETS = [25, 50, 100, 200];
const BUDGET_PRESETS = [200, 500, 1000, 2000];

const GOAL_ICONS = ['📖', '💧', '🏃', '🧘', '📝', '💻', '🎵', '📚', '🎯', '⭐', '🌙', '🍎'];
const GOAL_COLORS = ['#a855f7', '#ec4899', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
const UNIT_OPTIONS: Array<{ value: GoalUnit; label: string }> = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'xp', label: 'XP' },
  { value: '₹', label: '₹' },
  { value: 'count', label: 'Count' },
  { value: 'checkbox', label: 'Checkbox' },
];

const DIFFICULTY_OPTIONS: Array<{ value: GoalDifficulty; label: string; desc: string; color: string }> = [
  { value: 'easy', label: 'Easy', desc: 'Relaxed targets', color: '#10b981' },
  { value: 'medium', label: 'Medium', desc: 'Balanced goals', color: '#f59e0b' },
  { value: 'hard', label: 'Hard', desc: 'Push your limits', color: '#ef4444' },
  { value: 'adaptive', label: 'Adaptive', desc: 'AI-adjusted', color: '#a855f7' },
];

// ============================================================
// Component
// ============================================================

interface GoalSettingsModalProps {
  onClose: () => void;
}

export default function GoalSettingsModal({ onClose }: GoalSettingsModalProps) {
  const {
    goalConfigs,
    difficulty,
    notificationsEnabled,
    completionBonusXP,
    updateGoalConfig,
    addCustomGoal,
    removeCustomGoal,
    reorderGoals,
    toggleGoal,
    resetToDefaults,
    setDifficulty,
    setNotificationsEnabled,
    setCompletionBonusXP,
  } = useDailyGoalsStore();

  const [activeTab, setActiveTab] = useState<'goals' | 'custom' | 'settings'>('goals');
  const [showAddCustom, setShowAddCustom] = useState(false);

  const sortedGoals = [...goalConfigs].sort((a, b) => a.order - b.order);
  const builtInGoals = sortedGoals.filter((g) => !g.isCustom);
  const customGoals = sortedGoals.filter((g) => g.isCustom);

  const handleMoveUp = (goal: DailyGoalConfig) => {
    const ids = sortedGoals.map((g) => g.id);
    const idx = ids.indexOf(goal.id);
    if (idx <= 0) return;
    [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]];
    reorderGoals(ids);
  };

  const handleMoveDown = (goal: DailyGoalConfig) => {
    const ids = sortedGoals.map((g) => g.id);
    const idx = ids.indexOf(goal.id);
    if (idx >= ids.length - 1) return;
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    reorderGoals(ids);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content p-0"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div>
            <h3
              className="font-bold text-lg"
              style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}
            >
              Goal Settings
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Customize your daily goals
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 p-1 mx-5 mt-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {(['goals', 'custom', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 text-xs font-medium rounded-lg transition-all capitalize"
              style={{
                background: activeTab === tab ? 'rgba(168,85,247,0.2)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                border: activeTab === tab ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
                borderRadius: 10,
              }}
            >
              {tab === 'custom' ? 'Custom Goals' : tab === 'goals' ? 'Default Goals' : 'Preferences'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          {activeTab === 'goals' && (
            <>
              {builtInGoals.map((goal) => (
                <BuiltInGoalEditor
                  key={goal.id}
                  goal={goal}
                  onUpdate={(updates) => updateGoalConfig(goal.id, updates)}
                  onToggle={() => toggleGoal(goal.id)}
                  onMoveUp={() => handleMoveUp(goal)}
                  onMoveDown={() => handleMoveDown(goal)}
                />
              ))}
            </>
          )}

          {activeTab === 'custom' && (
            <>
              {customGoals.length === 0 && !showAddCustom && (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <p className="text-3xl mb-2">🎯</p>
                  <p className="text-sm">No custom goals yet</p>
                  <p className="text-xs mt-1">Create goals tailored to your routine</p>
                </div>
              )}

              {customGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-3 rounded-xl flex items-center gap-3"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: `${goal.color}20` }}
                  >
                    {goal.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {goal.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Target: {goal.target} {goal.unit !== 'checkbox' ? goal.unit : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ToggleSwitch
                      enabled={goal.enabled}
                      onChange={() => toggleGoal(goal.id)}
                      color={goal.color}
                    />
                    <button
                      onClick={() => removeCustomGoal(goal.id)}
                      className="p-1 rounded-lg transition-colors hover:bg-white/5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {showAddCustom ? (
                <AddCustomGoalForm
                  onAdd={(goal) => {
                    addCustomGoal(goal);
                    setShowAddCustom(false);
                  }}
                  onCancel={() => setShowAddCustom(false)}
                />
              ) : (
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: 'rgba(168,85,247,0.08)',
                    border: '1px dashed rgba(168,85,247,0.3)',
                    color: '#a855f7',
                    borderRadius: 12,
                  }}
                >
                  <Plus size={16} /> Add Custom Goal
                </button>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <>
              {/* Difficulty */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  Difficulty
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDifficulty(opt.value)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: difficulty === opt.value ? `${opt.color}15` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${difficulty === opt.value ? `${opt.color}40` : 'var(--border-color)'}`,
                        borderRadius: 12,
                      }}
                    >
                      <p
                        className="text-sm font-semibold"
                        style={{ color: difficulty === opt.value ? opt.color : 'var(--text-primary)' }}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 12 }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Goal Notifications
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Show alerts when goals complete
                  </p>
                </div>
                <ToggleSwitch
                  enabled={notificationsEnabled}
                  onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                  color="#a855f7"
                />
              </div>

              {/* Bonus XP */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  All-Goals Bonus XP
                </label>
                <div className="flex gap-2">
                  {[10, 25, 50].map((v) => (
                    <button
                      key={v}
                      onClick={() => setCompletionBonusXP(v)}
                      className="flex-1 py-2 text-sm font-medium rounded-xl transition-all"
                      style={{
                        background: completionBonusXP === v ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                        color: completionBonusXP === v ? '#a855f7' : 'var(--text-muted)',
                        border: `1px solid ${completionBonusXP === v ? 'rgba(168,85,247,0.4)' : 'transparent'}`,
                        borderRadius: 10,
                      }}
                    >
                      {v} XP
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={resetToDefaults}
                className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444',
                  borderRadius: 12,
                }}
              >
                <RotateCcw size={14} /> Reset to Defaults
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-0">
          <button
            onClick={onClose}
            className="btn-neon w-full px-4 py-2.5 text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Built-in Goal Editor
// ============================================================

function BuiltInGoalEditor({
  goal,
  onUpdate,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  goal: DailyGoalConfig;
  onUpdate: (updates: Partial<DailyGoalConfig>) => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [customValue, setCustomValue] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const presets = getPresetsForGoal(goal);

  return (
    <div
      className="p-4 rounded-xl transition-all"
      style={{
        background: goal.enabled ? `${goal.color}08` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${goal.enabled ? `${goal.color}20` : 'var(--border-color)'}`,
        borderRadius: 14,
        opacity: goal.enabled ? 1 : 0.6,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${goal.color}20` }}
        >
          {goal.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {goal.name}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Target: {goal.target} {goal.unit !== 'checkbox' ? goal.unit : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onMoveUp} className="p-1 rounded transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} className="p-1 rounded transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
            <ChevronDown size={14} />
          </button>
          <ToggleSwitch enabled={goal.enabled} onChange={onToggle} color={goal.color} />
        </div>
      </div>

      {/* Presets (only for non-checkbox goals) */}
      {goal.enabled && presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => onUpdate({ target: preset })}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={{
                background: goal.target === preset ? `${goal.color}20` : 'rgba(255,255,255,0.05)',
                color: goal.target === preset ? goal.color : 'var(--text-muted)',
                border: `1px solid ${goal.target === preset ? `${goal.color}40` : 'transparent'}`,
                borderRadius: 8,
              }}
            >
              {formatPresetLabel(preset, goal)}
            </button>
          ))}
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-muted)',
                borderRadius: 8,
              }}
            >
              Custom
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="input-glass px-2 py-1 text-xs"
                style={{ width: 60, borderRadius: 8 }}
                placeholder="Value"
                autoFocus
                min="1"
              />
              <button
                onClick={() => {
                  const val = parseInt(customValue);
                  if (val > 0) {
                    onUpdate({ target: val });
                    setShowCustom(false);
                    setCustomValue('');
                  }
                }}
                className="px-2 py-1 text-xs rounded-lg"
                style={{ background: `${goal.color}20`, color: goal.color, borderRadius: 8 }}
              >
                Set
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Add Custom Goal Form
// ============================================================

function AddCustomGoalForm({
  onAdd,
  onCancel,
}: {
  onAdd: (goal: Omit<DailyGoalConfig, 'id' | 'order'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('1');
  const [unit, setUnit] = useState<GoalUnit>('count');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#a855f7');

  return (
    <div
      className="p-4 rounded-xl space-y-4"
      style={{
        background: 'rgba(168,85,247,0.05)',
        border: '1px solid rgba(168,85,247,0.2)',
        borderRadius: 14,
      }}
    >
      <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        New Custom Goal
      </h4>

      {/* Name */}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
          Goal Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-glass w-full px-3 py-2 text-sm"
          placeholder="e.g. Read 20 Pages"
          autoFocus
        />
      </div>

      {/* Target & Unit */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
            Target
          </label>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="input-glass w-full px-3 py-2 text-sm"
            min="1"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
            Unit
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as GoalUnit)}
            className="input-glass w-full px-3 py-2 text-sm"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Icon */}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all"
              style={{
                background: icon === ic ? `${color}20` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${icon === ic ? `${color}40` : 'transparent'}`,
                borderRadius: 8,
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {GOAL_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-all"
              style={{
                background: c,
                border: `2px solid ${color === c ? 'white' : 'transparent'}`,
                boxShadow: color === c ? `0 0 12px ${c}60` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1 px-4 py-2 text-sm">
          Cancel
        </button>
        <button
          onClick={() => {
            if (name.trim() && parseInt(target) > 0) {
              onAdd({
                type: 'custom',
                name: name.trim(),
                target: parseInt(target),
                unit,
                enabled: true,
                icon,
                color,
                isCustom: true,
              });
            }
          }}
          className="btn-neon flex-1 px-4 py-2 text-sm"
        >
          Add Goal
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Toggle Switch Component
// ============================================================

function ToggleSwitch({
  enabled,
  onChange,
  color,
}: {
  enabled: boolean;
  onChange: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onChange}
      className="relative transition-all duration-300"
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: enabled ? `${color}40` : 'rgba(255,255,255,0.1)',
        border: `1px solid ${enabled ? `${color}60` : 'rgba(255,255,255,0.15)'}`,
      }}
    >
      <div
        className="absolute top-0.5 transition-all duration-300 rounded-full"
        style={{
          width: 16,
          height: 16,
          left: enabled ? 17 : 2,
          background: enabled ? color : 'rgba(255,255,255,0.3)',
          boxShadow: enabled ? `0 0 8px ${color}60` : 'none',
        }}
      />
    </button>
  );
}

// ============================================================
// Helpers
// ============================================================

function getPresetsForGoal(goal: DailyGoalConfig): number[] {
  switch (goal.type) {
    case 'focus': return FOCUS_PRESETS;
    case 'tasks': return TASK_PRESETS;
    case 'xp': return XP_PRESETS;
    case 'budget': return BUDGET_PRESETS;
    default: return [];
  }
}

function formatPresetLabel(preset: number, goal: DailyGoalConfig): string {
  switch (goal.type) {
    case 'focus': return `${preset} min`;
    case 'tasks': return String(preset);
    case 'xp': return `${preset} XP`;
    case 'budget': return `₹${preset}`;
    default: return String(preset);
  }
}
