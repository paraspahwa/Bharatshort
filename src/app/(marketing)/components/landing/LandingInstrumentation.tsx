'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import { AnalyticsDebugPanel } from './AnalyticsDebugPanel'

const sectionTargets = [
  { id: 'proof', event: 'landing_section_view_proof' },
  { id: 'features', event: 'landing_section_view_features' },
  { id: 'how-it-works', event: 'landing_section_view_how_it_works' },
  { id: 'use-cases', event: 'landing_section_view_use_cases' },
  { id: 'faq', event: 'landing_section_view_faq' },
]

export function LandingInstrumentation() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const queryVariant = params.get('variant')?.toLowerCase()
    const variant = queryVariant === 'b' ? 'b' : 'a'

    window.__landingVariant = variant

    const existingSessionId = sessionStorage.getItem('landing_session_id')
    const sessionId = existingSessionId || `ls_${Math.random().toString(36).slice(2, 10)}`

    if (!existingSessionId) {
      sessionStorage.setItem('landing_session_id', sessionId)
    }

    window.__landingSessionId = sessionId

    trackEvent('landing_page_view')

    const seen = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          const section = sectionTargets.find((item) => item.id === entry.target.id)
          if (!section || seen.has(section.id)) {
            return
          }

          seen.add(section.id)
            trackEvent(section.event, { section_id: section.id })
        })
      },
      { threshold: 0.45 }
    )

    sectionTargets.forEach((section) => {
      const node = document.getElementById(section.id)
      if (node) {
        observer.observe(node)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return <AnalyticsDebugPanel />
}