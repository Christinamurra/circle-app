import { useState, useRef } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { storage, auth } from '../firebase'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import LeafBanner from '../components/LeafBanner'
import './Feed.css'

export default function Feed({ posts = [], onAddPost, goal, setGoal, circle, onNavigate }) {
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  async function uploadDataUrl(dataUrl) {
    setUploading(true)
    try {
      const uid = auth.currentUser?.uid
      const photoRef = ref(storage, `posts/${uid}/${Date.now()}.jpg`)
      await uploadString(photoRef, dataUrl, 'data_url')
      const url = await getDownloadURL(photoRef)
      await onAddPost(url)
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = ev => uploadDataUrl(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handlePostUpdate() {
    if (!circle?.id) {
      onNavigate('circle')
      return
    }
    const isTouchDevice = navigator.maxTouchPoints > 0
    if (!isTouchDevice) {
      fileInputRef.current?.click()
      return
    }
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
      })
      await uploadDataUrl(photo.dataUrl)
    } catch (e) {
      const msg = e?.message || ''
      if (msg === 'User cancelled photos app' || msg.includes('cancel')) return
      if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('permission')) {
        alert('Please allow camera and photo access in Settings > Circle to post updates.')
        return
      }
      console.error(e)
    }
  }

  function saveGoal() {
    const trimmed = goalInput.trim()
    if (!trimmed) return
    setGoal(trimmed)
    setGoalInput('')
    setShowGoalModal(false)
  }

  return (
    <div className="screen feed-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      <header className="feed-header">
        <div className="feed-logo">
          <CircleLogoIcon />
          <span className="feed-logo__name">Circle</span>
        </div>
        <button className="feed-header__cam" aria-label="Open camera" onClick={handlePostUpdate}>
          <CameraIcon />
        </button>
      </header>

      <div className="feed-body">
        <div className="goal-banner">
          <LeafBanner height={180} />
          <div className="goal-banner__content">
            <span className="goal-banner__week">THIS WEEK</span>
            <h2 className="goal-banner__title">{goal || 'No goal set yet'}</h2>
            <button
              className="goal-banner__btn"
              onClick={() => {
                if (!circle?.id) { onNavigate('circle'); return }
                setGoalInput(goal || '')
                setShowGoalModal(true)
              }}
            >
              {goal ? 'Edit Goal' : 'Set a Goal'}
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty__icon"><ImagePlaceholderIcon /></div>
            <h3 className="feed-empty__title">No posts yet</h3>
            <p className="feed-empty__sub">Be the first to share progress on the team goal.</p>
            <button className="btn-post" onClick={handlePostUpdate}>
              <CameraSmallIcon color="#C4614A" />
              Post an update
            </button>
          </div>
        ) : (
          <div className="feed-posts">
            {[...posts].reverse().map(post => (
              <div key={post.id} className="feed-post-card">
                <div className="feed-post-card__info">
                  <span className="feed-post-card__name">You</span>
                  <span className="feed-post-card__date">{formatDate(post.date)}</span>
                </div>
                {post.photo ? (
                  <img src={post.photo} alt="post" className="feed-post-card__photo" />
                ) : (
                  <div className="feed-post-card__image"><ImagePlaceholderIcon /></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="feed-fab">
        <button className="fab-btn" onClick={handlePostUpdate} disabled={uploading}>
          <CameraSmallIcon color="#fff" />
          {uploading ? 'Uploading…' : 'Post an update'}
        </button>
      </div>

      {showGoalModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowGoalModal(false)} />
          <div className="modal-sheet">
            <div className="modal-handle" />
            <h3 className="modal-title">Set This Week's Goal</h3>
            <p className="modal-sub">What does your circle want to achieve this week?</p>
            <textarea
              className="goal-input"
              placeholder="e.g. Work out 3 times this week"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              rows={3}
              autoFocus
            />
            <button className="modal-btn modal-btn--primary" onClick={saveGoal}>
              Save Goal
            </button>
            {goal && (
              <button className="modal-btn modal-btn--ghost" onClick={() => { setGoal(null); setShowGoalModal(false) }}>
                Clear Goal
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CircleLogoIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="11" stroke="#C4614A" strokeWidth="2.2" />
      <circle cx="13" cy="13" r="5.5" stroke="#C4614A" strokeWidth="2.2" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6.5C1 5.4 1.9 4.5 3 4.5H5L7 2h8l2 2.5h2c1.1 0 2 .9 2 2V16c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V6.5Z" />
      <circle cx="11" cy="11" r="3.2" />
    </svg>
  )
}

function CameraSmallIcon({ color = '#fff' }) {
  return (
    <svg width="18" height="16" viewBox="0 0 22 20" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6.5C1 5.4 1.9 4.5 3 4.5H5L7 2h8l2 2.5h2c1.1 0 2 .9 2 2V16c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V6.5Z" />
      <circle cx="11" cy="11" r="3.2" />
    </svg>
  )
}

function ImagePlaceholderIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <rect x="4" y="8" width="44" height="36" rx="5" stroke="#ccc" strokeWidth="2.5" />
      <circle cx="16" cy="20" r="4" stroke="#ccc" strokeWidth="2.5" />
      <path d="M4 36L16 24L24 32L32 22L48 38" stroke="#ccc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
