/**
 * src/features/tools/image/pro/ProQueue.jsx
 * Horizontal scroll of in-progress and done cards at bottom of Pro editor.
 */
import LeafAnimation from './LeafAnimation'
import { useDownloads } from '../../../../hooks/useDownloads'
import { formatBytes }  from '../../../../utils/formatBytes'

function pct(orig, comp) {
  if (!orig || !comp || comp >= orig) return 0
  return Math.round((1 - comp / orig) * 100)
}

export default function ProQueue({ sessions, onRemove }) {
  const { downloadOne } = useDownloads()
  if (!sessions.length) return null

  return (
    <div>
      <p style={{ fontSize:'.6rem', fontWeight:700, letterSpacing:'.11em',
                  textTransform:'uppercase', color:'var(--c)', margin:'0 0 .6rem' }}>
        Queue — {sessions.length} image{sessions.length !== 1 ? 's' : ''}
      </p>

      <div className="h-scroll">
        {sessions.map((s, i) => (
          <QueueCard
            key={s.id}
            session={s}
            index={i}
            onDownload={() => downloadOne({
              id: s.id, name: s.name, size: s.size,
              outputName: null, result: s.result,
            })}
            onRemove={() => onRemove(s.id)} />
        ))}
      </div>
    </div>
  )
}

function QueueCard({ session, index, onDownload, onRemove }) {
  const { status, name, beforeUrl, result, progress = 0 } = session
  const isDone        = status === 'done'
  const isCompressing = status === 'compressing'
  const savings       = isDone ? pct(session.size, result?.compressedSize) : 0

  return (
    <div
      className="queue-enter"
      style={{
        flexShrink:    0,
        width:         120,
        borderRadius:  'var(--r-md)',
        border:        `1px solid ${isDone ? 'var(--c-border)' : 'var(--border)'}`,
        background:    isDone ? 'var(--c-bg)' : 'var(--surface)',
        overflow:      'hidden',
        position:      'relative',
        transition:    'border-color var(--t-base)',
        animationDelay: `${index * .05}s`,
      }}>

      {/* Thumbnail */}
      <div style={{ height:80, background:'var(--surface-2)',
                    position:'relative', overflow:'hidden' }}>
        {beforeUrl && (
          <img src={beforeUrl} alt="" style={{
            width:'100%', height:'100%', objectFit:'cover',
            filter: isCompressing ? 'brightness(.6)' : 'none',
            transition: 'filter var(--t-base)',
          }}/>
        )}

        {/* Leaf animation on compressing */}
        {isCompressing && <LeafAnimation />}

        {/* Savings badge */}
        {isDone && savings > 0 && (
          <span style={{
            position:'absolute', top:5, right:5,
            fontSize:'.58rem', fontWeight:800,
            padding:'2px 6px', borderRadius:99,
            background:'var(--c)', color:'var(--ink)',
          }}>
            −{savings}%
          </span>
        )}

        {/* Done check */}
        {isDone && (
          <span style={{
            position:'absolute', top:5, left:5,
            width:18, height:18, borderRadius:'50%',
            background:'var(--c)', color:'var(--ink)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                 stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1.5 5l2.5 2.5 4.5-4.5"/>
            </svg>
          </span>
        )}

        {/* Remove button */}
        <button
          onClick={onRemove}
          title="Remove"
          style={{
            position:'absolute', bottom:5, right:5,
            width:18, height:18, borderRadius:'50%',
            border:'none', background:'rgba(14,17,16,.55)',
            color:'rgba(255,255,255,.7)',
            cursor:'pointer', display:'flex',
            alignItems:'center', justifyContent:'center',
            opacity:0, transition:'opacity var(--t-fast)',
          }}
          onMouseEnter={e => e.currentTarget.parentElement.parentElement
            .querySelectorAll('[data-remove]').forEach(el => el.style.opacity=1)}
          /* simpler approach: */
          onFocus={e => e.currentTarget.style.opacity = 1}
          onBlur={e => e.currentTarget.style.opacity = 0}
          data-remove>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"
               stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M1 1l6 6M7 1L1 7"/>
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      {isCompressing && (
        <div style={{ height:2, background:'var(--border)' }}>
          <div style={{
            height:'100%', background:'var(--c)',
            width:`${progress}%`, transition:'width .25s ease',
          }}/>
        </div>
      )}

      {/* Info */}
      <div style={{ padding:'6px 8px 7px' }}>
        <p style={{ fontSize:'.62rem', fontWeight:600, color:'var(--t-primary)',
                    margin:'0 0 2px', whiteSpace:'nowrap',
                    overflow:'hidden', textOverflow:'ellipsis' }}
           title={name}>
          {name}
        </p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
          <p style={{ fontSize:'.58rem', color:'var(--t-tertiary)', margin:0 }}>
            {isCompressing ? `${progress}%` :
             isDone ? formatBytes(result?.compressedSize) :
             formatBytes(session.size)}
          </p>
          {isDone && result?.url && (
            <button
              onClick={onDownload}
              title="Download"
              style={{
                width:20, height:20, borderRadius:4,
                border:'none', background:'var(--c-bg)',
                color:'var(--c)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'background var(--t-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background='var(--c-bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background='var(--c-bg)'}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                   stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 1v6M2.5 5l2.5 2.5 2.5-2.5"/><path d="M1 9h8"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
