import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  icon,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        'btn',
        `btn-${variant}`,
        fullWidth && 'w-full',
        className
      )}
      style={{
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled || isLoading ? 0.7 : 1,
        pointerEvents: disabled || isLoading ? 'none' : 'auto',
        padding: size === 'sm' ? '8px 16px' : size === 'lg' ? '16px 32px' : '12px 24px',
        fontSize: size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px',
      }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="spinner" style={{ marginRight: '8px' }}>⏳</span>
      ) : icon ? (
        <span style={{ marginRight: '8px', display: 'flex' }}>{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
