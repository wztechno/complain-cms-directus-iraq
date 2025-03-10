'use client';

import { ReactNode } from 'react';

interface ServiceCardProps {
  id: number | string;
  title: string;
  serviceType?: string;
  icon?: string;
  actionText?: string;
  onClick?: () => void;
  rightContent?: ReactNode;
  leftContent?: ReactNode;
  showMenu?: boolean;
  className?: string;
}

export default function ServiceCard({
  id,
  title,
  serviceType = 'خدمة عامة',
  icon = 'Icons.water',
  actionText = 'استقبال شكوى',
  onClick,
  rightContent,
  leftContent,
  showMenu = true,
  className = '',
}: ServiceCardProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="text-gray-500">{serviceType}</div>
        {showMenu && (
          <button className="text-gray-400 hover:text-gray-600">
            <span className="text-2xl">⋮</span>
          </button>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold mb-2 text-right">{title}</h3>

      {/* Custom Content */}
      {(rightContent || leftContent) && (
        <div className="mt-4 mb-4">
          {rightContent && <div className="text-right">{rightContent}</div>}
          {leftContent && <div className="text-left">{leftContent}</div>}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-blue-600 font-semibold">{actionText}</span>
        <span className="text-gray-500">{icon}</span>
      </div>
    </div>
  );
} 