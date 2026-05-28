import { useState } from 'react'
import leavesImg from '../assets/leaves.jpg'
import './Onboarding.css'

const slides = [
  {
    bg: 'image',
    emoji: null,
    title: 'Show up for\nyour people.',
    sub: 'Circle is your accountability crew — the people who keep you going.',
  },
  {
    bg: 'cream',
    emoji: '💪',
    title: 'Set goals.\nPost progress.\nGet nudged.',
    sub: 'Your circle sets a weekly goal together. Post a photo when you show up. Nudge anyone who goes quiet.',
  },
  {
    bg: 'dark',
    emoji: '⭕',
    title: 'Build your\ncircle.',
    sub: 'Create a circle and invite your people with a code. Or join one a friend already started.',
  },
]

export default function Onboarding({ onDone }) {
  const [index, setIndex] = useState(0)
  const [startX, setStartX] = useState(null)

  const next = () => index < slides.length - 1 ? setIndex(i => i + 1) : onDone()
  const prev = () => index > 0 && setIndex(i => i - 1)

  const handleTouchStart = (e) => setStartX(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (startX === null) return
    const diff = startX - e.changedTouches[0].clientX
    if (diff > 50) next()
    else if (diff < -50) prev()
    setStartX(null)
  }

  const slide = slides[index]
  const isLast = index === slides.length - 1

  return (
    <div
      className={`onboarding onboarding--${slide.bg}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {slide.bg === 'image' && (
        <div className="onboarding__img-bg">
          <img src={leavesImg} alt="" />
          <div className="onboarding__img-overlay" />
        </div>
      )}

      <div className="onboarding__content">
        {slide.emoji && <div className="onboarding__emoji">{slide.emoji}</div>}
        <h1 className="onboarding__title">{slide.title}</h1>
        <p className="onboarding__sub">{slide.sub}</p>
      </div>

      <div className="onboarding__footer">
        <div className="onboarding__dots">
          {slides.map((_, i) => (
            <div key={i} className={`onboarding__dot ${i === index ? 'onboarding__dot--active' : ''}`} />
          ))}
        </div>

        <button className="onboarding__cta" onClick={next}>
          {isLast ? 'Get Started' : 'Next'}
        </button>

        {!isLast && (
          <button className="onboarding__skip" onClick={onDone}>Skip</button>
        )}
      </div>
    </div>
  )
}
