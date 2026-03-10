'use client'

import { useEffect, useMemo, useState } from 'react'

type DebugEvent = {
  eventName: string
  params: Record<string, unknown>
  timestamp: number
}

export function AnalyticsDebugPanel() {
  const [events, setEvents] = useState<DebugEvent[]>([])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const handler = (event: Event) => {
      const custom = event as CustomEvent<DebugEvent>
      if (!custom.detail?.eventName) {
        return
      }

      setEvents((prev) => [custom.detail, ...prev].slice(0, 12))
    }

    window.addEventListener('__analytics_event__', handler)
    return () => {
      window.removeEventListener('__analytics_event__', handler)
    }
  }, [])

  const visible = useMemo(() => process.env.NODE_ENV === 'development', [])
  if (!visible) {
    return null
  }

  return (
    <aside className="fixed bottom-3 right-3 z-[70] w-[320px] max-w-[92vw] rounded-xl border border-white/20 bg-[#0a0e18]/90 p-3 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-slate-100">Analytics Debug</p>
        <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] text-teal-200">dev only</span>
      </div>

      {events.length === 0 ? (
        <p className="text-slate-400">No events yet. Interact with landing CTAs.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-auto pr-1">
          {events.map((item, idx) => (
            <li key={`${item.eventName}-${item.timestamp}-${idx}`} className="rounded-lg border border-white/10 bg-white/5 p-2">
              <p className="font-semibold text-orange-200">{item.eventName}</p>
              <p className="mt-1 text-[11px] text-slate-300">{JSON.stringify(item.params)}</p>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}