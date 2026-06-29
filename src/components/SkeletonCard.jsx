import React from 'react';

export default function SkeletonCard({ count = 1 }) {
  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card"></div>
        ))}
      </>
    );
  }
  return <div className="skeleton-card"></div>;
}
