import { useState, useRef } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { auth, db, storage } from '../firebase'
import { signOut } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import './Profile.css'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export default function Profile({ avatar, setAvatar, posts = [], onNavigate, user, circle }) {
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const fileInputRef = useRef(null)

  const cells = buildCalendar(calYear, calMonth)
  const weekDays = ['S','M','T','W','T','F','S']
  const progressDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const thisWeekPosted = new Set()
  posts.forEach(p => {
    const d = new Date(p.date)
    const diff = Math.floor((d - weekStart) / 86400000)
    if (diff >= 0 && diff <= 6) thisWeekPosted.add(diff)
  })

  const postDates = new Set(posts.map(p => p.date))
  const postByDate = {}
  posts.forEach(p => { if (p.photo) postByDate[p.date] = p.photo })

  const isToday = (d) =>
    d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()

  const dateStr = (d) =>
    `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  const hasPost = (d) => d && postDates.has(dateStr(d))

  const todayDow = ((today.getDay() + 6) % 7)

  const handleAvatarClick = async () => {
    const isTouchDevice = navigator.maxTouchPoints > 0
    if (!isTouchDevice) { fileInputRef.current?.click(); return }
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
      })
      const dataUrl = photo.dataUrl
      setAvatar(dataUrl)
      const uid = user?.uid || auth.currentUser?.uid
      if (!uid) return
      const photoRef = ref(storage, `avatars/${uid}.jpg`)
      await uploadString(photoRef, dataUrl, 'data_url')
      const url = await getDownloadURL(photoRef)
      await updateDoc(doc(db, 'users', uid), { photoURL: url })
      setAvatar(url)
    } catch (e) {
      if (e?.message?.includes('cancel')) return
      console.error('Avatar upload failed', e)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setAvatar(dataUrl)
      try {
        const uid = user?.uid || auth.currentUser?.uid
        if (!uid) return
        const photoRef = ref(storage, `avatars/${uid}.jpg`)
        await uploadString(photoRef, dataUrl, 'data_url')
        const url = await getDownloadURL(photoRef)
        await updateDoc(doc(db, 'users', uid), { photoURL: url })
        setAvatar(url)
      } catch (e) {
        console.error('Avatar upload failed', e)
      }
    }
    reader.readAsDataURL(file)
  }

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const toLocalDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const streak = (() => {
    if (posts.length === 0) return 0
    const sorted = [...postDates].sort().reverse()
    let count = 0
    let check = new Date(today)
    for (const dateStr of sorted) {
      if (dateStr === toLocalDateStr(check)) {
        count++
        check.setDate(check.getDate() - 1)
      } else break
    }
    return count
  })()

  return (
    <div className="screen">
      <header className="profile-header">
        <div className="profile-logo">
          <CircleLogoIcon />
          <span className="profile-logo__name">Circle</span>
        </div>
        <button className="profile-logout" aria-label="Log out" onClick={() => signOut(auth)}>
          <LogoutIcon />
        </button>
      </header>

      <div className="profile-avatar-wrap">
        <button className="profile-avatar" onClick={handleAvatarClick} aria-label="Change profile photo">
          {(avatar || user?.photoURL)
            ? <img src={avatar || user?.photoURL} alt="Profile" className="profile-avatar__img" />
            : <QuestionMark />
          }
          <div className="profile-avatar__cam"><CamTinyIcon /></div>
        </button>
        <p className="profile-name">{user?.displayName || 'Your Name'}</p>
        <p className="profile-load-msg">{user?.email}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="profile-stats">
        <div className="stat">
          <span className="stat__num">{posts.length}</span>
          <span className="stat__label">Posts</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat__num">{circle ? 1 : 0}</span>
          <span className="stat__label">Circles</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat__num">{streak}</span>
          <span className="stat__label">Streak</span>
        </div>
      </div>

      <div className="profile-section">
        <h4 className="profile-section__title">YOUR PROGRESS THIS WEEK</h4>
        <div className="progress-week">
          {progressDays.map((day, i) => (
            <div key={day} className="progress-day">
              <div className={[
                'progress-dot',
                thisWeekPosted.has(i) ? 'progress-dot--posted' : '',
                i === todayDow && !thisWeekPosted.has(i) ? 'progress-dot--today' : '',
              ].join(' ')} />
              <span className="progress-day__label">{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="profile-post-btn-wrap">
        <button className="fab-btn profile-post-btn" onClick={() => onNavigate('feed')}>
          <CameraSmallIcon />
          Post an update
        </button>
      </div>

      <div className="profile-section profile-section--calendar">
        <div className="calendar-header">
          <CalendarIcon />
          <h4 className="calendar-section__title">Your Posts</h4>
        </div>
        <div className="calendar">
          <div className="calendar-nav">
            <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
            <span className="cal-month-label">{MONTHS[calMonth]} {calYear}</span>
            <button className="cal-nav-btn" onClick={nextMonth}>›</button>
          </div>
          <div className="cal-grid">
            {weekDays.map((d, i) => (
              <div key={i} className="cal-dow">{d}</div>
            ))}
            {cells.map((day, i) => {
              const ds = day ? dateStr(day) : null
              const photo = ds ? postByDate[ds] : null
              return (
                <button
                  key={i}
                  disabled={!day}
                  onClick={() => photo && setSelectedPhoto({ photo, date: ds })}
                  className={[
                    'cal-cell',
                    !day ? 'cal-cell--empty' : '',
                    day && isToday(day) ? 'cal-cell--today' : '',
                    day && hasPost(day) ? 'cal-cell--posted' : '',
                    photo ? 'cal-cell--has-photo' : '',
                  ].join(' ')}
                >
                  {photo
                    ? <img src={photo} alt={ds} className="cal-cell__photo" />
                    : day
                  }
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {selectedPhoto && (
        <div className="photo-lightbox" onClick={() => setSelectedPhoto(null)}>
          <button className="photo-lightbox__close">✕</button>
          <img src={selectedPhoto.photo} alt={selectedPhoto.date} className="photo-lightbox__img" />
          <p className="photo-lightbox__date">
            {new Date(selectedPhoto.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  )
}

function CircleLogoIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="11" stroke="#C4614A" strokeWidth="2.2" />
      <circle cx="13" cy="13" r="5.5" stroke="#C4614A" strokeWidth="2.2" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function QuestionMark() {
  return <span style={{ fontSize: 32, color: '#bbb', lineHeight: 1 }}>?</span>
}

function CamTinyIcon() {
  return (
    <svg width="12" height="11" viewBox="0 0 22 20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6.5C1 5.4 1.9 4.5 3 4.5H5L7 2h8l2 2.5h2c1.1 0 2 .9 2 2V16c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V6.5Z" />
      <circle cx="11" cy="11" r="3" />
    </svg>
  )
}

function CameraSmallIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 22 20" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6.5C1 5.4 1.9 4.5 3 4.5H5L7 2h8l2 2.5h2c1.1 0 2 .9 2 2V16c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V6.5Z" />
      <circle cx="11" cy="11" r="3.2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
