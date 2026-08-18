// src/components/IntroSplash.tsx
'use client'
import React, { useEffect, useState } from 'react'
import BrandMark from '@/components/ui/BrandMark'

type Mode = 'auto' | 'hold'

export default function IntroSplash({
  mode = 'auto',
  nextHash = '#feed',
  onDone,
}: {
  mode?: Mode
  nextHash?: string
  onDone?: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')

    // 모션 줄이기
    if (mq?.matches) {
      setVisible(true)
      if (mode === 'auto') {
        const t = setTimeout(() => {
          setVisible(false)
          onDone?.()
          if (nextHash) location.hash = nextHash
        }, 1200)
        return () => clearTimeout(t)
      }
      return
    }

    // 일반 모드
    setVisible(true)
    if (mode === 'auto') {
      const t1 = setTimeout(() => setFading(true), 1400)
      const t2 = setTimeout(() => {
        setVisible(false)
        onDone?.()
        if (nextHash) location.hash = nextHash
      }, 1800)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [mode, nextHash, onDone])

  if (!visible && mode === 'auto') return null

  return (
    <div
      className={`fixed inset-0 z-[9999] grid place-items-center bg-white
                  ${mode === 'auto' && fading ? 'intro-fade-out' : ''}`}
      aria-label="시작 화면"
      role="dialog"
    >
      <div className="w-[380px] sm:w-[460px] relative select-none overflow-visible">
        <div className="flex justify-center" aria-label="SILK 로고">
          <BrandMark size={210} />
        </div>

        {/* ==== 텍스트 ==== */}
        <div
          className="mt-6 text-center text-4xl sm:text-5xl font-extrabold
                     bg-gradient-to-r from-[#8877E6] via-[#788AE6] to-[#77ACE6]
                     bg-clip-text text-transparent tracking-tight intro-word-reveal"
        >
          SILK
        </div>
      </div>

      {/* ==== 애니메이션 ==== */}
      <style>{`
        @keyframes introFadeOut {
          from { opacity: 1 }
          to { opacity: 0 }
        }
        .intro-fade-out {
          animation: introFadeOut 0.4s ease forwards;
        }

        @keyframes wordReveal {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .intro-word-reveal {
          animation: wordReveal 0.8s 0.2s ease-out both;
        }

        @keyframes subReveal {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .intro-sub-reveal {
          animation: subReveal 0.7s 0.4s ease-out both;
        }
      `}</style>
    </div>
  )
}
