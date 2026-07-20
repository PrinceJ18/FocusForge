import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  X, RotateCcw, Sparkles, Award, Timer, CheckSquare, Wallet, Target,
  Zap, Calendar, BarChart3, TrendingUp, Lightbulb, Activity, PiggyBank,
} from 'lucide-react';

// ============================================================
// DashboardCustomizeDrawer — Side drawer for widget visibility
// ============================================================
// Allows users to show/hide dashboard widgets via toggle switches.
// Preferences are stored as a comma-separated string of hidden
// widget IDs in UserPreferences.dashboard_hidden_widgets.
//
// This component is purely presentational — persistence is
// handled by the parent Dashboard component.
// ============================================================

import { WIDGET_REGISTRY, WidgetCategory } from './dashboardWidgets';

/** Ordered category list for display */
const CATEGORIES: WidgetCategory[] = ['Overview', 'Productivity', 'Finance', 'Analytics', 'Insights'];

interface DashboardCustomizeDrawerProps {
  open: boolean;
  onClose: () => void;
  hiddenWidgets: Set<string>;
  onToggleWidget: (widgetId: string) => void;
  onReset: () => void;
}

export default function DashboardCustomizeDrawer({
  open,
  onClose,
  hiddenWidgets,
  onToggleWidget,
  onReset,
}: DashboardCustomizeDrawerProps) {
  const visibleCount = WIDGET_REGISTRY.length - hiddenWidgets.size;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`customize-backdrop ${open ? 'customize-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`customize-drawer ${open ? 'customize-drawer--open' : ''}`}
        role="dialog"
        aria-label="Customize Dashboard"
      >
        {/* Header */}
        <div className="customize-drawer__header">
          <div>
            <h3 className="customize-drawer__title">Customize Dashboard</h3>
            <p className="customize-drawer__subtitle">
              {visibleCount} of {WIDGET_REGISTRY.length} widgets visible
            </p>
          </div>
          <button
            onClick={onClose}
            className="customize-drawer__close"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Widget list by category */}
        <div className="customize-drawer__body">
          {CATEGORIES.map(category => {
            const widgets = WIDGET_REGISTRY.filter(w => w.category === category);
            if (widgets.length === 0) return null;

            return (
              <div key={category} className="customize-section">
                <div className="customize-section__label">{category}</div>
                {widgets.map(widget => {
                  const Icon = widget.icon;
                  const isVisible = !hiddenWidgets.has(widget.id);

                  return (
                    <div key={widget.id} className="customize-widget-row">
                      <div className="customize-widget-row__info">
                        <div className="customize-widget-row__icon">
                          <Icon size={16} />
                        </div>
                        <div className="customize-widget-row__text">
                          <span className="customize-widget-row__name">{widget.title}</span>
                          <span className="customize-widget-row__desc">{widget.description}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onToggleWidget(widget.id)}
                        className={`customize-toggle ${isVisible ? 'customize-toggle--on' : ''}`}
                        role="switch"
                        aria-checked={isVisible}
                        aria-label={`Toggle ${widget.title}`}
                      >
                        <span className="customize-toggle__thumb" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="customize-drawer__footer">
          <button
            onClick={onReset}
            className="customize-drawer__reset"
          >
            <RotateCcw size={14} />
            <span>Reset to Default</span>
          </button>
        </div>
      </aside>
    </>
  );
}
