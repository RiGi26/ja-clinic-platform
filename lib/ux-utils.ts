/**
 * High-performance UI Utilities for Japan Arena SaaS
 * Fokus pada performa (Pure CSS) dan zero-dependency.
 */
import React from 'react'

export function triggerHaptic(duration = 10) {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(duration)
  }
}

/**
 * Skeleton Loader Component (Lightweight)
 */
export function Skeleton({ className = "", width, height }: { className?: string; width?: string | number; height?: string | number }) {
  return React.createElement('div', {
    className: `skeleton rounded-lg ${className}`,
    style: { width, height }
  })
}
