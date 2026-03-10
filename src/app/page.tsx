import { LandingHeader } from './(marketing)/components/landing/LandingHeader'
import { LandingHero } from './(marketing)/components/landing/LandingHero'
import { LandingTrust } from './(marketing)/components/landing/LandingTrust'
import { LandingProof } from './(marketing)/components/landing/LandingProof'
import { LandingFeatures } from './(marketing)/components/landing/LandingFeatures'
import { LandingHowItWorks } from './(marketing)/components/landing/LandingHowItWorks'
import { LandingCTA } from './(marketing)/components/landing/LandingCTA'
import { LandingFooter } from './(marketing)/components/landing/LandingFooter'

export default function HomePage() {
  return (
    <div className="min-h-screen animated-grid">
      <LandingHeader />
      <LandingHero />
      <LandingTrust />
        <LandingProof />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingCTA />
      <LandingFooter />
    </div>
  )
}
