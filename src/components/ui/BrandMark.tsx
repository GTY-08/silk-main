import React from 'react'

export default function BrandMark({
  size = 40,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ width: size * 0.78, height: size }}
      aria-hidden="true"
    >
      <img
        src="/logo.png"
        alt=""
        className="absolute inset-y-0 left-0 h-full max-w-none select-none"
        draggable={false}
      />
    </span>
  )
}
