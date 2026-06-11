import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore'
import LeafBanner from '../components/LeafBanner'
import './Circle.css'

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const MOCK_MEMBERS = [
  { uid: 'u2', name: 'Jess', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80' },
  { uid: 'u3', name: 'Marcus', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80' },
  { uid: 'u4', name: 'Priya', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80' },
]

export default function Circle({ circle, setCircle, user, sendNudge, posts = [], members = [], pendingCode, clearPendingCode }) {
  const [modal, setModal] = useState(null)
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [renameInput, setRenameInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isCreator = circle && user && circle.createdBy === user.uid

  // Auto-join if invited via deep link
  useEffect(() => {
    if (pendingCode && user && !circle) {
      setJoinCode(pendingCode)
      setModal('join')
    }
  }, [pendingCode, user, circle])

  async function handleRename() {
    if (!renameInput.trim() || !circle?.id) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'circles', circle.id), { name: renameInput.trim() })
      setModal(null)
      setRenameInput('')
    } catch (e) {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const code = randomCode()
      const user = auth.currentUser
      const circleRef = doc(collection(db, 'circles'))
      await setDoc(circleRef, {
        name: name.trim(),
        code,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: new Date()
      })
      await setDoc(doc(db, 'users', user.uid), { circleId: circleRef.id }, { merge: true })
      setModal(null)
      setName('')
    } catch (e) {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setLoading(true)
    setError('')
    try {
      const user = auth.currentUser
      const code = joinCode.trim().toUpperCase()
      const q = query(collection(db, 'circles'), where('code', '==', code))
      const snap = await getDocs(q)
      if (snap.empty) {
        setError('Circle not found. Check the code and try again.')
        return
      }
      const circleDoc = snap.docs[0]
      const members = circleDoc.data().members || []
      if (!members.includes(user.uid)) {
        await setDoc(doc(db, 'circles', circleDoc.id), {
          members: [...members, user.uid]
        }, { merge: true })
      }
      await setDoc(doc(db, 'users', user.uid), { circleId: circleDoc.id }, { merge: true })
      setModal(null)
      setJoinCode('')
    } catch (e) {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLeave() {
    if (!confirm('Leave this circle?')) return
    const user = auth.currentUser
    await setDoc(doc(db, 'users', user.uid), { circleId: null }, { merge: true })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(circle?.code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const thisWeek = (() => {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    weekStart.setHours(0,0,0,0)
    const postedThisWeek = new Set()
    posts.forEach(p => {
      if (new Date(p.date + 'T12:00:00') >= weekStart) postedThisWeek.add(p.userId)
    })
    return postedThisWeek
  })()

  return (
    <div className="screen">
      <header className="circle-header">
        <div className="circle-header__logo">
          <CircleLogoIcon />
          <div>
            <h1 className="circle-header__title">{circle?.name || 'My Circle'}</h1>
            {isCreator && (
              <button className="circle-rename-btn" onClick={() => { setRenameInput(circle.name); setModal('rename'); setError('') }}>
                Edit name
              </button>
            )}
          </div>
        </div>
        {circle && (
          <button className="circle-header__add" onClick={() => { setModal('invite') }} aria-label="Invite">
            <PlusIcon />
          </button>
        )}
      </header>

      {circle ? (
        <div className="circle-active">
          <div className="circle-team-section">
            <div className="circle-team-header">
              <span className="circle-team-title">Your Team</span>
              <button className="circle-team-add" onClick={() => setModal('invite')}><PlusIcon /></button>
            </div>
            <div className="circle-team-members">
              {user && (
                <div className="circle-member">
                  <div className="circle-member__avatar circle-member__avatar--you">
                    <span>You</span>
                  </div>
                  <span className="circle-member__name">{user.displayName?.split(' ')[0] || 'You'}</span>
                </div>
              )}
              {members.filter(m => m.uid !== user?.uid).map(m => (
                <div key={m.uid} className="circle-member">
                  <div className="circle-member__avatar">
                    {m.photoURL
                      ? <img src={m.photoURL} alt={m.displayName} />
                      : <span style={{ fontSize: 14, color: '#fff' }}>{m.displayName?.[0] || '?'}</span>
                    }
                  </div>
                  <span className="circle-member__name">{m.displayName?.split(' ')[0] || 'Member'}</span>
                </div>
              ))}
              <button className="circle-member circle-member--add" onClick={() => setModal('invite')}>
                <div className="circle-member__avatar circle-member__avatar--plus">
                  <PlusIcon />
                </div>
                <span className="circle-member__name">Invite</span>
              </button>
            </div>
          </div>

          <div className="circle-this-week">
            <p className="circle-this-week__title">THIS WEEK</p>
            <div className="circle-week-rows">
              {user && (
                <div className="circle-week-row">
                  <div className="circle-week-dot" style={{ background: thisWeek.has(user.uid) ? '#C4614A' : '#E5DDD6' }} />
                  <span className="circle-week-name">{user.displayName?.split(' ')[0] || 'You'} (You)</span>
                  {!thisWeek.has(user.uid) && <span className="circle-week-status">Not posted yet</span>}
                  {thisWeek.has(user.uid) && <span className="circle-week-status circle-week-status--done">✓ Posted</span>}
                </div>
              )}
              {members.filter(m => m.uid !== user?.uid).map(m => (
                <div key={m.uid} className="circle-week-row">
                  <div className="circle-week-dot" style={{ background: thisWeek.has(m.uid) ? '#C4614A' : '#E5DDD6' }} />
                  <span className="circle-week-name">{m.displayName?.split(' ')[0] || 'Member'}</span>
                  {!thisWeek.has(m.uid) && (
                    <button className="circle-nudge-btn" onClick={() => sendNudge?.(m.uid, m.displayName)}>
                      👋 Nudge
                    </button>
                  )}
                  {thisWeek.has(m.uid) && <span className="circle-week-status circle-week-status--done">✓ Posted</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="circle-motivation-banner">
            <LeafBanner height={140} />
            <div className="circle-motivation-content">
              <p className="circle-motivation-quote">Show up for your circle. 💪</p>
            </div>
          </div>

          <div className="circle-bottom">
            <div className="circle-code-small">
              <span className="circle-code-small__label">Invite code</span>
              <span className="circle-code-small__value">{circle.code}</span>
              <button className="circle-code-small__copy" onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <button className="circle-share-btn" onClick={() => {
              const msg = `Join my circle "${circle.name}" on Circle! 💪\n\nhttps://circle-7ebf2.web.app/join/${circle.code}`
              if (navigator.share) {
                navigator.share({ text: msg })
              } else {
                navigator.clipboard.writeText(msg)
                alert('Invite message copied to clipboard!')
              }
            }}>
              <ShareIcon />
              Invite Friends to Circle
            </button>
            <button className="circle-btn-leave" onClick={handleLeave}>Leave Circle</button>
          </div>

          <button className="circle-btn-leave" onClick={handleLeave}>Leave Circle</button>
        </div>
      ) : (
        <div className="circle-body">
          <div className="circle-icon-wrap"><CircleEmptyIcon /></div>
          <h2 className="circle-empty__title">You're not in a circle yet</h2>
          <p className="circle-empty__sub">Create your own or join one with an invite code</p>
          <button className="circle-btn-create" onClick={() => { setModal('create'); setError('') }}>
            <PersonAddIcon />
            Create a Circle
          </button>
          <button className="circle-btn-join" onClick={() => { setModal('join'); setError('') }}>
            <LinkIcon />
            Join with Invite Code
          </button>
        </div>
      )}

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">Create a Circle</h3>
            <p className="modal__sub">Give your circle a name</p>
            <input
              className="modal__input"
              placeholder="e.g. Morning Crew"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            {error && <p className="modal__error">{error}</p>}
            <button className="modal__btn-primary" onClick={handleCreate} disabled={!name.trim() || loading}>
              {loading ? 'Creating…' : 'Create Circle'}
            </button>
            <button className="modal__btn-cancel" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {modal === 'join' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">Join a Circle</h3>
            <p className="modal__sub">Enter the invite code from your friend</p>
            <input
              className="modal__input modal__input--upper"
              placeholder="e.g. ABC123"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            {error && <p className="modal__error">{error}</p>}
            <button className="modal__btn-primary" onClick={handleJoin} disabled={!joinCode.trim() || loading}>
              {loading ? 'Joining…' : 'Join Circle'}
            </button>
            <button className="modal__btn-cancel" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {modal === 'rename' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">Rename Circle</h3>
            <p className="modal__sub">Only you (the creator) can rename this circle</p>
            <input
              className="modal__input"
              placeholder="New circle name"
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              autoFocus
            />
            {error && <p className="modal__error">{error}</p>}
            <button className="modal__btn-primary" onClick={handleRename} disabled={!renameInput.trim() || loading}>
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button className="modal__btn-cancel" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {modal === 'invite' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">Invite Friends</h3>
            <p className="modal__sub">Share this code with people you want to add</p>
            <div className="circle-invite-code-big">{circle.code}</div>
            <button className="modal__btn-primary" onClick={() => {
              navigator.clipboard.writeText(circle.code)
              setCopied(true)
              setTimeout(() => { setCopied(false); setModal(null) }, 1500)
            }}>
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
            <button className="modal__btn-cancel" onClick={() => setModal(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function CircleLogoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="11" stroke="#C4614A" strokeWidth="2.2" />
      <circle cx="13" cy="13" r="5.5" stroke="#C4614A" strokeWidth="2.2" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#C4614A" strokeWidth="2" strokeLinecap="round">
      <line x1="10" y1="4" x2="10" y2="16" /><line x1="4" y1="10" x2="16" y2="10" />
    </svg>
  )
}
function CircleEmptyIcon() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <circle cx="45" cy="45" r="40" stroke="#C4614A" strokeWidth="3" />
      <circle cx="45" cy="45" r="22" stroke="#C4614A" strokeWidth="3" />
    </svg>
  )
}
function CircleFilledIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#C4614A" opacity="0.15" stroke="#C4614A" strokeWidth="2.5" />
      <circle cx="40" cy="40" r="18" fill="#C4614A" opacity="0.3" stroke="#C4614A" strokeWidth="2.5" />
      <circle cx="40" cy="40" r="6" fill="#C4614A" />
    </svg>
  )
}
function PersonAddIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
      <circle cx="9" cy="8" r="4" /><path d="M2 20c0-4 3.1-7 7-7s7 3 7 7" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}
