'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'

type FaqItem = {
  id: string
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    id: 'credits_usage',
    question: 'How do credits work for video generation?',
    answer:
      'Credits are consumed per generation workflow. You can track usage and remaining balance from your dashboard before running more exports.',
  },
  {
    id: 'content_ownership',
    question: 'Do I own the videos generated?',
    answer:
      'Yes. Generated outputs are associated with your account and can be downloaded and published to your channels.',
  },
  {
    id: 'turnaround_time',
    question: 'How long does one short video take to generate?',
    answer:
      'Most first drafts are ready within minutes, depending on queue load, model provider latency, and media complexity.',
  },
  {
    id: 'localization',
    question: 'Can I create videos in multiple languages?',
    answer:
      'Yes. The workflow supports multilingual voice and caption-ready outputs so teams can localize content faster.',
  },
]

export function LandingFAQ() {
  const [openId, setOpenId] = useState<string | null>(faqItems[0]?.id || null)

  const handleToggle = (id: string, isOpening: boolean) => {
    if (isOpening) {
      trackEvent('landing_faq_expand', { faq_id: id })
    }
    setOpenId(isOpening ? id : null)
  }

  return (
    <section id="faq" className="container mx-auto px-4 py-14 md:py-18 lg:py-20">
      <p className="mb-3 text-center text-xs uppercase tracking-[0.18em] text-slate-400">FAQ</p>
      <h2 className="mb-10 text-center font-[var(--font-display)] text-3xl font-bold text-white sm:text-4xl md:mb-12">
        Answers Before You Start
      </h2>

      <div className="mx-auto max-w-4xl space-y-4">
        {faqItems.map((item, idx) => {
          const isOpen = openId === item.id
          return (
            <article
              key={item.id}
              className="glass-card animate-rise-in rounded-2xl"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <button
                type="button"
                onClick={() => handleToggle(item.id, !isOpen)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left md:px-6"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${item.id}`}
              >
                <span className="text-sm font-semibold text-slate-100 sm:text-base">{item.question}</span>
                <span className="text-xl text-orange-300">{isOpen ? '-' : '+'}</span>
              </button>

              {isOpen ? (
                <div id={`faq-panel-${item.id}`} className="border-t border-white/10 px-5 py-4 text-sm text-slate-300 md:px-6 md:text-base">
                  {item.answer}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
