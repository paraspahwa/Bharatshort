import Link from 'next/link'
import { Video, Sparkles, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Video className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900">BharatShort AI</span>
          </div>
          <nav className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-gray-700 hover:text-orange-600 transition">
              Login
            </Link>
            <Link href="/signup" className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Video Creation</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Create Stunning Short Videos
            <span className="text-orange-600"> with AI</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Generate professional YouTube Shorts, Instagram Reels, and TikTok videos automatically. 
            Just provide a topic, and let AI do the rest.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link href="/signup" className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Start Creating Free
            </Link>
            <Link href="#features" className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-orange-600 hover:text-orange-600 transition text-lg font-semibold">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Everything You Need in One Platform
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: 'AI Script Generation',
              description: 'Get engaging scripts written automatically by AI based on your topic',
              icon: '📝',
            },
            {
              title: 'AI Image & Video',
              description: 'Generate stunning visuals and video clips with state-of-the-art AI',
              icon: '🎨',
            },
            {
              title: 'AI Voice Narration',
              description: 'Natural-sounding voiceovers in multiple languages including Hindi',
              icon: '🎙️',
            },
            {
              title: 'Auto Captions',
              description: 'Automatic subtitle generation for better engagement and accessibility',
              icon: '💬',
            },
            {
              title: 'One-Click Export',
              description: 'Download your final video ready to publish on any platform',
              icon: '⬇️',
            },
            {
              title: 'Credit System',
              description: 'Flexible pay-per-use model. Only pay for what you create',
              icon: '💳',
            },
          ].map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="max-w-4xl mx-auto space-y-8">
            {[
              { step: '1', title: 'Enter Your Topic', description: 'Tell us what video you want to create' },
              { step: '2', title: 'AI Generates Everything', description: 'Script, images, video clips, and voiceover created automatically' },
              { step: '3', title: 'Review & Customize', description: 'Preview your video and make any adjustments' },
              { step: '4', title: 'Download & Share', description: 'Export your video and publish to social media' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-orange-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Create Amazing Videos?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of content creators already using BharatShort AI
          </p>
          <Link href="/signup" className="inline-block px-8 py-4 bg-white text-orange-600 rounded-lg hover:bg-gray-100 transition text-lg font-semibold">
            Get Started Now - Free Credits
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2026 BharatShort AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
