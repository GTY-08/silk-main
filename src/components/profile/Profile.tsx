import React, { useEffect, useMemo, useState } from 'react'
import { equalTo, onValue, orderByChild, query, ref } from 'firebase/database'
import { auth, rtdb } from '@/lib/firebase'
import HistoryTimeline from '../HistoryTimeline'
import { emotionName } from '@/utils/displayNames'

type SummaryItem = { label?: string; likes?: number }

export default function Profile() {
  const user = auth.currentUser
  const [items, setItems] = useState<SummaryItem[]>([])
  const name = user?.displayName || user?.email?.split('@')[0] || '사용자'
  const initial = name.slice(0, 1).toUpperCase()

  useEffect(() => {
    if (!user?.uid) return
    return onValue(query(ref(rtdb, 'emotions'), orderByChild('userId'), equalTo(user.uid)), snapshot => {
      const next: SummaryItem[] = []
      snapshot.forEach(child => { next.push(child.val()) })
      setItems(next)
    })
  }, [user?.uid])

  const summary = useMemo(() => {
    const counts = items.reduce<Record<string, number>>((result, item) => {
      if (item.label) result[item.label] = (result[item.label] || 0) + 1
      return result
    }, {})
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    return { count: items.length, likes: items.reduce((sum, item) => sum + (item.likes || 0), 0), top }
  }, [items])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="silk-card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-400" />
        <div className="relative mt-10 flex flex-col gap-6 sm:mt-12 sm:flex-row sm:items-end">
          <div className="grid h-28 w-28 shrink-0 place-items-center rounded-[38px] border-[6px] border-white bg-slate-950 text-4xl font-black text-white shadow-xl">{initial}</div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-black tracking-[-0.04em] text-slate-950">{name}</h1>
            <p className="mt-1 truncate text-sm font-medium text-slate-400">{user?.email}</p>
          </div>
          <a href="#write" className="silk-button self-start sm:self-auto">기록하기</a>
        </div>

        <div className="mt-8 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-slate-50 px-2 py-4">
          <div className="text-center"><div className="text-xl font-black text-slate-950">{summary.count}</div><div className="mt-1 text-[11px] font-bold text-slate-400">기록</div></div>
          <div className="text-center"><div className="text-xl font-black text-slate-950">{summary.likes}</div><div className="mt-1 text-[11px] font-bold text-slate-400">받은 공감</div></div>
          <div className="text-center"><div className="truncate px-2 text-base font-black text-violet-700 sm:text-xl">{summary.top ? emotionName(summary.top) : '-'}</div><div className="mt-1 text-[11px] font-bold text-slate-400">주요 감정</div></div>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-end justify-between px-1"><h2 className="text-2xl font-black tracking-tight">감정 기록</h2><span className="text-xs font-bold text-slate-400">최신순</span></div>
        <HistoryTimeline />
      </section>
    </div>
  )
}
