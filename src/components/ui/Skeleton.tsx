import React from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  circle = false,
}) => {
  return (
    <div
      className={clsx(
        'animate-pulse bg-gray-200',
        circle ? 'rounded-full' : 'rounded',
        className
      )}
      style={{ width, height }}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="16px"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton circle width="48px" height="48px" />
        <div className="flex-1 space-y-2">
          <Skeleton height="20px" width="40%" />
          <Skeleton height="16px" width="60%" />
        </div>
      </div>
      <SkeletonText lines={4} />
      <div className="flex gap-2">
        <Skeleton height="36px" width="100px" />
        <Skeleton height="36px" width="100px" />
      </div>
    </div>
  );
};
