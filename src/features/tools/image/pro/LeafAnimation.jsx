/**
 * src/features/tools/image/pro/LeafAnimation.jsx
 * Falling celadon leaf particles for compressing queue cards.
 * Position:absolute — drop inside any position:relative container.
 */
export default function LeafAnimation() {
  const particles = [
    { left:'11%', dur:'1.75s', del:'0s',    sw:'.85s', sd:'0s',   size:5 },
    { left:'27%', dur:'2.1s',  del:'.22s',  sw:'.95s', sd:'.1s',  size:4 },
    { left:'50%', dur:'1.9s',  del:'.44s',  sw:'.78s', sd:'.2s',  size:6 },
    { left:'70%', dur:'2.0s',  del:'.15s',  sw:'1.0s', sd:'.05s', size:4 },
    { left:'86%', dur:'1.8s',  del:'.36s',  sw:'.9s',  sd:'.15s', size:5 },
  ]

  return (
    <div aria-hidden="true" style={{
      position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none',
    }}>
      <style>{`
        @keyframes lf-fall {
          0%   { transform:translateY(-6px) rotate(-8deg) scale(1);   opacity:0; }
          10%  { opacity:.85; }
          88%  { opacity:.4; }
          100% { transform:translateY(52px) rotate(70deg) scale(.6); opacity:0; }
        }
        @keyframes lf-sway {
          0%,100% { margin-left:0; }
          50%      { margin-left:5px; }
        }
      `}</style>
      {particles.map((p, i) => (
        <span key={i} style={{
          position:     'absolute',
          top:          0,
          left:         p.left,
          width:        p.size,
          height:       p.size + 2,
          background:   'var(--c)',
          borderRadius: '50% 0 50% 50%',
          animation:    [
            `lf-fall ${p.dur} ease-in ${p.del} infinite`,
            `lf-sway ${p.sw} ease-in-out ${p.sd} infinite alternate`,
          ].join(', '),
        }} />
      ))}
    </div>
  )
}
