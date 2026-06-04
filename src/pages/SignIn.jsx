import { useState } from 'react'
import { auth } from '../firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import './SignIn.css'

export default function SignIn() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEula, setShowEula] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!agreedToTerms) {
      setShowEula(true)
      return
    }
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signin-screen">
      {!agreedToTerms && (
        <>
          <div className="modal-overlay" />
          <div className="modal-sheet" style={{ maxHeight: '90vh' }}>
            <div className="modal-handle" />
            <h3 className="modal-title">Terms of Service</h3>
            <div className="modal-content">
              <p><strong>Acceptable Use Policy</strong></p>
              <p>By using Circle, you agree that you will not post, share, or engage in any of the following:</p>
              <ul>
                <li>Harassing, bullying, or abusive content directed at any individual</li>
                <li>Hate speech, discrimination, or content that demeans protected groups</li>
                <li>Explicit sexual content or nudity</li>
                <li>Violence, threats, or illegal activity</li>
                <li>Spam, scams, or misleading information</li>
                <li>Content that violates anyone's privacy or intellectual property rights</li>
              </ul>
              <p><strong>Content Moderation</strong></p>
              <p>We are committed to maintaining a safe community. Circle includes tools to flag objectionable content and block abusive users. All reports are reviewed within 24 hours. Repeat violations will result in account suspension or termination.</p>
            </div>
            <button className="modal-btn modal-btn--primary" onClick={() => setAgreedToTerms(true)}>
              I Agree & Continue
            </button>
          </div>
        </>
      )}

      <div className="signin-top">
        <div className="signin-logo">
          <CircleLogoIcon />
        </div>
        <h1 className="signin-title">Circle</h1>
        <p className="signin-sub">Share progress. Stay accountable.</p>
      </div>

      <div className="signin-card">
        <div className="signin-tabs">
          <button
            className={`signin-tab ${mode === 'login' ? 'signin-tab--active' : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            Sign In
          </button>
          <button
            className={`signin-tab ${mode === 'signup' ? 'signin-tab--active' : ''}`}
            onClick={() => { setMode('signup'); setError('') }}
          >
            Create Account
          </button>
        </div>

        <form className="signin-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input
              className="signin-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
            />
          )}
          <input
            className="signin-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="signin-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
          />
          {error && <p className="signin-error">{error}</p>}
          <button className="signin-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>

      {showEula && (
        <>
          <div className="modal-overlay" onClick={() => setShowEula(false)} />
          <div className="modal-sheet">
            <div className="modal-handle" />
            <h3 className="modal-title">Terms of Service</h3>
            <div className="modal-content">
              <p><strong>Acceptable Use Policy</strong></p>
              <p>By using Circle, you agree that you will not post, share, or engage in any of the following:</p>
              <ul>
                <li>Harassing, bullying, or abusive content directed at any individual</li>
                <li>Hate speech, discrimination, or content that demeans protected groups</li>
                <li>Explicit sexual content or nudity</li>
                <li>Violence, threats, or illegal activity</li>
                <li>Spam, scams, or misleading information</li>
                <li>Content that violates anyone's privacy or intellectual property rights</li>
              </ul>
              <p><strong>Content Moderation</strong></p>
              <p>We are committed to maintaining a safe community. Circle includes tools to flag objectionable content and block abusive users. All reports are reviewed within 24 hours. Repeat violations will result in account suspension or termination.</p>
            </div>
            <button className="modal-btn modal-btn--primary" onClick={() => setShowEula(false)}>I Agree</button>
          </div>
        </>
      )}
    </div>
  )
}

function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

function CircleLogoIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#C4614A" strokeWidth="3" />
      <circle cx="24" cy="24" r="10" stroke="#C4614A" strokeWidth="3" />
      <circle cx="24" cy="24" r="3" fill="#C4614A" />
    </svg>
  )
}
