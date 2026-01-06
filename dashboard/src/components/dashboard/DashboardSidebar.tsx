"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  Radio,
  Settings,
  History,
  Users
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: '개요', exact: true },
  { href: '/dashboard/tasks', icon: ListTodo, label: '태스크' },
  { href: '/dashboard/channels', icon: Radio, label: '채널 관리' },
  { href: '/dashboard/personas', icon: Users, label: '페르소나' },
  { href: '/dashboard/history', icon: History, label: '활동 기록' },
  { href: '/dashboard/settings', icon: Settings, label: '설정' },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 theme-surface border-r theme-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b theme-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] shadow-lg" />
          <span className="font-mono text-sm theme-text tracking-widest">
            DoAi.Me
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'theme-text-dim hover:theme-text hover:bg-[var(--color-elevated)]'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t theme-border">
        <div className="text-xs theme-text-muted font-mono">
          v0.1.0-alpha
        </div>
      </div>
    </aside>
  );
};
