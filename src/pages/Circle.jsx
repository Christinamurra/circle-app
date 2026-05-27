import { useState } from 'react'
import { db, auth } from '../firebase'
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import './Circle.css'

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function Circle({ circle, setCircle }) {
  const [modal, setModal] = useState(null)
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="screen">
      <header className="circle-header">
        <h1 className="circle-header__title">My Circle</h1>
        {circle && (
          <button className="circle-header__add" onClick={() => { setModal('invite') }} aria-label="Invite">
            <PlusIcon />
          </button>
        )}
      </header>

      {circle ? (
        <div className="circle-active">
          <div className="circle-active__icon"><CircleFilledIcon /></div>
          <h2 className="circle-active__name">{circle.name}</h2>
          <p className="circle-active__members">{circle.members?.length || 1} member{(circle.members?.length || 1) !== 1 ? 's' : ''}</p>

          <div className="circle-invite-box">
            <p className="circle-invite-label">Invite code — share this with friends</p>
            <div className="circle-invite-row">
              <span className="circle-invite-code">{circle.code}</span>
              <button className="circle-invite-copy" onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
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
