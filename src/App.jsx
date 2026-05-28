import { useState, useEffect } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc, collection, onSnapshot, addDoc, setDoc,
  deleteDoc, query, where, orderBy, getDoc, getDocs, updateDoc, arrayUnion
} from 'firebase/firestore'
import { registerPushNotifications } from './utils/pushNotifications'
import Home from './pages/Home'
import Feed from './pages/Feed'
import Circle from './pages/Circle'
import Profile from './pages/Profile'
import SignIn from './pages/SignIn'
import Onboarding from './pages/Onboarding'
import BottomNav from './components/BottomNav'
import './App.css'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [tab, setTab] = useState('home')
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_done'))
  const [posts, setPosts] = useState([])
  const [circle, setCircleState] = useState(null)
  const [goal, setGoalState] = useState(null)
  const [localAvatar, setLocalAvatar] = useState(null)
  const [nudge, setNudge] = useState(null)
  const [members, setMembers] = useState([])

  // Auth listener — save profile to Firestore on sign-in
  useEffect(() => {
    const timeout = setTimeout(() => setUser(null), 5000)
    const unsub = onAuthStateChanged(auth, u => {
      clearTimeout(timeout)
      setUser(u ?? null)
      if (u) {
        setDoc(doc(db, 'users', u.uid), {
          displayName: u.displayName || '',
          photoURL: u.photoURL || '',
          email: u.email || '',
        }, { merge: true })
        registerPushNotifications(u.uid)
      }
    })
    return () => { clearTimeout(timeout); unsub() }
  }, [])

  // Load circle membership + nudges
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    return onSnapshot(ref, snap => {
      const data = snap.data()
      if (data?.circleId) {
        const circleRef = doc(db, 'circles', data.circleId)
        getDoc(circleRef).then(cSnap => {
          if (cSnap.exists()) setCircleState({ id: cSnap.id, ...cSnap.data() })
        })
      } else {
        setCircleState(null)
      }
      if (data?.nudge) setNudge(data.nudge)
      else setNudge(null)
      if (data?.photoURL) setLocalAvatar(data.photoURL)
    })
  }, [user])

  // Load real member profiles for current circle
  useEffect(() => {
    if (!circle?.members?.length) { setMembers([]); return }
    Promise.all(
      circle.members.map(uid => getDoc(doc(db, 'users', uid)))
    ).then(snaps => {
      setMembers(snaps.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() })))
    })
  }, [circle?.members?.join(',')])

  // Load posts for current circle
  useEffect(() => {
    if (!circle?.id) { setPosts([]); return }
    const q = query(
      collection(db, 'posts'),
      where('circleId', '==', circle.id),
      orderBy('createdAt', 'desc')
    )
    return onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [circle?.id])

  // Load goal for current circle
  useEffect(() => {
    if (!circle?.id) { setGoalState(null); return }
    const ref = doc(db, 'circles', circle.id)
    return onSnapshot(ref, snap => {
      const data = snap.data()
      const weekStart = getWeekStart()
      if (data?.goal?.week === weekStart) setGoalState(data.goal.text)
      else setGoalState(null)
    })
  }, [circle?.id])

  async function addPost(photo = null) {
    if (!user || !circle?.id) return
    await addDoc(collection(db, 'posts'), {
      circleId: circle.id,
      userId: user.uid,
      userName: user.displayName || 'You',
      photo: photo || null,
      date: todayStr(),
      createdAt: new Date()
    })
    setTab('feed')
  }

  async function deletePost(post) {
    if (!user || post.userId !== user.uid) return
    await deleteDoc(doc(db, 'posts', post.id))
  }

  async function setCircle(data) {
    if (!user) return
    if (!data) {
      await setDoc(doc(db, 'users', user.uid), { circleId: null }, { merge: true })
      setCircleState(null)
      return
    }
    const circleRef = doc(db, 'circles', data.id || data.code)
    await setDoc(circleRef, { name: data.name, code: data.code, createdBy: user.uid }, { merge: true })
    await setDoc(doc(db, 'users', user.uid), { circleId: circleRef.id }, { merge: true })
  }

  async function sendNudge(targetUid, targetName) {
    if (!user) return
    await updateDoc(doc(db, 'users', targetUid), {
      nudge: { from: user.displayName || 'Someone', sentAt: new Date().toISOString() }
    })
  }

  async function dismissNudge() {
    if (!user) return
    setNudge(null)
    await updateDoc(doc(db, 'users', user.uid), { nudge: null })
  }

  async function setGoal(text) {
    if (!circle?.id) return
    const weekStart = getWeekStart()
    if (text) {
      await updateDoc(doc(db, 'circles', circle.id), { goal: { text, week: weekStart } })
    } else {
      await updateDoc(doc(db, 'circles', circle.id), { goal: null })
    }
  }

  if (user === undefined) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #C4614A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (showOnboarding) {
    return (
      <div className="app-shell">
        <Onboarding onDone={() => {
          localStorage.setItem('onboarding_done', '1')
          setShowOnboarding(false)
        }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-shell">
        <SignIn />
        {import.meta.env.DEV && (
          <button
            onClick={() => {
              setUser({ uid: 'dev', displayName: 'Christina', email: 'christina@gmail.com', photoURL: null })
              setCircleState({ id: 'dev-circle', name: 'Morning Crew', code: 'MCR42X', members: ['dev', 'u2', 'u3'] })
            }}
            style={{ position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 12, zIndex: 999 }}
          >
            Skip sign in (dev only)
          </button>
        )}
      </div>
    )
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
        avatar={localAvatar || user?.photoURL}
        setAvatar={setLocalAvatar}
        user={user}
        onAddPost={addPost}
        goal={goal}
        setGoal={setGoal}
        nudge={nudge}
        dismissNudge={dismissNudge}
        sendNudge={sendNudge}
        members={members}
        deletePost={deletePost}
      />
      <BottomNav active={tab} onNavigate={setTab} />
    </div>
  )
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
