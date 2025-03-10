'use client';

import { ReactNode } from 'react';

interface CardProps {
  title: string;
  topLeftText?: string;
  topRightText?: string;
  bottomLeftContent?: ReactNode;
  bottomRightContent?: ReactNode;
  showMenuButton?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function Card({
  title,
  topLeftText,
  topRightText,
  bottomLeftContent,
  bottomRightContent,
  showMenuButton = true,
  onClick,
  className = '',
}: CardProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-gray-500">{topLeftText}</div>
        {showMenuButton && (
          <button className="text-gray-400 hover:text-gray-600">
            <span className="text-2xl">⋮</span>
          </button>
        )}
        {topRightText && !showMenuButton && (
          <div className="text-gray-500">{topRightText}</div>
        )}
      </div>

      <h3 className="text-xl font-semibold mb-2 text-right">{title}</h3>

      {(bottomLeftContent || bottomRightContent) && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-blue-600 font-semibold">
            {bottomLeftContent}
          </div>
          <div className="text-gray-500">
            {bottomRightContent}
          </div>
        </div>
      )}
    </div>
  );
} 