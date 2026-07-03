import { LayoutDashboard, Wallet, Timer, BarChart3, Trophy, Award, Settings } from 'lucide-react';
import { useStore, type Page } from '../store/useStore';
import { getLevelInfo } from "../lib/levels";
const items: { id: Page; icon: React.ReactNode; label: string }[] = [
  { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
  { id: 'finance', icon: <Wallet size={20} />, label: 'Finance' },
  { id: 'productivity', icon: <Timer size={20} />, label: 'Focus' },
  { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
  { id: 'achievements', icon: <Award size={20} />, label: 'Journey' },
  { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
];

export default function MobileNav() {
  const { currentPage, setPage } = useStore();

  return (
    <nav className="mobile-nav justify-around px-2 py-2" style={{ backdropFilter: 'blur(20px)', background: 'rgba(10,10,20,0.88)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)', }} >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setPage(item.id)}
          className="flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all duration-300 min-w-[72px] touch-manipulation active:scale-95"
          style={{
            color: currentPage === item.id ? 'var(--purple-primary)' : 'var(--text-muted)',
            background: currentPage === item.id ? 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(236,72,153,0.12))' : 'transparent', transform: currentPage === item.id ? 'translateY(-2px)' : 'translateY(0)',
          }}
        >
          {item.icon}
          <span className="text-[11px] font-semibold tracking-wide">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
