import { Tldraw, inlineBase64AssetStore } from 'tldraw'
import { useSync } from '@tldraw/sync'
import 'tldraw/tldraw.css'
import './Whiteboard.css'
import { LeftToolbar } from './LeftToolbar'
import { TopBar } from './TopBar'
import { GroundGrid } from './GroundGrid'
import { MaterialLayer } from './MaterialLayer'
import { GroundModeProvider } from '../context/GroundModeContext'
import { MaterialProvider } from '../context/MaterialContext'
import { SYNC_SERVER_URL } from '../lib/syncConfig'

const components = { Grid: GroundGrid }

export function Whiteboard({ roomId, restricted = false, roomStatus, studentLink, onEndLesson }) {
  const store = useSync({
    uri: `${SYNC_SERVER_URL}/connect/${roomId}`,
    assets: inlineBase64AssetStore,
  })

  if (store.status === 'loading') {
    return (
      <div className="wb-status-screen">
        <p>Derse bağlanılıyor…</p>
      </div>
    )
  }

  if (store.status === 'error') {
    return (
      <div className="wb-status-screen">
        <p>Bağlantı kurulamadı. Senkron sunucusunun çalıştığından emin ol.</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <GroundModeProvider>
        <MaterialProvider>
          <Tldraw
            hideUi
            components={components}
            store={store.store}
            onMount={(editor) => {
              // Materyal üzerinde rahat yakınlaştırma için geniş bir zoom aralığı.
              editor.setCameraOptions({ zoomSteps: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8, 16] })
            }}
          >
            <LeftToolbar restricted={restricted} />
            <TopBar roomStatus={roomStatus} studentLink={studentLink} onEndLesson={onEndLesson} />
            <MaterialLayer />
          </Tldraw>
        </MaterialProvider>
      </GroundModeProvider>
    </div>
  )
}
