import React from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { Route } from '@/App'
import BrandMark from '@/components/ui/BrandMark'

type IconName = 'home' | 'compass' | 'plus' | 'user' | 'logout'

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10.5 9-7.5 9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>
}

const items: { route: Route; label: string; icon: IconName }[] = [
  { route: 'home', label: '피드', icon: 'home' },
  { route: 'explore', label: '탐색', icon: 'compass' },
  { route: 'write', label: '기록', icon: 'plus' },
  { route: 'profile', label: '프로필', icon: 'user' },
]

export default function TabBar({ current }: { current: Route }) {
  const user = auth.currentUser
  const nickname = user?.displayName || user?.email?.split('@')[0] || 'silk'
  const initial = nickname.slice(0, 1).toUpperCase()

  const handleLogout = async () => {
    await signOut(auth)
    location.hash = '#login'
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#home" className="flex items-center gap-2.5" aria-label="SILK 홈">
            <BrandMark size={38} />
            <span className="text-lg font-black tracking-[-0.04em] text-slate-950">SILK</span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
            {items.map(item => {
              const active = current === item.route || (item.route === 'profile' && current === 'history')
              return (
                <a key={item.route} href={`#${item.route}`} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}>
                  <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  {item.label}
                </a>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <a href="#write" className="hidden rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700 sm:block">기록하기</a>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-sm font-black text-violet-700 ring-2 ring-white">{initial}</div>
            <button onClick={handleLogout} className="hidden rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 sm:block" title="로그아웃" aria-label="로그아웃"><Icon name="logout" /></button>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-[24px] border border-white/70 bg-slate-950/95 p-1.5 shadow-2xl shadow-slate-950/25 backdrop-blur-xl md:hidden" aria-label="모바일 메뉴">
        {items.map(item => {
          const active = current === item.route || (item.route === 'profile' && current === 'history')
          return (
            <a key={item.route} href={`#${item.route}`} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] text-[11px] font-semibold transition ${active ? 'bg-white text-slate-950' : 'text-slate-400'}`}>
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </a>
          )
        })}
      </nav>
    </>
  )
}
