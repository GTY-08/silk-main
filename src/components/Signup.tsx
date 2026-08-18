import React, { useState } from 'react'
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import BrandMark from '@/components/ui/BrandMark'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const signup = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    if (password !== confirm) return setError('비밀번호가 일치하지 않아요.')
    setBusy(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (displayName.trim()) await updateProfile(credential.user, { displayName: displayName.trim() })
      try { await sendEmailVerification(credential.user) } catch {}
      location.hash = '#home'
    } catch (reason: any) {
      const messages: Record<string, string> = { 'auth/email-already-in-use': '이미 사용 중인 이메일이에요.', 'auth/invalid-email': '이메일 형식을 확인해주세요.', 'auth/weak-password': '비밀번호는 6자 이상이어야 해요.' }
      setError(messages[reason?.code] || '회원가입에 실패했어요.')
    } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_10%,#ede9fe,transparent_35%),radial-gradient(circle_at_90%_80%,#e0f2fe,transparent_32%),#fff] px-5 py-12">
      <div className="w-full max-w-lg rounded-[32px] border border-white bg-white/90 p-6 shadow-2xl shadow-violet-100 backdrop-blur sm:p-10">
        <div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3"><BrandMark size={42} /><span className="text-lg font-black tracking-[-0.04em]">SILK</span></div><a href="#login" className="text-xs font-black text-slate-400 hover:text-slate-800">← 로그인으로</a></div>
        <h1 className="text-4xl font-black tracking-[-.05em]">회원가입</h1>
        <form onSubmit={signup} className="mt-8 space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">표시할 이름</span><input value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={20} placeholder="이름 또는 닉네임" className="w-full rounded-2xl border-0 bg-slate-100 px-4 py-3.5 text-sm font-semibold outline-none ring-violet-200 focus:ring-2" /></label>
          <label className="block"><span className="mb-2 block text-xs font-black text-slate-600">이메일</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" className="w-full rounded-2xl border-0 bg-slate-100 px-4 py-3.5 text-sm font-semibold outline-none ring-violet-200 focus:ring-2" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">비밀번호</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} required placeholder="6자 이상" className="w-full rounded-2xl border-0 bg-slate-100 px-4 py-3.5 text-sm font-semibold outline-none ring-violet-200 focus:ring-2" /></label><label className="block"><span className="mb-2 block text-xs font-black text-slate-600">비밀번호 확인</span><input type="password" value={confirm} onChange={event => setConfirm(event.target.value)} required placeholder="한 번 더 입력" className="w-full rounded-2xl border-0 bg-slate-100 px-4 py-3.5 text-sm font-semibold outline-none ring-violet-200 focus:ring-2" /></label></div>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-violet-200 transition hover:-translate-y-0.5 disabled:opacity-50">{busy ? '가입 중…' : '가입하기'}</button>
        </form>
        <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">가입하면 이용약관과 개인정보처리방침에 동의합니다.</p>
      </div>
    </div>
  )
}
