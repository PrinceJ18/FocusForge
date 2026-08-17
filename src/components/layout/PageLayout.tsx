import React, { useState, useEffect } from 'react';
import Header from '../Header';
import { useStore } from '../../store/useStore';
import clsx from 'clsx';

export const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  finance: 'Finance & Budget',
  productivity: 'Productivity Center',
  analytics: 'Analytics & Trends',
  friends: 'Friends & Community',
  arena: 'Productivity Arena',
  splits: 'Group Splits',
  reports: 'Performance Reports',
  achievements: 'Achievement Center',
  settings: 'Personalization & Settings',
};

export interface PageLayoutProps {
  /** Optional custom title override */
  title?: string;
  /** Optional custom subtitle override */
  subtitle?: string;
  /** Optional custom header actions (rendered on right side of sticky header) */
  headerActions?: React.ReactNode;
  /** Page content */
  children: React.ReactNode;
  /** Max width container class (defaults to max-w-7xl 2xl:max-w-[1600px]) */
  maxWidth?: string;
  /** Additional classes for the outer wrapper */
  className?: string;
  /** Additional classes for the inner content container */
  contentClassName?: string;
  /** Mobile menu click handler */
  onMenuClick?: () => void;
  /** If true, omits standard padding from content container */
  noPadding?: boolean;
}

export default function PageLayout({
  title,
  subtitle,
  headerActions,
  children,
  maxWidth = 'max-w-7xl 2xl:max-w-[1600px]',
  className,
  contentClassName,
  onMenuClick = () => {},
  noPadding = false,
}: PageLayoutProps) {
  const { currentPage } = useStore();
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor scroll position to apply elevated shadow to sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 8;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const resolvedTitle = title || PAGE_TITLES[currentPage] || 'FocusForge';

  return (
    <div className={clsx('w-full min-h-screen flex flex-col', className)}>
      {/* Sticky Header Bar */}
      <div
        className={clsx(
          'sticky-header-wrapper w-full transition-shadow duration-200',
          isScrolled && 'sticky-header-scrolled'
        )}
      >
        <div className={clsx('w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8', maxWidth)}>
          <Header
            onMenuClick={onMenuClick}
            title={resolvedTitle}
            subtitle={subtitle}
            headerActions={headerActions}
          />
        </div>
      </div>

      {/* Scrollable Page Content */}
      <div
        className={clsx(
          'w-full flex-1 mx-auto',
          maxWidth,
          !noPadding && 'px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-12',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
