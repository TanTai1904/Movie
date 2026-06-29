import React from 'react';

export default function SkeletonGrid({ count = 10 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card"></div>
      ))}
    </>
  );
}
