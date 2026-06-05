import { useState, useRef } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { storage, auth, db } from '../firebase'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc, arrayUnion, collection, addDoc } from 'firebase/firestore'
import confetti from 'canvas-confetti'
import LeafBanner from '../components/LeafBanner'
import './Feed.css'

export default function Feed({ posts = [], onAddPost, goal, setGoal, circle, onNavigate, user, deletePost, blockedUsers = [], onBlockUser }) {
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [expandedComments, setExpandedComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [optimisticUpdates, setOptimisticUpdates] = useState({})
  const [showModMenu, setShowModMenu] = useState(null)
  const fileInputRef = useRef(null)

  async function uploadDataUrl(dataUrl) {
    setUploading(true)
    try {
      const uid = user?.uid || auth.currentUser?.uid
      if (!uid) throw new Error('Not signed in')
      const photoRef = ref(storage, `posts/${uid}/${Date.now()}.jpg`)
      await uploadString(photoRef, dataUrl, 'data_url')
      const url = await getDownloadURL(photoRef)
      await onAddPost(url)
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#C4614A', '#F2EDE7', '#D4745E', '#ffffff', '#ffcc00'],
      })
    } catch (e) {
      console.error('Post failed:', e)
      alert('Post failed: ' + (e?.message || 'Unknown error'))
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
    if (!circle?.id) { onNavigate('circle'); return }
    const isTouchDevice = navigator.maxTouchPoints > 0
    if (!isTouchDevice) { fileInputRef.current?.click(); return }
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

  async function toggleLike(post) {
    if (!user) return
    const uid = user.uid
    const likes = post.likes || []
    const already = likes.includes(uid)
    if (post._mock) return

    const newLikes = already ? likes.filter(id => id !== uid) : [...likes, uid]
    setOptimisticUpdates(prev => ({
      ...prev,
      [post.id]: { ...prev[post.id], likes: newLikes }
    }))

    try {
      await updateDoc(doc(db, 'posts', post.id), { likes: newLikes })
    } catch (e) {
      console.error('Like update failed:', e)
      setOptimisticUpdates(prev => {
        const updated = { ...prev }
        delete updated[post.id]
        return updated
      })
      alert('Could not update like. Please try again.')
    }
  }

  async function submitComment(post) {
    const text = (commentInputs[post.id] || '').trim()
    if (!text || !user) return
    const comments = post.comments || []
    if (post._mock) return

    const newComment = {
      uid: user.uid,
      name: user.displayName || 'You',
      text,
      createdAt: new Date().toISOString()
    }
    const newComments = [...comments, newComment]

    setOptimisticUpdates(prev => ({
      ...prev,
      [post.id]: { ...prev[post.id], comments: newComments }
    }))
    setCommentInputs(prev => ({ ...prev, [post.id]: '' }))

    try {
      await updateDoc(doc(db, 'posts', post.id), { comments: newComments })
    } catch (e) {
      console.error('Comment update failed:', e)
      setOptimisticUpdates(prev => {
        const updated = { ...prev }
        delete updated[post.id]
        return updated
      })
      setCommentInputs(prev => ({ ...prev, [post.id]: text }))
      alert('Could not post comment. Please try again.')
    }
  }

  async function saveGoal() {
    const trimmed = goalInput.trim()
    if (!trimmed) return
    try {
      await setGoal(trimmed)
      setGoalInput('')
      setShowGoalModal(false)
    } catch (e) {
      console.error('Goal save failed:', e)
      alert('Could not save goal: ' + (e?.message || 'Unknown error'))
    }
  }

  async function flagPost(post, reason) {
    if (!user) return
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        flagsMade: arrayUnion({ postId: post.id, reason, createdAt: new Date().toISOString() })
      })
      setShowModMenu(null)
      alert('Thank you for reporting this content. Our team will review it within 24 hours.')
      addDoc(collection(db, 'reports'), {
        postId: post.id,
        reportedUserId: post.userId,
        reporterUserId: user.uid,
        reason,
        postContent: post.photo ? 'Photo post' : 'Unknown',
        circleId: circle?.id,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Report audit:', err))
    } catch (e) {
      console.error('Report failed:', e)
      alert('Could not submit report. Please try again.')
    }
  }

  async function blockUser(userId, userName) {
    if (!user) return
    try {
      onBlockUser?.(userId)
      await updateDoc(doc(db, 'users', user.uid), {
        blockedUsers: arrayUnion(userId)
      })
      setShowModMenu(null)
      alert(`You've blocked ${userName}. Their posts will no longer appear in your feed.`)
      addDoc(collection(db, 'reports'), {
        type: 'block',
        blockedUserId: userId,
        blockerUserId: user.uid,
        circleId: circle?.id,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Block audit:', err))
    } catch (e) {
      console.error('Block failed:', e)
      alert('Could not block user. Please try again.')
    }
  }

  const allPosts = [...posts]
    .filter(p => !blockedUsers.includes(p.userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <>
    <div className="screen feed-screen">
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />

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

        {allPosts.length === 0 ? (
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
            {allPosts.map(post => {
              const optimistic = optimisticUpdates[post.id] || {}
              const likes = optimistic.likes ?? (post.likes || [])
              const comments = optimistic.comments ?? (post.comments || [])
              const liked = user && likes.includes(user.uid)
              const showComments = expandedComments[post.id]
              return (
                <div key={post.id} className="feed-post-card">
                  <div className="feed-post-card__info">
                    <div className="feed-post-card__author">
                      <div className="feed-post-card__avatar-dot" style={{ background: post.userId === user?.uid ? '#C4614A' : '#888' }} />
                      <span className="feed-post-card__name">{post.userName || 'You'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                      <span className="feed-post-card__date">{formatDate(post.date)}</span>
                      <button
                        onClick={() => setShowModMenu(showModMenu === post.id ? null : post.id)}
                        style={{ background: 'none', padding: 4, color: '#bbb' }}
                        aria-label="More options"
                      >
                        <MoreIcon />
                      </button>
                      {showModMenu === post.id && post.userId !== user?.uid && (
                        <div className="feed-post-menu">
                          <button onClick={() => flagPost(post, 'Objectionable content')}>Report post</button>
                          <button onClick={() => blockUser(post.userId, post.userName)}>Block user</button>
                        </div>
                      )}
                      {post.userId === user?.uid && (
                        <button
                          onClick={() => { if (window.confirm('Delete this post?')) deletePost(post) }}
                          style={{ background: 'none', padding: 4, color: '#bbb' }}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </div>

                  {post.photo ? (
                    <img src={post.photo} alt="post" className="feed-post-card__photo" />
                  ) : (
                    <div className="feed-post-card__image"><ImagePlaceholderIcon /></div>
                  )}

                  <div className="feed-post-card__actions">
                    <button
                      className={`action-btn ${liked ? 'action-btn--liked' : ''}`}
                      onClick={() => toggleLike(post)}
                    >
                      <HeartIcon filled={liked} />
                      <span>{likes.length > 0 ? likes.length : ''}</span>
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                    >
                      <CommentIcon />
                      <span>{comments.length > 0 ? comments.length : ''}</span>
                    </button>
                  </div>

                  {showComments && (
                    <div className="feed-comments">
                      {comments.map((c, i) => (
                        <div key={i} className="feed-comment">
                          <span className="feed-comment__name">{c.name}</span>
                          <span className="feed-comment__text">{c.text}</span>
                        </div>
                      ))}
                      <div className="feed-comment-input-row">
                        <input
                          className="feed-comment-input"
                          placeholder="Add a comment…"
                          value={commentInputs[post.id] || ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && submitComment(post)}
                        />
                        <button className="feed-comment-send" onClick={() => submitComment(post)}>↑</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

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
          <button className="modal-btn modal-btn--primary" onClick={saveGoal}>Save Goal</button>
          {goal && (
            <button className="modal-btn modal-btn--ghost" onClick={() => { setGoal(null); setShowGoalModal(false) }}>
              Clear Goal
            </button>
          )}
        </div>
      </>
    )}
    </>
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

function HeartIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? '#C4614A' : 'none'} stroke={filled ? '#C4614A' : '#888'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
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

function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  )
}
