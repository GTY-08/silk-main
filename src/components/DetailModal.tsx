import React, { useEffect, useRef, useState } from 'react'
import { ref, remove, runTransaction } from 'firebase/database'
import { auth, rtdb } from '@/lib/firebase'
import ShapePreview from '@/components/ui/ShapePreview'
import { getSoundUrl } from '@/utils/sound'
import { stopAllAudios } from '@/utils/audio'
import { emotionName, shapeName, soundName } from '@/utils/displayNames'

export type DetailItem = {
  id: string
  color?: string
  shape?: string
  sound?: string
  label?: string
  score?: number
  timestamp?: number
  lat?: number
  lng?: number
  likes?: number
  authorName?: string
}

export default function DetailModal({ open, item, onClose }: { open: boolean; item: DetailItem | null; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [likes, setLikes] = useState(item?.likes || 0)
  const [liking, setLiking] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => auth.onAuthStateChanged(async user => {
    if (!user) return setIsAdmin(false)
    try {
      const token = await user.getIdTokenResult()
      setIsAdmin(token.claims?.role === 'admin')
    } catch { setIsAdmin(false) }
  }), [])

  useEffect(() => setLikes(item?.likes || 0), [item?.id, item?.likes])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    audio.src = item?.sound ? getSoundUrl(item.sound) || '' : ''
  }, [item?.id, item?.sound, open])

  if (!open || !item) return null

  const like = async () => {
    if (liking) return
    setLiking(true)
    try {
      await runTransaction(ref(rtdb, `emotions/${item.id}/likes`), value => typeof value === 'number' ? value + 1 : 1)
      setLikes(value => value + 1)
    } finally { setLiking(false) }
  }

  const deleteItem = async () => {
    if (!confirm('이 기록을 삭제할까요?')) return
    await remove(ref(rtdb, `emotions/${item.id}`))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="grid max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[30px] bg-white shadow-2xl md:grid-cols-[1.15fr_.85fr] md:overflow-hidden">
        <div className="relative grid min-h-[360px] place-items-center overflow-hidden p-10 md:min-h-[580px]" style={{ background: `radial-gradient(circle at 20% 15%, ${item.color || '#8b5cf6'}38, transparent 40%), linear-gradient(145deg, #fff, ${item.color || '#8b5cf6'}1f)` }}>
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full opacity-10" style={{ backgroundColor: item.color }} />
          <ShapePreview shape={(item.shape as any) || 'square'} color={item.color || '#8b5cf6'} size={220} />
        </div>

        <div className="flex min-h-0 flex-col p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-black text-white" style={{ background: `linear-gradient(135deg, ${item.color || '#8b5cf6'}, #1e293b)` }}>{(item.authorName || '익명').slice(0,1)}</div><div className="min-w-0"><div className="truncate text-sm font-black">{item.authorName || '익명'}</div><div className="mt-0.5 text-xs font-medium text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleString('ko-KR') : '방금 전'}</div></div></div>
            <button onClick={onClose} aria-label="닫기" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-lg text-slate-500 transition hover:bg-slate-200">×</button>
          </div>

          <div className="mt-8"><h2 className="text-4xl font-black tracking-[-0.05em] text-slate-950">{emotionName(item.label)}</h2>{typeof item.score === 'number' && <p className="mt-2 text-sm font-bold text-violet-600">일치도 {Math.round(item.score * 100)}%</p>}</div>

          <div className="mt-7 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-slate-50 p-4"><div className="text-[10px] font-black tracking-wider text-slate-400">모양</div><div className="mt-1 text-sm font-black text-slate-800">{shapeName(item.shape)}</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-[10px] font-black tracking-wider text-slate-400">소리</div><div className="mt-1 text-sm font-black text-slate-800">{soundName(item.sound)}</div></div></div>

          {item.sound && <audio ref={audioRef} controls preload="none" onPlay={() => stopAllAudios(audioRef.current)} className="mt-5 w-full" />}
          {typeof item.lat === 'number' && typeof item.lng === 'number' && <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 text-xs font-bold text-violet-700">⌖ 위치 포함</div>}

          <div className="mt-auto flex items-center gap-2 pt-8"><button onClick={like} disabled={liking} className="flex-1 rounded-full bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-50">♥ 공감하기 {likes}</button>{isAdmin && <button onClick={deleteItem} className="rounded-full bg-rose-50 px-4 py-3 text-sm font-black text-rose-600">삭제</button>}</div>
        </div>
      </div>
    </div>
  )
}
