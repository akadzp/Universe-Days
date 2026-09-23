import React from 'react';
import { LayoutDashboard, Users, BookOpen, GitCompare, Compass } from 'lucide-react';
import type { RootNav, ActiveView } from '../types.ts';

interface BottomNavProps {
  activeNav: ActiveView;
  onSelectNav: (nav: RootNav) => void;
}

export function BottomNav({ activeNav, onSelectNav }: BottomNavProps) {
  const items: Array<{
    id: RootNav;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'aktor', label: 'Aktor', icon: Users },
    { id: 'cerita', label: 'Cerita', icon: BookOpen },
    { id: 'cocokkan', label: 'Cocokkan', icon: GitCompare },
    { id: 'dunia', label: 'Dunia', icon: Compass },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-neutral-950/95 border-t border-neutral-800 backdrop-blur-lg flex items-center justify-around px-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeNav === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectNav(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 transition-all relative ${
              isActive
                ? 'text-indigo-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 font-normal'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 w-8 h-0.5 bg-indigo-500 rounded-full" />
            )}
            <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[11px] tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
