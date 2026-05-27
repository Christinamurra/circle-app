import leavesImg from '../assets/leaves.jpg'

export default function LeafBanner({ height = 240 }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: `url(${leavesImg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center 30%',
    }}>
      {/* Dark overlay so text stays readable */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)',
      }} />
    </div>
  )
}
