import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, cols = 6 }) => {
  return (
    <div className="w-full space-y-3 animate-pulse p-4">
      <div className="h-10 bg-slate-100 rounded-xl w-full mb-4 border border-slate-200" />
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-3.5 px-3 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-slate-100 rounded-lg"
              style={{
                width: cIdx === 0 ? '12%' : cIdx === 1 ? '25%' : cIdx === 2 ? '15%' : '16%',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

