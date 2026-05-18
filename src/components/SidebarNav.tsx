'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/' },
    { name: 'Manga Library', href: '/manga' },
  ];

  return (
    <ul className="space-y-2">
      {navItems.map((item) => {
        // Check if the path matches exactly, or if we are inside a sub-route (like /manga/123)
        const isActive =
          pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <li key={item.name}>
            <Link
              href={item.href}
              className={`block rounded-xl px-4 py-3 font-semibold transition-all ${
                isActive
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm hover:scale-[1.02]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.name}
            </Link>
          </li>
        );
      })}
      <li>
        <span className="block cursor-not-allowed rounded-xl px-4 py-3 font-medium text-[var(--text-secondary)] opacity-50">
          Movies (Soon)
        </span>
      </li>
    </ul>
  );
}
