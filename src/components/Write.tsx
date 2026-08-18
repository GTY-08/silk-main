import React, { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { push, ref, set } from 'firebase/database'
import { auth, rtdb } from '@/lib/firebase'
import ShapePreview from '@/components/ui/ShapePreview'

const SHAPES = ['square', 'circle', 'triangle', 'diamond', 'star', 'heart', 'droplet'] as const
const SOUNDS = ['chime', 'rain', 'piano', 'drum'] as const
type Shape = (typeof SHAPES)[number]
type Sound = (typeof SOUNDS)[number]

const SHAPE_NAMES: Record<Shape, string> = { square: '사각형', circle: '원', triangle: '삼각형', diamond: '다이아', star: '별', heart: '하트', droplet: '물방울' }
const SOUND_NAMES: Record<Sound, string> = { chime: '맑은 종', rain: '빗소리', piano: '피아노', drum: '드럼' }
const SOUND_MAP: Record<Sound, string> = { chime: '/sounds/chime.mp3', rain: '/sounds/rain.mp3', piano: '/sounds/piano.mp3', drum: '/sounds/drum.mp3' }

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

export default function Write() {
  const [userId, setUserId] = useState('')
  const [color, setColor] = useState('#7c5cff')
  const [shape, setShape] = useState<Shape>('circle')
  const [sound, setSound] = useState<Sound>('chime')
  const [geo, setGeo] = useState<{ lat?: number; lng?: number }>({})
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('silk_authorName') || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || '')

  useEffect(() => onAuthStateChanged(auth, user => {
    if (!user) window.location.hash = '#login'
    else setUserId(user.uid)
  }), [])

  useEffect(() => () => { audioRef.current?.pause() }, [])

  const updateAuthor = (value: string) => {
    setAuthorName(value)
    localStorage.setItem('silk_authorName', value)
  }

  const previewSound = async (nextSound: Sound) => {
    setSound(nextSound)
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.pause()
    audioRef.current.src = SOUND_MAP[nextSound]
    audioRef.current.currentTime = 0
    await audioRef.current.play().catch(() => undefined)
  }

  const grabLocation = () => {
    if (!navigator.geolocation) return alert('이 브라우저에서는 위치를 사용할 수 없어요.')
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        setGeo({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocationLoading(false)
      },
      () => {
        setLocationLoading(false)
        alert('위치 권한을 허용해주세요.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const save = async () => {
    if (!userId) return alert('로그인이 필요해요.')
    setLoading(true)
    let prediction: ReturnType<typeof parsePrediction> = null
    try {
      const base = String(import.meta.env.VITE_AI_BASE || '').replace(/\/+$/, '')
      if (base) {
        try {
          const response = await fetch(`${base}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ color_hex: color, shape, sound }),
          })
          if (response.ok) prediction = parsePrediction(await response.text())
        } catch (error) {
          console.warn('AI 분석을 건너뛰고 기록을 저장합니다.', error)
        }
      }

      const id = push(ref(rtdb, 'emotions')).key as string
      await set(ref(rtdb, `emotions/${id}`), {
        id,
        userId,
        authorName: authorName.trim() || '익명',
        color,
        shape,
        sound,
        timestamp: Date.now(),
        likes: 0,
        ...(typeof geo.lat === 'number' ? { lat: geo.lat } : {}),
        ...(typeof geo.lng === 'number' ? { lng: geo.lng } : {}),
        ...(prediction || {}),
      })
      window.location.hash = '#home'
    } catch (error) {
      console.error(error)
      alert('저장하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div><h1 className="text-3xl font-black tracking-[-0.04em]">감정 기록</h1></div>
        <button onClick={() => history.back()} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-950">취소</button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="silk-card relative grid min-h-[440px] place-items-center overflow-hidden p-8 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:max-h-[680px]">
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 20% 15%, ${color}35, transparent 38%), linear-gradient(145deg, #fff, ${color}18)` }} />
          <div className="absolute right-5 top-5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-black text-slate-500 shadow-sm backdrop-blur">미리보기</div>
          <div className="relative text-center">
            <div className="transition-all duration-500"><ShapePreview shape={shape} color={color} size={220} /></div>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-xs font-black text-slate-700 shadow-lg backdrop-blur"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{SHAPE_NAMES[shape]} · {SOUND_NAMES[sound]}</div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="silk-card p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">작성자</h2><span className="text-xs font-bold text-slate-400">최대 20자</span></div>
            <input value={authorName} onChange={event => updateAuthor(event.target.value)} maxLength={20} placeholder="표시할 이름" className="w-full rounded-2xl border-0 bg-slate-100 px-4 py-3.5 text-sm font-semibold outline-none ring-violet-200 transition placeholder:text-slate-400 focus:ring-2" />
          </div>

          <div className="silk-card p-5 sm:p-6">
            <div className="mb-4"><h2 className="text-lg font-black">색</h2></div>
            <label className="flex cursor-pointer items-center gap-4 rounded-2xl bg-slate-100 p-3">
              <input type="color" value={color} onChange={event => setColor(event.target.value)} className="h-12 w-12 cursor-pointer overflow-hidden rounded-xl border-0 bg-transparent p-0" aria-label="감정 색상" />
              <div><div className="text-sm font-black text-slate-800">{color.toUpperCase()}</div><div className="mt-0.5 text-xs font-medium text-slate-400">눌러서 변경</div></div>
            </label>
          </div>

          <div className="silk-card p-5 sm:p-6">
            <div className="mb-4"><h2 className="text-lg font-black">모양</h2></div>
            <div className="grid grid-cols-4 gap-2">
              {SHAPES.map(item => <button key={item} onClick={() => setShape(item)} className={`grid min-h-20 place-items-center rounded-2xl border text-[10px] font-black transition ${shape === item ? 'border-slate-950 bg-slate-950 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-500 hover:border-violet-300'}`}><ShapePreview shape={item} color={shape === item ? '#ffffff' : color} size={30} /><span>{SHAPE_NAMES[item]}</span></button>)}
            </div>
          </div>

          <div className="silk-card p-5 sm:p-6">
            <div className="mb-4"><h2 className="text-lg font-black">소리</h2></div>
            <div className="grid grid-cols-2 gap-2">
              {SOUNDS.map(item => <button key={item} onClick={() => previewSound(item)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${sound === item ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-violet-200'}`}><span className={`grid h-9 w-9 place-items-center rounded-full ${sound === item ? 'bg-violet-600 text-white' : 'bg-slate-100'}`}>♪</span><span className="text-sm font-black">{SOUND_NAMES[item]}</span></button>)}
            </div>
          </div>

          <div className="silk-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-black">위치</h2><button onClick={grabLocation} disabled={locationLoading} className="silk-button-soft shrink-0">{locationLoading ? '확인 중' : typeof geo.lat === 'number' ? '위치 추가됨' : '위치 추가'}</button></div>
          </div>

          <button onClick={save} disabled={loading} className="w-full rounded-[22px] bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-base font-black text-white shadow-xl shadow-violet-200 transition hover:-translate-y-0.5 disabled:opacity-50">{loading ? '분석 중…' : '기록 올리기'}</button>
          <p className="pb-2 text-center text-xs font-medium leading-5 text-slate-400">피드에 공개됩니다.</p>
        </section>
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
