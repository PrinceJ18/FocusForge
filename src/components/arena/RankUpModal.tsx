import React from 'react';
import Modal from '../ui/Modal';
import { ArrowUp, Trophy, Zap, Shield } from 'lucide-react';

interface RankUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  previousRank: number;
  currentRank: number;
  positionsClimbed: number;
}

export default function RankUpModal({
  isOpen,
  onClose,
  previousRank,
  currentRank,
  positionsClimbed,
}: RankUpModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⬆ Rank Improved!"
      maxWidth="sm"
      footer={
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-lg shadow-purple-600/20"
        >
          Awesome!
        </button>
      }
    >
      <div className="space-y-4 text-center py-2">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl font-black shadow-lg">
          <ArrowUp size={28} className="animate-bounce" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-100" style={{ fontFamily: 'Space Grotesk' }}>
            You Climbed {positionsClimbed} {positionsClimbed === 1 ? 'Position' : 'Positions'}!
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Your recent focus and task activity pushed you higher on the Productivity Arena leaderboard.
          </p>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-emerald-500/30 flex items-center justify-around">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Previous</div>
            <div className="text-lg font-bold text-slate-400 font-mono mt-0.5">#{previousRank}</div>
          </div>

          <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            ▲ +{positionsClimbed} Places
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">New Rank</div>
            <div className="text-2xl font-black text-emerald-300 font-mono mt-0.5">#{currentRank}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
