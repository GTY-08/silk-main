import React, { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { limitToLast, onValue, orderByChild, query, ref, runTransaction } from 'firebase/database'
import { auth, rtdb } from '@/lib/firebase'
import DetailModal from '@/components/DetailModal'
import ShapePreview from '@/components/ui/ShapePreview'
import { getSoundUrl } from '@/utils/sound'
import { stopAllAudios } from '@/utils/audio'
import { soundName } from '@/utils/displayNames'

type Emotion = {
  id: string
  userId?: string
  authorName?: string
  color?: string
  shape?: string
  sound?: string
  label?: string
  score?: number
  timestamp?: number
  likes?: number
  lat?: number
  lng?: number
}

const FILTERS = [
  { key: 'all', label: '모든 감정' },
  { key: 'happy', label: '기쁨' },
  { key: 'calm', label: '평온' },
  { key: 'love', label: '사랑' },
  { key: 'sad', label: '슬픔' },
] as const

const LABEL_META: Record<string, { ko: string; tint: string; dot: string }> = {
  happy: { ko: '기쁨', tint: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
  calm: { ko: '평온', tint: 'bg-sky-50 text-sky-700', dot: 'bg-sky-400' },
  love: { ko: '사랑', tint: 'bg-rose-50 text-rose-700', dot: 'bg-rose-400' },
  sad: { ko: '슬픔', tint: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-400' },
  angry: { ko: '분노', tint: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  fear: { ko: '불안', tint: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
}

function relativeTime(timestamp?: number) {
  if (!timestamp) return '방금 전'
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return '방금 전'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`
  return new Date(timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function initials(value?: string) {
  return (value || '익명').trim().slice(0, 1).toUpperCase()
}

export default function Feed() {
  const [items, setItems] = useState<Emotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [current, setCurrent] = useState<Emotion | null>(null)
  const [likingId, setLikingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const user = auth.currentUser

  useEffect(() => onAuthStateChanged(auth, currentUser => {
    if (!currentUser) location.hash = '#login'
  }), [])

  useEffect(() => {
    const emotionsQuery = query(ref(rtdb, 'emotions'), orderByChild('timestamp'), limitToLast(50))
    return onValue(emotionsQuery, snapshot => {
      const next: Emotion[] = []
      snapshot.forEach(child => {
        const value = child.val() as Emotion
        next.push({ ...value, id: child.key || value.id || 'missing-id' })
      })
      setItems(next.filter(item => typeof item.timestamp === 'number').sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)))
      setLoading(false)
    }, reason => {
      console.error(reason)
      setError('피드를 불러오지 못했어요. 새로고침해주세요.')
      setLoading(false)
    })
  }, [])

  const visibleItems = useMemo(
    () => filter === 'all' ? items : items.filter(item => item.label === filter),
    [filter, items],
  )

  const moodCounts = useMemo(() => {
    return items.reduce<Record<string, number>>((counts, item) => {
      if (item.label) counts[item.label] = (counts[item.label] || 0) + 1
      return counts
    }, {})
  }, [items])

  const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)

  const toggleAudio = async (item: Emotion) => {
    const url = getSoundUrl(item.sound)
    if (!url) return
    if (!audioRef.current) audioRef.current = new Audio()
    const player = audioRef.current
    if (!player.paused && player.dataset.id === item.id) {
      player.pause()
      player.currentTime = 0
      return
    }
    stopAllAudios(player)
    player.pause()
    player.src = url
    player.dataset.id = item.id
    await player.play().catch(() => undefined)
  }

  const like = async (item: Emotion) => {
    if (likingId) return
    setLikingId(item.id)
    try {
      await runTransaction(ref(rtdb, `emotions/${item.id}/likes`), value => typeof value === 'number' ? value + 1 : 1)
    } finally {
      setLikingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,680px)_320px]">
        <section className="min-w-0 space-y-5">
          <header className="flex items-end justify-between px-1">
            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">피드</h1>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">{items.length}개의 기록</span>
          </header>

          <button onClick={() => { location.hash = '#write' }} className="silk-card group flex w-full items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-xl">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 font-black text-white">{initials(user?.displayName || user?.email || undefined)}</span>
            <span className="min-w-0 flex-1 text-sm font-medium text-slate-400">오늘 감정 남기기</span>
            <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white transition group-hover:bg-violet-600">남기기</span>
          </button>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map(item => (
              <button key={item.key} onClick={() => setFilter(item.key)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${filter === item.key ? 'bg-slate-950 text-white shadow-lg shadow-slate-200' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-950'}`}>{item.label}</button>
            ))}
          </div>

          {loading && (
            <div className="space-y-4">
              {[0, 1].map(item => <div key={item} className="silk-card h-[480px] animate-pulse bg-white" />)}
            </div>
          )}
          {error && <div className="silk-card p-8 text-center text-sm font-semibold text-rose-600">{error}</div>}
          {!loading && !error && visibleItems.length === 0 && (
            <div className="silk-card grid min-h-72 place-items-center p-8 text-center">
              <div><h2 className="text-lg font-black">기록이 없어요</h2><a href="#write" className="mt-3 inline-block text-sm font-black text-violet-700">첫 기록 남기기</a></div>
            </div>
          )}

          {visibleItems.map(item => {
            const meta = LABEL_META[item.label || '']
            const name = item.authorName?.trim() || '익명'
            const score = typeof item.score === 'number' ? Math.round(item.score * 100) : null
            return (
              <article key={item.id} className="silk-card overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="grid h-11 w-11 place-items-center rounded-full font-black text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${item.color || '#8b5cf6'}, #1e293b)` }}>{initials(name)}</div>
                  <button onClick={() => setCurrent(item)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-black text-slate-900">{name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-400"><span>{relativeTime(item.timestamp)}</span>{typeof item.lat === 'number' && <><span>·</span><span>위치 공유</span></>}</div>
                  </button>
                  {meta && <span className={`rounded-full px-3 py-1.5 text-xs font-black ${meta.tint}`}>{meta.ko}</span>}
                </div>

                <button onClick={() => setCurrent(item)} className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden bg-slate-100 sm:aspect-[16/10]" style={{ background: `radial-gradient(circle at 28% 18%, ${item.color || '#8b5cf6'}38 0, transparent 38%), linear-gradient(145deg, #ffffff 0%, ${item.color || '#8b5cf6'}18 100%)` }}>
                  <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[40px] opacity-20" style={{ borderColor: item.color || '#8b5cf6' }} />
                  <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full opacity-10" style={{ backgroundColor: item.color || '#8b5cf6' }} />
                  <div className="relative transition duration-500 hover:scale-105"><ShapePreview shape={(item.shape as any) || 'square'} color={item.color || '#8b5cf6'} size={190} /></div>
                  {score !== null && <div className="absolute bottom-4 left-4 rounded-full bg-white/85 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm backdrop-blur">일치도 {score}%</div>}
                </button>

                <div className="px-5 pb-5 pt-4">
                  <div className="flex items-center gap-2">
                    <button disabled={likingId === item.id} onClick={() => like(item)} className="flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"><span className="text-base">♥</span> 공감하기 {item.likes || 0}</button>
                    <button onClick={() => toggleAudio(item)} className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"><span>♪</span> {item.sound ? soundName(item.sound) : '소리 듣기'}</button>
                    <button onClick={() => setCurrent(item)} className="ml-auto rounded-full px-3 py-2 text-sm font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-800">자세히</button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <aside className="sticky top-24 hidden space-y-5 lg:block">
          <div className="overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300">
            <h2 className="text-2xl font-black tracking-tight">감정 지도</h2>
            <a href="#explore" className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950">지도 열기 →</a>
          </div>

          <div className="silk-card p-5">
            <div className="flex items-center justify-between"><h3 className="text-sm font-black">많이 기록된 감정</h3><span className="text-[11px] font-bold text-slate-400">최근 50개</span></div>
            <div className="mt-4 space-y-3">
              {topMoods.length ? topMoods.map(([label, count]) => {
                const meta = LABEL_META[label] || { ko: label, dot: 'bg-slate-400' }
                return <button key={label} onClick={() => setFilter(label as typeof filter)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-slate-50"><span className={`h-3 w-3 rounded-full ${meta.dot}`} /><span className="flex-1 text-sm font-bold text-slate-700">{meta.ko}</span><span className="text-xs font-black text-slate-400">{count}</span></button>
              }) : <p className="py-3 text-sm text-slate-400">아직 기록이 없어요.</p>}
            </div>
          </div>
        </aside>
      </div>

      <DetailModal open={!!current} item={current} onClose={() => setCurrent(null)} />
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
