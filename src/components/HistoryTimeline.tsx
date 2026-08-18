import React, { useEffect, useState } from 'react'
import { equalTo, limitToLast, onValue, orderByChild, query, ref } from 'firebase/database'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, rtdb } from '@/lib/firebase'
import ShapePreview from '@/components/ui/ShapePreview'
import DetailModal from '@/components/DetailModal'
import { emotionName } from '@/utils/displayNames'

type Emotion = {
  id: string
  authorName?: string
  color?: string
  shape?: string
  sound?: string
  label?: string
  score?: number
  timestamp?: number | string
  lat?: number
  lng?: number
  likes?: number
}

function timestamp(value: number | string | undefined) {
  if (typeof value === 'number') return value < 2_000_000_000 ? value * 1000 : value
  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) return timestamp(Number(value))
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export default function HistoryTimeline() {
  const [uid, setUid] = useState<string | null>(null)
  const [items, setItems] = useState<Emotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [current, setCurrent] = useState<Emotion | null>(null)

  useEffect(() => onAuthStateChanged(auth, user => {
    if (!user) location.hash = '#login'
    else setUid(user.uid)
  }), [])

  useEffect(() => {
    if (!uid) return
    return onValue(query(ref(rtdb, 'emotions'), orderByChild('userId'), equalTo(uid), limitToLast(500)), snapshot => {
      const next: Emotion[] = []
      snapshot.forEach(child => {
        const value = child.val() as Emotion
        next.push({ ...value, id: child.key || value.id, timestamp: timestamp(value.timestamp) })
      })
      setItems(next.filter(item => Number(item.timestamp) > 0).sort((a, b) => Number(b.timestamp) - Number(a.timestamp)))
      setLoading(false)
    }, reason => {
      console.error(reason)
      setError('기록을 불러오지 못했어요. 새로고침해주세요.')
      setLoading(false)
    })
  }, [uid])

  if (loading) return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0,1,2,3,4,5].map(item => <div key={item} className="aspect-square animate-pulse rounded-[24px] bg-slate-200" />)}</div>
  if (error) return <div className="silk-card p-8 text-center text-sm font-semibold text-rose-600">{error}</div>
  if (!items.length) return <div className="silk-card grid min-h-64 place-items-center text-center"><div><h3 className="font-black">기록이 없어요</h3><a href="#write" className="mt-3 inline-block text-sm font-black text-violet-700">첫 기록 남기기</a></div></div>

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(item => (
          <button key={item.id} onClick={() => setCurrent(item)} className="group relative aspect-square overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl" style={{ background: `linear-gradient(145deg, #fff, ${item.color || '#8b5cf6'}1f)` }}>
            <div className="grid h-full place-items-center transition duration-500 group-hover:scale-110"><ShapePreview shape={(item.shape as any) || 'square'} color={item.color || '#8b5cf6'} size={92} /></div>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-slate-950/75 to-transparent px-3 pb-3 pt-10 text-left text-white">
              <div><div className="text-xs font-black">{emotionName(item.label)}</div><div className="mt-0.5 text-[10px] font-medium text-white/65">{new Date(Number(item.timestamp)).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div></div>
              <span className="text-xs font-black">♥ {item.likes || 0}</span>
            </div>
          </button>
        ))}
      </div>
      <DetailModal open={!!current} item={current as any} onClose={() => setCurrent(null)} />
    </>
  )
}
