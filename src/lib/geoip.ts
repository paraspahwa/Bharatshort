import type { NextRequest } from 'next/server'

export interface GeoLocation {
  ip: string | null
  countryCode: string
  currency: string
  source: 'vercel-header' | 'lookup' | 'fallback'
}

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  SG: 'SGD',
  AU: 'AUD',
  CA: 'CAD',
  EU: 'EUR',
}

export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    null
  )
}

function countryToCurrency(countryCode: string): string {
  return COUNTRY_TO_CURRENCY[countryCode] || 'USD'
}

export async function resolveGeoLocation(request: NextRequest): Promise<GeoLocation> {
  const vercelCountry = request.headers.get('x-vercel-ip-country')?.toUpperCase()
  const ip = getClientIp(request)

  if (vercelCountry) {
    return {
      ip,
      countryCode: vercelCountry,
      currency: countryToCurrency(vercelCountry),
      source: 'vercel-header',
    }
  }

  if (!ip) {
    return {
      ip: null,
      countryCode: 'US',
      currency: 'USD',
      source: 'fallback',
    }
  }

  const lookupTemplate = process.env.GEOIP_LOOKUP_URL || 'https://ipapi.co/{ip}/json/'
  const lookupUrl = lookupTemplate.replace('{ip}', encodeURIComponent(ip))

  try {
    const response = await fetch(lookupUrl, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Geo lookup failed with status ${response.status}`)
    }

    const payload = await response.json()
    const countryCode = String(payload.country_code || payload.country || 'US').toUpperCase()

    return {
      ip,
      countryCode,
      currency: countryToCurrency(countryCode),
      source: 'lookup',
    }
  } catch {
    return {
      ip,
      countryCode: 'US',
      currency: 'USD',
      source: 'fallback',
    }
  }
}
