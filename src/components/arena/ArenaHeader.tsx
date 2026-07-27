import React, { useState, useRef, useEffect } from 'react';
import { Trophy, ChevronDown, Shield, Globe, Users } from 'lucide-react';
import { Arena } from '../../types/arena';
import useClickOutside from '../../hooks/useClickOutside';
import useRouteChangeCleanup from '../../hooks/useRouteChangeCleanup';

interface ArenaHeaderProps {
  currentArena: Arena | null;
  arenas: Arena[];
  onSelectArena?: (arena: Arena) => void;
}

function ArenaHeader({ currentArena, arenas, onSelectArena }: ArenaHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setDropdownOpen(false), dropdownOpen);
  useRouteChangeCleanup(() => setDropdownOpen(false), dropdownOpen);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 sm:p-6 mb-6 relative z-30 transition-all duration-300">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-purple-500/30 shrink-0">
          🏆
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            Productivity Arena
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Compete with friends, climb the leaderboard, earn achievements, and celebrate your productivity journey.
          </p>
        </div>
      </div>

      {/* Multi-Arena Selector Dropdown */}
      <div ref={dropdownRef} className="relative shrink-0">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-purple-500/30 text-slate-200 text-xs font-bold hover:bg-slate-800 transition active:scale-95 touch-target shadow-md shadow-purple-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          aria-label="Select Arena"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <Globe size={16} className="text-purple-400" />
          <span className="truncate max-w-[180px]">
            {currentArena?.name || 'Global Productivity Arena'}
          </span>
          <ChevronDown size={14} className="text-slate-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950/95 border border-purple-500/30 shadow-2xl p-2 z-50 backdrop-blur-xl animate-fade-in">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
              Select Competitive Arena
            </div>
            
            <button
              onClick={() => {
                if (currentArena && onSelectArena) onSelectArena(currentArena);
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs font-bold text-white text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <Globe size={14} className="text-purple-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{currentArena?.name || 'Global Productivity Arena'}</div>
                <div className="text-[10px] font-normal text-slate-400">Default Global Arena</div>
              </div>
            </button>

            <div className="mt-2 p-2.5 bg-slate-900/60 rounded-xl text-[10px] text-slate-400 italic text-center">
              🏫 Study Groups & Custom Arenas coming soon!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ArenaHeader);
