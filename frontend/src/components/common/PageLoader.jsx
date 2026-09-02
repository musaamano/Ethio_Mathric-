/**
 * PageLoader.jsx
 * Full-page skeleton loader used while pages are loading data.
 * Matches the layout of each section to avoid layout shift.
 */
import React from 'react';

function Skeleton({ className = '' }) {
  return (
    <div className={`bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-2xl animate-pulse ${className}`}
      style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="soft-card p-5 flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          </div>
        ))}
      </div>
      {/* Chart row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 soft-card p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="soft-card p-5 space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
      {/* Table */}
      <div className="soft-card p-5 space-y-3">
        <Skeleton className="h-5 w-36" />
        {[1,2,3].map(i => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="soft-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8 }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-2xl" />
      </div>
      <div className="soft-card overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 px-5 py-3 bg-surface border-b border-gray-100">
          {[2,1,1,1,1].map((w, i) => (
            <Skeleton key={i} className={`h-3 flex-${w}`} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-lg" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-16 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuestionSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="soft-card p-4 space-y-3">
        <Skeleton className="h-2.5 w-full rounded-full" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <div className="soft-card p-6 space-y-5">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
        <div className="space-y-3 mt-2">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PageLoader({ variant = 'dashboard' }) {
  const variants = {
    dashboard: <DashboardSkeleton />,
    cards:     <CardGridSkeleton />,
    table:     <TableSkeleton />,
    question:  <QuestionSkeleton />,
  };
  return variants[variant] || <DashboardSkeleton />;
}
