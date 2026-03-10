export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
    gtag?: (...args: unknown[]) => void
    __landingVariant?: string
    __landingSessionId?: string
  }
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (typeof window === 'undefined') {
    return
  }

  const contextParams: AnalyticsParams = {
    landing_variant: window.__landingVariant,
    landing_session_id: window.__landingSessionId,
    page_path: window.location.pathname,
  }

  const mergedParams = {
    ...contextParams,
    ...params,
  }

  window.dispatchEvent(
    new CustomEvent('__analytics_event__', {
      detail: {
        eventName,
        params: mergedParams,
        timestamp: Date.now(),
      },
    })
  )

  const payload = {
    event: eventName,
    ...mergedParams,
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, mergedParams)
    return
  }

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(payload)
}