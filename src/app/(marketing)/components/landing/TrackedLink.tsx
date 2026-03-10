'use client'

import Link, { type LinkProps } from 'next/link'
import type { ReactNode, MouseEvent } from 'react'
import { trackEvent, type AnalyticsParams } from '@/lib/analytics'

type TrackedLinkProps = LinkProps & {
  className?: string
  children: ReactNode
  eventName: string
  eventParams?: AnalyticsParams
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

export function TrackedLink({
  eventName,
  eventParams,
  onClick,
  children,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackEvent(eventName, eventParams)
        onClick?.(event)
      }}
    >
      {children}
    </Link>
  )
}