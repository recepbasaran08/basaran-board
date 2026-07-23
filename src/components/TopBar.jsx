import { useState } from 'react'
import { useMaterial } from '../context/MaterialContext'
import { useGroundMode } from '../context/GroundModeContext'
import './TopBar.css'

export function TopBar({ roomStatus, studentLink, onEndLesson }) {
  const { pages, currentIndex, goTo } = useMaterial()
  const { groundMode } = useGroundMode()
  const [copied, setCopied] = useState(false)

  const showPager = groundMode === 'material' && pages.length > 1

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        // navigator.clipboard yalnızca güvenli bağlamda (HTTPS/localhost) var.
        // LAN üzerinden düz HTTP ile açılan öğretmen odasında bu yol mevcut değildir.
        await navigator.clipboard.writeText(studentLink)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = studentLink
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Linki kopyala:', studentLink)
    }
  }

  return (
    <div className="top-bar">
      <div className="tb-left">
        <span className="tb-logo">BaşaranBoard</span>
        {roomStatus && <span className="tb-room-status">{roomStatus}</span>}
      </div>
      <div className="tb-right">
        {studentLink && (
          <div className="tb-link-box">
            <span>Öğrenci Linki</span>
            <button type="button" onClick={copyLink}>
              {copied ? 'Kopyalandı!' : 'Kopyala'}
            </button>
          </div>
        )}
        {showPager && (
          <div className="tb-pager">
            <button type="button" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
              ‹
            </button>
            <span>
              Sayfa {String(currentIndex + 1).padStart(2, '0')}/{String(pages.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex === pages.length - 1}
            >
              ›
            </button>
          </div>
        )}
        {onEndLesson && (
          <button type="button" className="tb-end-btn" onClick={onEndLesson}>
            Dersi Sonlandır
          </button>
        )}
      </div>
    </div>
  )
}
