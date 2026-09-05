import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'purple' | 'cyan';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
}) => {
  const variantStyles = {
    default: 'bg-workbench-border/60 text-workbench-muted border-workbench-border',
    success: 'bg-workbench-success/10 text-emerald-400 border-workbench-success/30',
    warning: 'bg-workbench-warning/10 text-amber-400 border-workbench-warning/30',
    danger: 'bg-workbench-danger/10 text-rose-400 border-workbench-danger/30',
    accent: 'bg-workbench-accent/10 text-workbench-accent border-workbench-accent/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };

  const dotColors = {
    default: 'bg-workbench-muted',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    accent: 'bg-workbench-accent',
    purple: 'bg-purple-400',
    cyan: 'bg-cyan-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium rounded-full border transition-workbench',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[variant])} />}
      {children}
    </span>
  );
};
