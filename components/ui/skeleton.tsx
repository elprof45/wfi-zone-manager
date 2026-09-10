'use client';

// components/ui/skeleton.tsx
// Reusable skeleton loader components for data loading states

import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Base skeleton pulse block */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`}
    />
  );
}

/** Full table skeleton — N rows × M cols */
export function SkeletonTable({
  rows = 5,
  cols = 5,
  showHeader = true,
}: {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
}) {
  const widths = ['w-32', 'w-24', 'w-40', 'w-20', 'w-28', 'w-36', 'w-16'];

  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex items-center gap-4 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${widths[i % widths.length]}`} />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 px-4 py-4 border-b border-neutral-100 dark:border-neutral-800/60"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className={`h-4 ${widths[(row + col) % widths.length]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card skeleton for dashboard metrics */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Skeleton for a single list row */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  const widths = ['w-48', 'w-32', 'w-24', 'w-36', 'w-20'];
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

/** Avatar skeleton */
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
  return <Skeleton className={`${sizes[size]} rounded-full`} />;
}
