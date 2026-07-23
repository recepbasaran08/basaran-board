import { createContext, useContext, useState } from 'react'

const MaterialContext = createContext(null)

export function MaterialProvider({ children }) {
  const [pages, setPages] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [label, setLabel] = useState('')

  function loadPages(newPages, newLabel) {
    setPages(newPages)
    setCurrentIndex(0)
    setLabel(newLabel)
  }

  function goTo(index) {
    setCurrentIndex(Math.min(Math.max(index, 0), Math.max(pages.length - 1, 0)))
  }

  return (
    <MaterialContext.Provider value={{ pages, currentIndex, label, loadPages, goTo }}>
      {children}
    </MaterialContext.Provider>
  )
}

export function useMaterial() {
  const ctx = useContext(MaterialContext)
  if (!ctx) throw new Error('useMaterial must be used within MaterialProvider')
  return ctx
}
