import { useState, useEffect } from 'react'
import Home from './pages/Home'
import Feed from './pages/Feed'
import Circle from './pages/Circle'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'
import { load, save, todayStr } from './utils/storage'
import './App.css'

export default function App() {
  const [tab, setTab] = useState('home')
  const [posts, setPosts] = useState(() => load('circle_posts', []))
  const [circle, setCircle] = useState(() => load('circle_group', null))
  const [avatar, setAvatar] = useState(() => localStorage.getItem('circle_avatar') || null)

  useEffect(() => { save('circle_posts', posts) }, [posts])
  useEffect(() => { save('circle_group', circle) }, [circle])
  useEffect(() => {
    if (avatar) localStorage.setItem('circle_avatar', avatar)
    else localStorage.removeItem('circle_avatar')
  }, [avatar])

  const addPost = () => {
    const today = todayStr()
    if (!posts.find(p => p.date === today)) {
      setPosts(prev => [...prev, { date: today, id: Date.now() }])
    }
    setTab('feed')
  }

  const screens = { home: Home, feed: Feed, circle: Circle, profile: Profile }
  const Screen = screens[tab]

  return (
    <div className="app-shell">
      <Screen
        onNavigate={setTab}
        posts={posts}
        circle={circle}
        setCircle={setCircle}
        avatar={avatar}
        setAvatar={setAvatar}
        onAddPost={addPost}
      />
      <BottomNav active={tab} onNavigate={setTab} />
    </div>
  )
}
