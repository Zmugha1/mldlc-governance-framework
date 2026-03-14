import React from 'react';

interface SkeletonCardProps {
  lines?: number;
  lineHeight?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
  lines = 3, 
  lineHeight = 16 
}) => {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-200 rounded"
          style={{ 
            height: lineHeight, 
            width: i === 0 ? '100%' : 
                   i === lines - 1 ? '60%' : '85%' 
          }}
        />
      ))}
    </div>
  );
};

export default SkeletonCard;
