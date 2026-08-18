import React, { useState } from 'react'
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import BrandMark from '@/components/ui/BrandMark'

function message(code?: string, fallback = '로그인하지 못했어요. 입력한 내용을 확인해주세요.') {
  if (['auth/invalid-credential', 'auth/wrong-password'].includes(code || '')) return '이메일이나 비밀번호가 맞지 않아요.'
  if (code === 'auth/user-not-found') return '가입된 계정을 찾을 수 없어요.'
  if (code === 'auth/too-many-requests') return '로그인 시도가 많아요. 잠시 후 다시 시도해주세요.'
  if (['auth/popup-blocked', 'auth/popup-closed-by-user'].includes(code || '')) return 'Google 로그인을 취소했어요.'
  return fallback
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(''); setInfo('')
    try { await action(); location.hash = '#home' }
    catch (reason: any) { setError(message(reason?.code)); console.error(reason) }
    finally { setBusy(false) }
  }

  const reset = async () => {
    if (!email.trim()) return setError('이메일을 먼저 입력해주세요.')
    try { await sendPasswordResetEmail(auth, email.trim()); setInfo('비밀번호 재설정 메일을 보냈어요.') }
    catch (reason: any) { setError(message(reason?.code, '메일 전송에 실패했어요.')) }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,92,255,.55),transparent_38%),radial-gradient(circle_at_80%_70%,rgba(56,189,248,.28),transparent_35%)]" />
        <div className="relative flex items-center gap-3"><BrandMark size={48} /><span className="text-xl font-black">SILK</span></div>
        <div className="relative max-w-xl"><h1 className="text-6xl font-black leading-[1.06] tracking-[-.055em]">오늘의 마음을<br/>색과 모양으로.</h1></div>
        <span />
      </section>

      <section className="flex min-h-screen items-center justify-center bg-white px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><BrandMark size={48} /><span className="text-xl font-black text-slate-950">SILK</span></div>
          <h2 className="text-4xl font-black tracking-[-.05em]">로그인</h2>

          <button onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))} disabled={busy} className="mt-8 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">Google로 로그인</button>
          <div className="my-6 flex items-center gap-3 text-[11px] font-bold text-slate-300"><span className="h-px flex-1 bg-slate-200"/>또는 이메일<span className="h-px flex-1 bg-slate-200"/></div>

          <form onSubmit={event => { event.preventDefault(); run(() => signInWithEmailAndPassword(auth, email.trim(), password)) }} className="space-y-3">
            <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">이메일</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required className="w-full rounded-2xl border-0 bg-slate-100 px-4 py-3.5 text-sm font-semibold outline-none ring-violet-200 focus:ring-2" /></label>
            <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">비밀번호</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="6자 이상 입력" required className="w-full rounded-2xl border-0 bg-slate-100 px-4 py-3.5 text-sm font-semibold outline-none ring-violet-200 focus:ring-2" /></label>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{error}</p>}{info && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{info}</p>}
            <button type="submit" disabled={busy} className="mt-2 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-50">{busy ? '로그인 중…' : '로그인'}</button>
          </form>
          <div className="mt-5 flex items-center justify-between text-xs font-bold"><button onClick={reset} className="text-slate-400 hover:text-slate-700">비밀번호 재설정</button><a href="#signup" className="text-violet-700">계정 만들기</a></div>
        </div>
      </section>
    </div>
  )
}
