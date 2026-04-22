/**
 * src/components/ui/ComingSoon.jsx
 *
 * Consistent placeholder for tools not yet implemented.
 * Used by all future tool index.jsx files.
 *
 * Props:
 *   toolId  string   matches an id in config/tools.js
 */
import { getToolById } from '../../config/tools'

export default function ComingSoon({ toolId }) {
  const tool = getToolById(toolId)

  return (
    <div style={{
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             16,
      padding:         '4rem 2rem',
      textAlign:       'center',
      border:          '1px dashed var(--border-2)',
      borderRadius:    'var(--r-xl)',
      background:      'var(--surface)',
    }}>
      {/* Bonsai sprout SVG */}
      <svg width="48" height="54" viewBox="0 0 48 54" fill="none" aria-hidden="true">
        <path d="M24 50 C23.5 43 24.5 37 24 31"
          stroke="var(--border-3)" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="16" y="48" width="16" height="5" rx="1.5" fill="var(--border)" opacity=".6"/>
        <ellipse cx="24" cy="24" rx="14" ry="11" fill="var(--surface-3)" opacity=".8"/>
        <ellipse cx="24" cy="24" rx="10" ry="7.5" fill="var(--border)" opacity=".6"/>
        <ellipse cx="24" cy="16" rx="7"  ry="5.5" fill="var(--surface-3)" opacity=".9"/>
        <ellipse cx="24" cy="10" rx="5"  ry="4"   fill="var(--border-2)"/>
        <ellipse cx="24" cy="5"  rx="3"  ry="2.5" fill="var(--border-3)" opacity=".7"/>
      </svg>

      <div>
        <p style={{
          fontFamily:  'var(--font-brand)',
          fontStyle:   'italic',
          fontWeight:  600,
          fontSize:    '1.1rem',
          color:       'var(--t-tertiary)',
          margin:      '0 0 5px',
        }}>
          Growing soon
        </p>
        <p style={{ fontSize: '.78rem', color: 'var(--t-tertiary)', margin: 0 }}>
          {tool
            ? `${tool.label} compression is on the roadmap.`
            : 'This tool is on the roadmap.'}
        </p>
      </div>
    </div>
  )
}
