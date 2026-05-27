import './BottomNav.css'

const tabs = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'feed', label: 'Feed', icon: FeedIcon },
  { id: 'circle', label: 'Circle', icon: CircleGroupIcon },
  { id: 'profile', label: 'Profile', icon: ProfileIcon },
]

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-tab ${active === id ? 'nav-tab--active' : ''}`}
          onClick={() => onNavigate(id)}
        >
          <Icon active={active === id} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function HomeIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
        fill={active ? '#C4614A' : 'none'}
        stroke={active ? '#C4614A' : '#888'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FeedIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5"
        fill={active ? '#C4614A' : 'none'}
        stroke={active ? '#C4614A' : '#888'} strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5"
        fill={active ? '#C4614A' : 'none'}
        stroke={active ? '#C4614A' : '#888'} strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5"
        fill={active ? '#C4614A' : 'none'}
        stroke={active ? '#C4614A' : '#888'} strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5"
        fill={active ? '#C4614A' : 'none'}
        stroke={active ? '#C4614A' : '#888'} strokeWidth="1.8" />
    </svg>
  )
}

function CircleGroupIcon({ active }) {
  const c = active ? '#C4614A' : '#888'
  return (
    <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
      <circle cx="13" cy="8" r="4" stroke={c} strokeWidth="1.8" fill={active ? '#C4614A' : 'none'} />
      <circle cx="5" cy="10" r="3" stroke={c} strokeWidth="1.8" fill={active ? '#C4614A' : 'none'} />
      <circle cx="21" cy="10" r="3" stroke={c} strokeWidth="1.8" fill={active ? '#C4614A' : 'none'} />
      <path d="M1 20C1 17.2 3 15 5.5 15H8" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M25 20C25 17.2 23 15 20.5 15H18" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 21C7 18.2 9.7 16 13 16C16.3 16 19 18.2 19 21" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ProfileIcon({ active }) {
  const c = active ? '#C4614A' : '#888'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" fill={active ? '#C4614A' : 'none'} />
      <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
