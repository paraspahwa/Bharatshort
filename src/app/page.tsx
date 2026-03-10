import { LandingHeader } from './(marketing)/components/landing/LandingHeader'
import { LandingHero } from './(marketing)/components/landing/LandingHero'
import { LandingTrust } from './(marketing)/components/landing/LandingTrust'
import { LandingProof } from './(marketing)/components/landing/LandingProof'
import { LandingFeatures } from './(marketing)/components/landing/LandingFeatures'
import { LandingHowItWorks } from './(marketing)/components/landing/LandingHowItWorks'
import { LandingUseCases } from './(marketing)/components/landing/LandingUseCases'
import { LandingFAQ } from './(marketing)/components/landing/LandingFAQ'
import { LandingCTA } from './(marketing)/components/landing/LandingCTA'
import { LandingFooter } from './(marketing)/components/landing/LandingFooter'
import { LandingInstrumentation } from './(marketing)/components/landing/LandingInstrumentation'

export default function HomePage() {
  return (
    <div className="min-h-screen animated-grid">
        <LandingInstrumentation />
      <LandingHeader />
      <LandingHero />
      <LandingTrust />
        <LandingProof />
      <LandingFeatures />
      <LandingHowItWorks />
        <LandingUseCases />
        <LandingFAQ />
      <LandingCTA />
      <LandingFooter />
    </div>
  )
}
