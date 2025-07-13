import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  className = '',
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <div
          className={`animate-spin rounded-full border-3 border-gray-200 ${sizeClasses[size]}`}
        />
        <div
          className={`absolute inset-0 animate-spin rounded-full border-3 border-transparent border-t-primary ${sizeClasses[size]}`}
        />
      </div>
    </div>
  );
};
