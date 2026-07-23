import { createContext, useContext, useState } from 'react'

const GroundModeContext = createContext(null)

export function GroundModeProvider({ children }) {
  const [groundMode, setGroundMode] = useState('white')
  return (
    <GroundModeContext.Provider value={{ groundMode, setGroundMode }}>
      {children}
    </GroundModeContext.Provider>
  )
}

export function useGroundMode() {
  const ctx = useContext(GroundModeContext)
  if (!ctx) throw new Error('useGroundMode must be used within GroundModeProvider')
  return ctx
}
