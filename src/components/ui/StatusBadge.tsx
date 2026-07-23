import React from 'react';
import { AppointmentStatus, STATUS_CONFIG } from '../../types/appointment';

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status];
  
  return (
    <span 
      className={`
        inline-flex items-center justify-center 
        px-3 py-1 rounded-full 
        text-[12px] font-bold uppercase tracking-[0.05em] 
        ${config.bg} ${config.text} 
        ${className}
      `}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
