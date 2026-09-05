import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  className,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-workbench-accent text-white hover:bg-workbench-accent/90 border border-transparent shadow-sm active:scale-[0.98]',
    secondary:
      'bg-workbench-card text-workbench-text hover:bg-workbench-hover border border-workbench-border active:scale-[0.98]',
    outline:
      'bg-transparent text-workbench-muted hover:text-workbench-text hover:bg-workbench-hover/60 border border-workbench-border active:scale-[0.98]',
    danger:
      'bg-workbench-danger/10 text-rose-400 hover:bg-workbench-danger/20 border border-workbench-danger/30 active:scale-[0.98]',
    success:
      'bg-workbench-success/15 text-emerald-400 hover:bg-workbench-success/25 border border-workbench-success/30 active:scale-[0.98]',
    ghost:
      'bg-transparent text-workbench-muted hover:text-workbench-text hover:bg-workbench-hover/40 border border-transparent active:scale-[0.98]',
  };

  const sizeStyles = {
    xs: 'text-xs px-2 py-1 gap-1 rounded',
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-md',
    md: 'text-sm px-3.5 py-2 gap-2 rounded-lg',
    lg: 'text-base px-4 py-2.5 gap-2.5 rounded-lg',
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-workbench focus:outline-none focus:ring-1 focus:ring-workbench-accent/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
