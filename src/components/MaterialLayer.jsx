import { useEffect, useRef } from 'react'
import { AssetRecordType, createShapeId, useEditor } from 'tldraw'
import { useMaterial } from '../context/MaterialContext'
import { useGroundMode } from '../context/GroundModeContext'

const MATERIAL_SHAPE_ID = createShapeId('basaranboard-material')

export function MaterialLayer() {
  const editor = useEditor()
  const { pages, currentIndex } = useMaterial()
  const { groundMode } = useGroundMode()
  const prevAssetIdRef = useRef(null)

  useEffect(() => {
    const page = groundMode === 'material' ? pages[currentIndex] : null

    const existingShape = editor.getShape(MATERIAL_SHAPE_ID)
    if (existingShape) {
      editor.updateShape({ id: MATERIAL_SHAPE_ID, type: 'image', isLocked: false })
      editor.deleteShape(MATERIAL_SHAPE_ID)
    }
    if (prevAssetIdRef.current) {
      editor.deleteAssets([prevAssetIdRef.current])
      prevAssetIdRef.current = null
    }

    if (!page) return

    const viewport = editor.getViewportPageBounds()
    const maxW = viewport.w * 0.85
    const maxH = viewport.h * 0.85
    const ratio = Math.min(maxW / page.width, maxH / page.height, 1)
    const w = page.width * ratio
    const h = page.height * ratio
    const x = viewport.x + (viewport.w - w) / 2
    const y = viewport.y + (viewport.h - h) / 2

    const assetId = AssetRecordType.createId()
    editor.createAssets([
      {
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          w: page.width,
          h: page.height,
          name: 'material',
          isAnimated: false,
          mimeType: 'image/png',
          src: page.dataUrl,
        },
        meta: {},
      },
    ])

    editor.createShape({
      id: MATERIAL_SHAPE_ID,
      type: 'image',
      x,
      y,
      isLocked: true,
      props: { w, h, assetId, url: '' },
    })
    editor.sendToBack([MATERIAL_SHAPE_ID])
    prevAssetIdRef.current = assetId
  }, [editor, pages, currentIndex, groundMode])

  useEffect(
    () => () => {
      if (editor.getShape(MATERIAL_SHAPE_ID)) {
        editor.updateShape({ id: MATERIAL_SHAPE_ID, type: 'image', isLocked: false })
        editor.deleteShape(MATERIAL_SHAPE_ID)
      }
      if (prevAssetIdRef.current) editor.deleteAssets([prevAssetIdRef.current])
    },
    [editor]
  )

  return null
}
