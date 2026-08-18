import React, { useCallback, useEffect, useState } from 'react'
import TabBar from '@/components/TabBar'
import Write from '@/components/Write'
import Explore from '@/components/Explore'
import Login from '@/components/Login'
import Signup from '@/components/Signup'
import History from '@/components/History'
import Profile from '@/components/profile/Profile'
import IntroSplash from '@/components/IntroSplash'
import Home from '@/components/Home'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export type Route = 'home' | 'profile' | 'explore' | 'write' | 'login' | 'signup' | 'history'

const parseHash = (): Route => {
  const hash = (location.hash || '#home').slice(1)
  const routes: Route[] = ['home', 'profile', 'explore', 'write', 'login', 'signup', 'history']
  return routes.includes(hash as Route) ? (hash as Route) : 'home'
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash())
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [introSeen, setIntroSeen] = useState(
    () => sessionStorage.getItem('silk_intro_seen') === '1',
  )

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
      setAuthReady(true)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const handleHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (user && (route === 'login' || route === 'signup')) location.hash = '#home'
    if (!user && route !== 'login' && route !== 'signup') location.hash = '#login'
  }, [authReady, route, user])

  const finishIntro = useCallback(() => {
    sessionStorage.setItem('silk_intro_seen', '1')
    setIntroSeen(true)
  }, [])

  const nextHash = !authReady || !user ? '#login' : `#${route}`

  let content: React.ReactNode
  if (!authReady) {
    content = (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-500" />
          불러오는 중
        </div>
      </div>
    )
  } else if (user) {
    content = (
      <>
        {route === 'home' && <Home />}
        {route === 'profile' && <Profile />}
        {route === 'explore' && <Explore />}
        {route === 'write' && <Write />}
        {route === 'history' && <History />}
      </>
    )
  } else {
    content = (
      <>
        {route === 'signup' ? <Signup /> : <Login />}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7fb] text-slate-950">
      {!introSeen && <IntroSplash mode="auto" nextHash={nextHash} onDone={finishIntro} />}
      {authReady && user && <TabBar current={route} />}
      <main className={authReady && user ? 'min-h-screen pb-24 pt-16 md:pb-12 md:pt-20' : ''}>
        {content}
      </main>
    </div>
  )
}
