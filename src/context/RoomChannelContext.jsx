import { createContext, useContext, useEffect, useState } from 'react'
import { createRoomChannel } from '../lib/roomChannel'

const RoomChannelContext = createContext(null)

export function RoomChannelProvider({ roomId, children }) {
  const [channel] = useState(() => createRoomChannel(roomId))

  useEffect(() => () => channel.close(), [channel])

  return <RoomChannelContext.Provider value={channel}>{children}</RoomChannelContext.Provider>
}

export function useRoomChannel() {
  const ctx = useContext(RoomChannelContext)
  if (!ctx) throw new Error('useRoomChannel must be used within RoomChannelProvider')
  return ctx
}
