import React, { useEffect, useMemo, useRef, useState } from 'react'
import { onValue, ref as dbRef, runTransaction, update } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import ShapePreview from '@/components/ui/ShapePreview'
import DetailModal from '@/components/DetailModal'
import { shapeName, soundName } from '@/utils/displayNames'

type Emotion = {
  id: string
  userId?: string
  authorName?: string
  color?: string
  shape?: string
  sound?: string
  label?: string
  score?: number
  scores?: Record<string, number>
  lat?: number
  lng?: number
  timestamp?: number
  likes?: number
}

const AI_BASE = String(import.meta.env.VITE_AI_BASE || '').replace(/\/+$/, '')
const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID

const LABELS: Record<string, { ko: string; className: string }> = {
  happy: { ko: '기쁨', className: 'bg-amber-50 text-amber-700' },
  calm: { ko: '평온', className: 'bg-sky-50 text-sky-700' },
  love: { ko: '사랑', className: 'bg-rose-50 text-rose-700' },
  sad: { ko: '슬픔', className: 'bg-indigo-50 text-indigo-700' },
  angry: { ko: '분노', className: 'bg-orange-50 text-orange-700' },
  fear: { ko: '불안', className: 'bg-violet-50 text-violet-700' },
}

let naverMapsLoader: Promise<any> | null = null

function loadNaverMaps() {
  const ready = (window as any).naver?.maps
  if (ready) return Promise.resolve((window as any).naver)
  if (!NAVER_MAP_CLIENT_ID) return Promise.reject(new Error('지도 설정을 확인해주세요.'))
  if (!naverMapsLoader) {
    naverMapsLoader = new Promise((resolve, reject) => {
      const existing = document.getElementById('naver-maps-sdk') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', () => resolve((window as any).naver))
        existing.addEventListener('error', () => reject(new Error('지도를 불러오지 못했어요.')))
        return
      }
      const script = document.createElement('script')
      script.id = 'naver-maps-sdk'
      script.async = true
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAP_CLIENT_ID)}`
      script.onload = () => (window as any).naver?.maps ? resolve((window as any).naver) : reject(new Error('지도 설정을 확인해주세요.'))
      script.onerror = () => reject(new Error('지도를 불러오지 못했어요.'))
      document.head.appendChild(script)
    })
  }
  return naverMapsLoader
}

function parsePrediction(text: string) {
  try {
    const result = JSON.parse(text)
    if (typeof result?.prediction === 'string' && Number.isFinite(Number(result?.confidence))) {
      return { label: result.prediction.toLowerCase(), score: Number(result.confidence), scores: result.probabilities }
    }
    const entries = Object.entries(result?.probabilities || result?.scores || {}).filter(([, value]) => Number.isFinite(Number(value))) as [string, number][]
    entries.sort((a, b) => Number(b[1]) - Number(a[1]))
    if (entries.length) return { label: entries[0][0].toLowerCase(), score: Number(entries[0][1]), scores: result.probabilities || result.scores }
  } catch {}
  return null
}

function safeColor(value?: string) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value! : '#8b5cf6'
}

function dateLabel(timestamp?: number) {
  if (!timestamp) return '오늘'
  return new Date(timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function Explore() {
  const [cards, setCards] = useState<Emotion[]>([])
  const [mapError, setMapError] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [current, setCurrent] = useState<Emotion | null>(null)
  const [view, setView] = useState<'all' | 'nearby' | 'unanalyzed'>('all')
  const mapElementRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const circlesRef = useRef<any[]>([])

  useEffect(() => onValue(dbRef(rtdb, 'emotions'), snapshot => {
    const value = snapshot.val() || {}
    const next = Object.keys(value).map(id => ({ ...value[id], id })) as Emotion[]
    setCards(next.filter(item => typeof item.timestamp === 'number').sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)))
  }), [])

  useEffect(() => {
    let cancelled = false
    loadNaverMaps().then(naver => {
      if (cancelled || !mapElementRef.current || mapRef.current) return
      mapRef.current = new naver.maps.Map(mapElementRef.current, {
        center: new naver.maps.LatLng(37.5665, 126.978),
        zoom: 11,
        minZoom: 6,
        zoomControl: true,
        zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
        scaleControl: false,
        mapDataControl: false,
      })
      setMapReady(true)
    }).catch(error => setMapError(error?.message || '지도를 불러오지 못했어요.'))
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const naver = (window as any).naver
    if (!naver?.maps) return

    markersRef.current.forEach(marker => marker.setMap(null))
    circlesRef.current.forEach(circle => circle.setMap(null))
    markersRef.current = []
    circlesRef.current = []

    const located = cards.filter(card => typeof card.lat === 'number' && typeof card.lng === 'number')
    const bounds = new naver.maps.LatLngBounds()

    located.forEach(card => {
      const position = new naver.maps.LatLng(card.lat, card.lng)
      const color = safeColor(card.color)
      const marker = new naver.maps.Marker({
        map: mapRef.current,
        position,
        title: card.label || '감정 기록',
        icon: {
          content: `<div style="width:38px;height:38px;border-radius:15px;background:${color};border:4px solid white;box-shadow:0 8px 22px rgba(15,23,42,.24);display:grid;place-items:center;color:white;font-size:13px;font-weight:900">${(LABELS[card.label || '']?.ko || '마음').slice(0, 1)}</div>`,
          anchor: new naver.maps.Point(19, 19),
        },
      })
      naver.maps.Event.addListener(marker, 'click', () => setCurrent(card))
      markersRef.current.push(marker)
      bounds.extend(position)
    })

    const happyCards = located.filter(card => {
      const value = card.scores?.happy ?? (card.label === 'happy' ? card.score : 0)
      return typeof value === 'number' && value >= 0.6
    })
    happyCards.forEach(card => {
      circlesRef.current.push(new naver.maps.Circle({
        map: mapRef.current,
        center: new naver.maps.LatLng(card.lat, card.lng),
        radius: 90,
        strokeColor: '#8b5cf6',
        strokeWeight: 1,
        strokeOpacity: 0.35,
        fillColor: safeColor(card.color),
        fillOpacity: 0.12,
        clickable: false,
      }))
    })

    if (located.length === 1) {
      mapRef.current.setCenter(new naver.maps.LatLng(located[0].lat, located[0].lng))
      mapRef.current.setZoom(15)
    } else if (located.length > 1) {
      mapRef.current.fitBounds(bounds, { top: 70, right: 50, bottom: 70, left: 50 })
    }
  }, [cards, mapReady])

  const visibleCards = useMemo(() => {
    if (view === 'nearby') return cards.filter(card => typeof card.lat === 'number' && typeof card.lng === 'number')
    if (view === 'unanalyzed') return cards.filter(card => !card.label)
    return cards
  }, [cards, view])

  const focusOnMap = (card: Emotion) => {
    const naver = (window as any).naver
    if (!mapRef.current || !naver?.maps || typeof card.lat !== 'number' || typeof card.lng !== 'number') return
    mapRef.current.panTo(new naver.maps.LatLng(card.lat, card.lng))
    mapRef.current.setZoom(16)
    mapElementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const analyze = async (card: Emotion) => {
    if (!AI_BASE || busyId) return
    setBusyId(card.id)
    try {
      const response = await fetch(`${AI_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color_hex: card.color, shape: card.shape, sound: card.sound }),
      })
      const text = await response.text()
      if (!response.ok) throw new Error('분석 서버에 연결하지 못했어요.')
      const result = parsePrediction(text)
      if (!result) throw new Error('분석 결과를 읽지 못했어요.')
      await update(dbRef(rtdb, `emotions/${card.id}`), result)
    } catch (error: any) {
      alert(error?.message || '분석하지 못했어요. 다시 시도해주세요.')
    } finally {
      setBusyId(null)
    }
  }

  const like = (id: string) => runTransaction(dbRef(rtdb, `emotions/${id}/likes`), value => typeof value === 'number' ? value + 1 : 1)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-3xl font-black tracking-[-0.04em]">감정 탐색</h1></div>
        <a href="#write" className="silk-button self-start sm:self-auto">감정 남기기</a>
      </header>

      <section className="silk-card relative overflow-hidden p-2">
        <div ref={mapElementRef} className="h-[390px] w-full overflow-hidden rounded-[22px] bg-slate-100 sm:h-[470px]" />
        <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
          <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur"><div className="text-xs font-black text-slate-900">네이버 지도</div><div className="mt-0.5 text-[11px] font-medium text-slate-500">{cards.filter(card => typeof card.lat === 'number').length}개의 위치 기록</div></div>
          <div className="hidden rounded-full bg-slate-950/85 px-3 py-2 text-[11px] font-bold text-white backdrop-blur sm:block">마커를 눌러 기록 보기</div>
        </div>
        {mapError && <div className="absolute inset-2 grid place-items-center rounded-[22px] bg-slate-950/90 p-8 text-center text-white"><div><p className="font-black">지도를 열지 못했어요</p><p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{mapError}</p></div></div>}
      </section>

      <div className="mb-5 mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h2 className="text-xl font-black tracking-tight">최근 기록</h2></div>
        <div className="flex rounded-full bg-slate-200/70 p-1">
          {([['all', '전체'], ['nearby', '위치 있음'], ['unanalyzed', '분석 전']] as const).map(([key, label]) => <button key={key} onClick={() => setView(key)} className={`rounded-full px-4 py-2 text-xs font-black transition ${view === key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map(card => {
          const meta = LABELS[card.label || '']
          const located = typeof card.lat === 'number' && typeof card.lng === 'number'
          return (
            <article key={card.id} className="silk-card group overflow-hidden">
              <button onClick={() => setCurrent(card)} className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden" style={{ background: `linear-gradient(145deg, #fff, ${safeColor(card.color)}1f)` }}>
                <div className="transition duration-500 group-hover:scale-110"><ShapePreview shape={(card.shape as any) || 'square'} color={safeColor(card.color)} size={116} /></div>
                <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-sm backdrop-blur">{dateLabel(card.timestamp)}</span>
                {located && <span className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-sm text-white">⌖</span>}
              </button>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-black">{card.authorName || '익명'}</p><p className="mt-0.5 text-xs font-medium text-slate-400">{shapeName(card.shape)} · {soundName(card.sound)}</p></div>{meta ? <span className={`rounded-full px-3 py-1.5 text-xs font-black ${meta.className}`}>{meta.ko}</span> : <button onClick={() => analyze(card)} disabled={busyId === card.id} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">{busyId === card.id ? '분석 중' : '분석하기'}</button>}</div>
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3"><button onClick={() => like(card.id)} className="text-xs font-black text-violet-700">♥ {card.likes || 0}</button>{located && <button onClick={() => focusOnMap(card)} className="ml-auto text-xs font-black text-slate-500 hover:text-slate-950">지도에서 보기 →</button>}</div>
              </div>
            </article>
          )
        })}
      </div>

      {!visibleCards.length && <div className="silk-card mt-4 grid min-h-52 place-items-center text-center text-sm font-semibold text-slate-400">기록이 없어요.</div>}
      <DetailModal open={!!current} item={current} onClose={() => setCurrent(null)} />
    </div>
  )
}
