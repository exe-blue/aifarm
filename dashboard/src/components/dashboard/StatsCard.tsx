"use client";

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

const colorMap = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
};

export const StatsCard = ({ title, value, subtitle, color = 'primary' }: StatsCardProps) => {
  return (
    <div className="theme-surface border theme-border rounded-lg p-4">
      <p className="text-sm theme-text-dim mb-1">{title}</p>
      <p
        className="text-3xl font-bold"
        style={{ color: colorMap[color] }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && (
        <p className="text-xs theme-text-muted mt-1">{subtitle}</p>
      )}
    </div>
  );
};
