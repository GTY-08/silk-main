import React from 'react'
import HistoryTimeline from '@/components/HistoryTimeline'

export default function History() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-end justify-between">
        <h1 className="text-3xl font-black tracking-[-0.04em]">감정 기록</h1>
        <a href="#write" className="silk-button">기록하기</a>
      </header>
      <HistoryTimeline />
    </div>
  )
}
