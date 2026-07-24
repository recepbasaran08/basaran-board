import { useState, useRef, useEffect } from 'react'
import { useEditor, useValue, DefaultColorStyle, DefaultSizeStyle, GeoShapeGeoStyle } from 'tldraw'
import { useGroundMode } from '../context/GroundModeContext'
import { useMaterial } from '../context/MaterialContext'
import { processMaterialFiles, MaterialFileError } from '../utils/materialFiles'
import './LeftToolbar.css'

const COLORS = [
  { id: 'black', label: 'Siyah', hex: '#1d1d1d' },
  { id: 'blue', label: 'Mavi', hex: '#4465e9' },
  { id: 'red', label: 'Kırmızı', hex: '#e03131' },
  { id: 'green', label: 'Yeşil', hex: '#2f9e44' },
]

const SIZES = [
  { id: 's', label: 'İnce', dot: 5 },
  { id: 'm', label: 'Orta', dot: 8 },
  { id: 'l', label: 'Kalın', dot: 12 },
]

const SHAPES = [
  { id: 'rectangle', label: 'Dikdörtgen' },
  { id: 'ellipse', label: 'Daire / Oval' },
  { id: 'triangle', label: 'Üçgen' },
  { id: 'diamond', label: 'Eşkenar Dörtgen' },
  { id: 'star', label: 'Yıldız' },
  { id: 'hexagon', label: 'Altıgen' },
]

const BASE_GROUNDS = [
  { id: 'white', label: 'Beyaz Tahta' },
  { id: 'grid', label: 'Koordinat Ekseni' },
  { id: 'coordinate', label: 'Kareli Defter' },
]

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

const SelectIcon = () => (
  <Icon><path d="M5 3l14 7-6 2-2 6-6-15z" /></Icon>
)
const PenIcon = () => (
  <Icon><path d="M4 20l1-4.5L15.5 5l3.5 3.5L8.5 19 4 20z" /><path d="M13 7l3.5 3.5" /></Icon>
)
const EraserIcon = () => (
  <Icon><path d="M18 13l-7 7H7l-4-4a2 2 0 010-2.8L13 3l8 8-3 2z" /><path d="M9 20H21" /></Icon>
)
const GroundIcon = () => (
  <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></Icon>
)
const UploadIcon = () => (
  <Icon><path d="M21.44 11.05l-8.49 8.49a4.5 4.5 0 01-6.36-6.36l8.49-8.49a3 3 0 014.24 4.24l-8.49 8.49a1.5 1.5 0 01-2.12-2.12l7.07-7.07" /></Icon>
)
const ShapesIcon = () => (
  <Icon><rect x="3" y="3" width="8" height="8" rx="1" /><circle cx="17" cy="7" r="4" /><path d="M4 21l4-8 4 8z" /></Icon>
)

const SHAPE_PREVIEWS = {
  rectangle: <rect x="3" y="5" width="18" height="14" rx="1" />,
  ellipse: <ellipse cx="12" cy="12" rx="9" ry="7" />,
  triangle: <path d="M12 3l9 18H3z" />,
  diamond: <path d="M12 2l10 10-10 10L2 12z" />,
  star: (
    <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7-5.4-4.7 7.1-.6z" />
  ),
  hexagon: <path d="M7 3h10l5 9-5 9H7l-5-9z" />,
}

function ShapePreviewIcon({ geo }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      {SHAPE_PREVIEWS[geo]}
    </svg>
  )
}

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
    <path d="M12 2a4 4 0 00-4 4v3H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm-2 7V6a2 2 0 114 0v3z" />
  </svg>
)

export function LeftToolbar({ restricted = false, uploadAllowed = false, onRequestUpload, onUploadHandled }) {
  const editor = useEditor()
  const { groundMode, setGroundMode } = useGroundMode()
  const { pages, label, loadPages } = useMaterial()
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const [openFlyout, setOpenFlyout] = useState(null)
  const [notice, setNotice] = useState(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [uploading, setUploading] = useState(false)

  const grounds = pages.length > 0 ? [...BASE_GROUNDS, { id: 'material', label: label || 'Yüklenen Materyal' }] : BASE_GROUNDS

  const currentToolId = useValue('current-tool', () => editor.getCurrentToolId(), [editor])
  const currentColor = useValue(
    'current-color',
    () => editor.getStyleForNextShape(DefaultColorStyle) ?? 'black',
    [editor]
  )
  const currentSize = useValue(
    'current-size',
    () => editor.getStyleForNextShape(DefaultSizeStyle) ?? 'm',
    [editor]
  )
  const currentGeo = useValue(
    'current-geo',
    () => editor.getStyleForNextShape(GeoShapeGeoStyle) ?? 'rectangle',
    [editor]
  )

  useEffect(() => {
    if (!openFlyout) return
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenFlyout(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openFlyout])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(t)
  }, [notice])

  function selectTool() {
    editor.updateInstanceState({ isToolLocked: false })
    editor.setCurrentTool('select')
    setOpenFlyout(null)
  }

  function choosePen() {
    editor.updateInstanceState({ isToolLocked: false })
    editor.setCurrentTool('draw')
    setOpenFlyout((v) => (v === 'pen' ? null : 'pen'))
  }

  function toggleShapesFlyout() {
    setOpenFlyout((v) => (v === 'shapes' ? null : 'shapes'))
  }

  function pickShape(geoId) {
    editor.setStyleForNextShapes(GeoShapeGeoStyle, geoId)
    // Kilitli tut: aynı şekli tekrar tekrar (farklı boyutlarda) çizebilsin,
    // her seferinde panele geri dönmesi gerekmesin.
    editor.updateInstanceState({ isToolLocked: true })
    editor.setCurrentTool('geo')
  }

  function pickColor(colorId) {
    editor.setStyleForNextShapes(DefaultColorStyle, colorId)
    editor.setStyleForSelectedShapes(DefaultColorStyle, colorId)
  }

  function pickSize(sizeId) {
    editor.setStyleForNextShapes(DefaultSizeStyle, sizeId)
    editor.setStyleForSelectedShapes(DefaultSizeStyle, sizeId)
  }

  function chooseEraser() {
    editor.updateInstanceState({ isToolLocked: false })
    editor.setCurrentTool('eraser')
    setOpenFlyout(null)
  }

  function requestClearPage() {
    setConfirmingClear(true)
  }

  function confirmClearPage() {
    editor.deleteShapes(Array.from(editor.getCurrentPageShapeIds()))
    setConfirmingClear(false)
  }

  function toggleGroundFlyout() {
    setOpenFlyout((v) => (v === 'zemin' ? null : 'zemin'))
  }

  function pickGround(groundId) {
    editor.updateInstanceState({ isGridMode: groundId === 'grid' || groundId === 'coordinate' })
    setGroundMode(groundId)
    setOpenFlyout(null)
  }

  const uploadLocked = restricted && !uploadAllowed

  function clickUpload() {
    if (uploadLocked) {
      onRequestUpload?.()
      setNotice('Dosya yüklemek için öğretmeninizden izin isteyin.')
      return
    }
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const result = await processMaterialFiles(files)
      loadPages(result.pages, result.label)
      editor.updateInstanceState({ isGridMode: false })
      setGroundMode('material')
      if (result.warning) setNotice(result.warning)
      if (restricted) onUploadHandled?.()
    } catch (err) {
      setNotice(err instanceof MaterialFileError ? err.message : 'Dosya yüklenirken bir hata oluştu.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="left-toolbar" ref={containerRef}>
      <button
        type="button"
        className={`lt-btn ${currentToolId === 'select' ? 'active' : ''}`}
        title="Seçim Aracı"
        onClick={selectTool}
      >
        <SelectIcon />
      </button>

      <div className="lt-item">
        <button
          type="button"
          className={`lt-btn ${currentToolId === 'draw' ? 'active' : ''}`}
          title="Kalem"
          onClick={choosePen}
        >
          <PenIcon />
          <span className="lt-swatch" style={{ background: COLORS.find((c) => c.id === currentColor)?.hex ?? '#1d1d1d' }} />
        </button>
        {openFlyout === 'pen' && (
          <div className="lt-flyout">
            <div className="lt-flyout-label">Renk</div>
            <div className="lt-row">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`lt-color ${currentColor === c.id ? 'active' : ''}`}
                  style={{ background: c.hex }}
                  title={c.label}
                  onClick={() => pickColor(c.id)}
                />
              ))}
            </div>
            <div className="lt-flyout-label">Kalınlık</div>
            <div className="lt-row">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`lt-size ${currentSize === s.id ? 'active' : ''}`}
                  title={s.label}
                  onClick={() => pickSize(s.id)}
                >
                  <span style={{ width: s.dot, height: s.dot }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lt-item">
        <button
          type="button"
          className={`lt-btn ${currentToolId === 'geo' ? 'active' : ''}`}
          title="Şekiller"
          onClick={toggleShapesFlyout}
        >
          <ShapesIcon />
        </button>
        {openFlyout === 'shapes' && (
          <div className="lt-flyout">
            <div className="lt-flyout-label">Şekiller</div>
            <div className="lt-shape-grid">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`lt-shape-option ${currentToolId === 'geo' && currentGeo === s.id ? 'active' : ''}`}
                  title={s.label}
                  onClick={() => pickShape(s.id)}
                >
                  <ShapePreviewIcon geo={s.id} />
                </button>
              ))}
            </div>
            <p className="lt-flyout-hint">Tuval üzerinde sürükleyerek istediğin boyutta çiz, tekrar tekrar çizebilirsin.</p>
          </div>
        )}
      </div>

      <button
        type="button"
        className={`lt-btn ${currentToolId === 'eraser' ? 'active' : ''}`}
        title="Silgi (çift tıkla: Tüm Sayfayı Temizle)"
        onClick={chooseEraser}
        onDoubleClick={requestClearPage}
      >
        <EraserIcon />
      </button>

      <div className="lt-item">
        <button
          type="button"
          className={`lt-btn ${openFlyout === 'zemin' ? 'active' : ''}`}
          title="Zemin Seçici"
          onClick={toggleGroundFlyout}
        >
          <GroundIcon />
        </button>
        {openFlyout === 'zemin' && (
          <div className="lt-flyout">
            <div className="lt-flyout-label">Zemin</div>
            {grounds.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`lt-ground-option ${groundMode === g.id ? 'active' : ''}`}
                onClick={() => pickGround(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className={`lt-btn ${uploadLocked ? 'lt-btn-locked' : ''}`}
        title={uploadLocked ? 'Materyal Yükle (izin gerekiyor)' : 'Materyal Yükle (PDF veya görsel)'}
        onClick={clickUpload}
        disabled={uploading}
      >
        <UploadIcon />
        {uploadLocked && (
          <span className="lt-lock-badge">
            <LockIcon />
          </span>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {uploading && <div className="lt-notice">Yükleniyor…</div>}

      {confirmingClear && (
        <div className="lt-modal-backdrop" onClick={() => setConfirmingClear(false)}>
          <div className="lt-modal" onClick={(e) => e.stopPropagation()}>
            <p>Tüm sayfayı temizlemek istediğinize emin misiniz?</p>
            <div className="lt-modal-actions">
              <button type="button" onClick={() => setConfirmingClear(false)}>
                İptal
              </button>
              <button type="button" className="danger" onClick={confirmClearPage}>
                Evet, Temizle
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && <div className="lt-notice">{notice}</div>}
    </div>
  )
}
