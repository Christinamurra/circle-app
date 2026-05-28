import LeafBanner from '../components/LeafBanner'
import { getQuoteForDay } from '../data/quotes'
import './Home.css'

export default function Home({ onNavigate, circle, nudge, dismissNudge }) {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const dateRange = `${fmt(startOfWeek)} – ${fmt(endOfWeek)}`

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const quote = getQuoteForDay()

  return (
    <div className="screen">
      <header className="home-header">
        <div className="home-logo">
          <CircleLogoIcon />
          <span className="home-logo__name">Circle</span>
        </div>
      </header>

      {nudge && (
        <div className="nudge-banner">
          <span className="nudge-banner__text">👋 {nudge.from} nudged you — time to show up!</span>
          <button className="nudge-banner__close" onClick={dismissNudge}>✕</button>
        </div>
      )}

      <div className="home-hero">
        <LeafBanner height={220} />
        <div className="home-hero__content">
          <h1 className="home-hero__title">{greeting}</h1>
          <p className="home-hero__date">{dateRange}</p>
        </div>
      </div>

      <div className="home-body">
        <div className="quote-card">
          <span className="quote-card__icon"><BellIcon /></span>
          <p className="quote-card__text">"{quote.text}"</p>
          <p className="quote-card__attr">— {quote.attr}</p>
        </div>

        {!circle ? (
          <div className="empty-circle">
            <div className="empty-circle__icon"><PersonGroupIcon /></div>
            <h3 className="empty-circle__title">You're not in a circle yet</h3>
            <p className="empty-circle__sub">Create or join a circle to get started</p>
            <button className="btn-primary" onClick={() => onNavigate('circle')}>Go to Team</button>
          </div>
        ) : (
          <div className="empty-circle">
            <div className="empty-circle__icon"><PersonGroupIcon /></div>
            <h3 className="empty-circle__title">{circle.name}</h3>
            <p className="empty-circle__sub">{circle.members?.length || 1} member{(circle.members?.length || 1) !== 1 ? 's' : ''} in your circle</p>
            <button className="btn-primary" onClick={() => onNavigate('feed')}>View Feed</button>
          </div>
        )}
      </div>
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

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4614A" strokeWidth="2" strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function PersonGroupIcon() {
  return (
    <svg width="52" height="44" viewBox="0 0 52 44" fill="none">
      <circle cx="26" cy="14" r="8" stroke="#C4614A" strokeWidth="2.5" />
      <circle cx="10" cy="18" r="6" stroke="#C4614A" strokeWidth="2.5" />
      <circle cx="42" cy="18" r="6" stroke="#C4614A" strokeWidth="2.5" />
      <path d="M2 40c0-5.5 4-10 8.5-10H16" stroke="#C4614A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50 40c0-5.5-4-10-8.5-10H36" stroke="#C4614A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 43c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke="#C4614A" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
