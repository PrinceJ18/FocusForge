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
    <nav className="mobile-nav flex items-center justify-around px-1 py-1.5" style={{ backdropFilter: 'blur(20px)', background: 'rgba(10,10,20,0.92)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)' }}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setPage(item.id)}
          className="flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 px-1 rounded-xl transition-all duration-200 touch-manipulation active:scale-95 min-h-[44px]"
          style={{
            color: currentPage === item.id ? '#c084fc' : '#94a3b8',
            background: currentPage === item.id ? 'rgba(168,85,247,0.15)' : 'transparent',
          }}
        >
          {item.icon}
          <span className="text-[10px] font-medium tracking-tight truncate w-full text-center mt-0.5">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
