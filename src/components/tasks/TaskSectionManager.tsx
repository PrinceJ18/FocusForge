import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, Folder, Book, Code, User, Trophy, DollarSign, Settings, Bell } from 'lucide-react';
import { useStore, createTaskSection, updateTaskSection, deleteTaskSection } from '../../store/useStore';

// Map icon string identifier to Lucide component
export const ICON_MAP: Record<string, React.ComponentType<any>> = {
  'folder': Folder,
  'book': Book,
  'code': Code,
  'user': User,
  'trophy': Trophy,
  'dollar-sign': DollarSign,
  'settings': Settings,
  'bell': Bell
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

const AVAILABLE_COLORS = [
  '#a855f7', // Purple
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ef4444', // Red
  '#f59e0b', // Orange
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

interface TaskSectionManagerProps {
  onClose: () => void;
}

export default function TaskSectionManager({ onClose }: TaskSectionManagerProps) {
  const { taskSections, user } = useStore();
  
  // Section Create Form State
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState('#a855f7');
  const [errorMsg, setErrorMsg] = useState('');

  // Section Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('folder');
  const [editColor, setEditColor] = useState('#a855f7');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = newSectionName.trim();
    if (!trimmed) {
      setErrorMsg('Section name cannot be empty.');
      return;
    }

    // Case-insensitive duplicate check
    const duplicate = taskSections.some(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg('A section with this name already exists.');
      return;
    }

    if (!user) {
      setErrorMsg('You must be signed in to perform this action.');
      return;
    }

    try {
      await createTaskSection({
        id: crypto.randomUUID(),
        name: trimmed,
        icon: selectedIcon,
        color: selectedColor,
        sort_order: taskSections.length,
      }, user.id);
      setNewSectionName('');
      setSelectedIcon('folder');
      setSelectedColor('#a855f7');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create section.');
    }
  };

  const handleStartEdit = (section: any) => {
    setEditingId(section.id);
    setEditName(section.name);
    setEditIcon(section.icon);
    setEditColor(section.color);
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      alert('Section name cannot be empty.');
      return;
    }

    // Duplicate check excluding self
    const duplicate = taskSections.some(
      (s) => s.id !== id && s.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      alert('A section with this name already exists.');
      return;
    }

    try {
      await updateTaskSection(id, {
        name: trimmed,
        icon: editIcon,
        color: editColor,
      });
      setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update section.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the section "${name}"? Tasks associated with this section will become uncategorized.`
    );
    if (!confirmed) return;

    try {
      await deleteTaskSection(id);
      if (editingId === id) setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete section.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content p-6 max-w-lg w-full" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(20, 16, 32, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Manage Sections
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Create Form */}
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-white/5 bg-white/5 space-y-4">
          <h4 className="text-sm font-bold text-white mb-2">Create New Section</h4>
          
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Section Name</label>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="input-glass w-full px-3 py-2 text-sm text-white"
              placeholder="e.g. Personal, Placement, Coding"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Icon Picker */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Icon</label>
              <div className="grid grid-cols-4 gap-2">
                {AVAILABLE_ICONS.map((iconKey) => {
                  const IconComponent = ICON_MAP[iconKey];
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setSelectedIcon(iconKey)}
                      className="p-2 rounded-lg border text-white flex items-center justify-center transition-all hover:bg-white/5"
                      style={{
                        borderColor: selectedIcon === iconKey ? selectedColor : 'rgba(255,255,255,0.05)',
                        background: selectedIcon === iconKey ? `${selectedColor}15` : 'transparent',
                        color: selectedIcon === iconKey ? selectedColor : '#ffffff'
                      }}
                    >
                      <IconComponent size={16} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Color</label>
              <div className="grid grid-cols-4 gap-2">
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="w-full h-8 rounded-lg border transition-all relative"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === color ? '#ffffff' : 'transparent',
                      transform: selectedColor === color ? 'scale(1.05)' : 'none'
                    }}
                  >
                    {selectedColor === color && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-[10px]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

          <button type="submit" className="btn-neon w-full py-2.5 text-sm flex items-center justify-center gap-1.5 rounded-xl font-bold">
            <Plus size={16} /> Add Section
          </button>
        </form>

        {/* Existing Sections List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Existing Sections</h4>
          
          {taskSections.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No custom sections yet.</p>
          ) : (
            taskSections.map((section) => {
              const IconComponent = ICON_MAP[section.icon] || Folder;
              const isEditing = editingId === section.id;

              return (
                <div 
                  key={section.id} 
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  {isEditing ? (
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input-glass flex-1 px-2.5 py-1 text-sm text-white"
                        />
                        <button 
                          onClick={() => handleSaveEdit(section.id)}
                          className="p-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Edit Icon */}
                        <div className="grid grid-cols-4 gap-1">
                          {AVAILABLE_ICONS.map((iconKey) => {
                            const Comp = ICON_MAP[iconKey];
                            return (
                              <button
                                key={iconKey}
                                type="button"
                                onClick={() => setEditIcon(iconKey)}
                                className="p-1 rounded border flex items-center justify-center"
                                style={{
                                  borderColor: editIcon === iconKey ? editColor : 'rgba(255,255,255,0.05)',
                                  background: editIcon === iconKey ? `${editColor}15` : 'transparent',
                                  color: editIcon === iconKey ? editColor : '#888888'
                                }}
                              >
                                <Comp size={12} />
                              </button>
                            );
                          })}
                        </div>
                        {/* Edit Color */}
                        <div className="grid grid-cols-4 gap-1">
                          {AVAILABLE_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditColor(color)}
                              className="w-full h-5 rounded border"
                              style={{
                                backgroundColor: color,
                                borderColor: editColor === color ? '#ffffff' : 'transparent',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Icon Container */}
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${section.color}15`, color: section.color }}
                      >
                        <IconComponent size={16} />
                      </div>
                      
                      {/* Name */}
                      <span className="flex-1 text-sm font-medium text-white">{section.name}</span>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleStartEdit(section)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(section.id, section.name)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
