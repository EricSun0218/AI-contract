import React, { ReactNode } from 'react';

export const GlassPane: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`glass-pane ${className}`}>
    {children}
  </div>
);

export const LiquidButton: React.FC<{ 
  children: ReactNode; 
  onClick?: () => void; 
  className?: string;
  variant?: 'primary' | 'danger' | 'success';
  disabled?: boolean;
}> = ({ children, onClick, className = '', variant = 'primary', disabled = false }) => {
  let bgClass = "bg-gradient-to-br from-[#007AFF] to-[#5856D6]";
  let shadowClass = "shadow-blue-500/30 hover:shadow-blue-500/50";

  if (variant === 'danger') {
    bgClass = "bg-gradient-to-br from-red-500 to-red-600";
    shadowClass = "shadow-red-500/30 hover:shadow-red-500/50";
  }

  if (disabled) {
    bgClass = "bg-gradient-to-br from-slate-400 to-slate-500";
    shadowClass = "shadow-slate-400/20";
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        ${bgClass} ${shadowClass}
        text-white font-medium rounded-[16px]
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95'}
        shadow-lg flex items-center justify-center gap-2 transition-all
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export const IconButton: React.FC<{ icon: string; onClick?: () => void; className?: string; active?: boolean }> = ({ icon, onClick, className = '', active = false }) => (
  <button
    onClick={onClick}
    className={`
      p-2 rounded-lg flex items-center justify-center transition-transform
      hover:scale-110 active:scale-90
      ${active 
        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
        : 'text-slate-600 dark:text-slate-300'}
      ${className}
    `}
  >
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
  </button>
);

export const ToolbarSeparator: React.FC = () => (
  <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
);
