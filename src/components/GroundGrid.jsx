import { useEditor, useValue } from 'tldraw'
import { useGroundMode } from '../context/GroundModeContext'

const STEP_LEVELS = [1, 4, 16, 64]
const MIN_SPACING_PX = 28

function pickStep(size, z) {
  for (const candidate of STEP_LEVELS) {
    if (candidate * size * z >= MIN_SPACING_PX) return candidate
  }
  return STEP_LEVELS[STEP_LEVELS.length - 1]
}

function AxisGridSvg({ ox, oy, s, step, w, h }) {
  const nx0 = Math.ceil(-ox / s)
  const nx1 = Math.floor((w - ox) / s)
  const ny0 = Math.ceil(-oy / s)
  const ny1 = Math.floor((h - oy) / s)

  const vLines = []
  const hLines = []
  const labels = []

  for (let n = nx0; n <= nx1; n++) {
    const sx = ox + n * s
    vLines.push({ key: `v${n}`, sx, isAxis: n === 0 })
    if (n !== 0) labels.push({ key: `lx${n}`, x: sx + 4, y: oy + 14, text: String(n * step) })
  }
  for (let n = ny0; n <= ny1; n++) {
    const sy = oy + n * s
    hLines.push({ key: `h${n}`, sy, isAxis: n === 0 })
    if (n !== 0) labels.push({ key: `ly${n}`, x: ox + 4, y: sy - 4, text: String(-n * step) })
  }

  return (
    <svg className="tl-grid" aria-hidden="true">
      {vLines.map(({ key, sx, isAxis }) => (
        <line
          key={key}
          x1={sx}
          y1={0}
          x2={sx}
          y2={h}
          stroke={isAxis ? '#44454c' : '#e4e3ea'}
          strokeWidth={isAxis ? 1.5 : 1}
        />
      ))}
      {hLines.map(({ key, sy, isAxis }) => (
        <line
          key={key}
          x1={0}
          y1={sy}
          x2={w}
          y2={sy}
          stroke={isAxis ? '#44454c' : '#e4e3ea'}
          strokeWidth={isAxis ? 1.5 : 1}
        />
      ))}
      {labels.map((l) => (
        <text key={l.key} x={l.x} y={l.y} fontSize="11" fill="#8a8894">
          {l.text}
        </text>
      ))}
      <text x={ox + 4} y={oy + 14} fontSize="11" fill="#8a8894">
        0
      </text>
    </svg>
  )
}

// Origin follows the page (0,0) point — pans and zooms with the camera.
function PageAnchoredAxisGrid({ x, y, z, size }) {
  const editor = useEditor()
  const bounds = useValue('viewport-bounds', () => editor.getViewportScreenBounds(), [editor])
  const step = pickStep(size, z)
  return <AxisGridSvg ox={x * z} oy={y * z} s={step * size * z} step={step} w={bounds.w} h={bounds.h} />
}

// Fixed pixels-per-unit at z=1, independent of the page's native grid size,
// so single-unit steps stay readable instead of packing dozens of lines together.
const UNIT_PX = 40

// Origin is pinned to the exact center of the visible screen, regardless of pan.
// Always labeled in single-unit steps (1, 2, 3, ...), unlike the LOD-adaptive grid.
function CenteredAxisGrid({ z }) {
  const editor = useEditor()
  const bounds = useValue('viewport-bounds', () => editor.getViewportScreenBounds(), [editor])
  return <AxisGridSvg ox={bounds.w / 2} oy={bounds.h / 2} s={UNIT_PX * z} step={1} w={bounds.w} h={bounds.h} />
}

export function GroundGrid(props) {
  const { groundMode } = useGroundMode()
  if (groundMode === 'grid') return <CenteredAxisGrid {...props} />
  if (groundMode === 'coordinate') return <PageAnchoredAxisGrid {...props} />
  return null
}
