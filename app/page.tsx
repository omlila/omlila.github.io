import Image from 'next/image';
import { Play, WifiOff, Globe2, Music, BookOpen, Layers, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-200">

      {/* Navbar Placeholder */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-stone-800 backdrop-blur-md bg-stone-950/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Omlila Logo" width={36} height={36} className="rounded-xl overflow-hidden shadow-md shadow-moss-400/20" />
            <span className="text-xl font-bold tracking-tight text-white">Omlila<span className="text-moss-500">.</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#products" className="hover:text-white transition-colors">Products</a>
            <a href="#about" className="hover:text-white transition-colors">The Motivation</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.png"
            alt="Himalayan mountains with digital wave patterns"
            fill
            className="object-cover opacity-60 mix-blend-luminosity"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/30 via-stone-950/60 to-stone-950" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm font-medium text-stone-300">
            <WifiOff className="w-4 h-4 text-moss-400" />
            <span>100% Offline-First AI Processing</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 text-white leading-tight">
            Play the Universe. <br />
            <span className="text-gradient">Offline.</span>
          </h1>

          <p className="text-xl md:text-2xl text-stone-300 max-w-4xl mx-auto mb-12 font-light leading-relaxed">
            Privacy from the cloud. Accessibility for the remote. Reliable AI tools designed to work wherever you are—even if you're trekking the Himalayas or running a classroom on a Raspberry Pi without internet. Availability and Privacy, guaranteed.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <a href="#products" className="w-full sm:w-auto px-8 py-4 bg-stone-100 hover:bg-white text-stone-950 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2">
              Explore our Offline-First Suite
            </a>
            <a href="#about" className="w-full sm:w-auto px-8 py-4 glass hover:bg-stone-800/50 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2">
              <Play className="w-5 h-5" fill="currentColor" /> Watch the Vision
            </a>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-32 relative bg-stone-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">Tools for the <span className="text-gradient-moss">Edge</span>.</h2>
            <p className="text-xl text-stone-400 max-w-2xl">High-performance applications built to run autonomously on cheap edge devices, giving those without fast internet the full power of AI.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Product 1 */}
            <div className="p-10 rounded-3xl bg-stone-900 border border-stone-800 hover:border-slate-700 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Music className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-8 border border-amber-500/20">
                  <Music className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">Omlila AI Jam Band</h3>
                <p className="text-stone-400 text-lg mb-8 leading-relaxed">A completely offline-first workspace. Start a jamming session, select your musicians, and sing any song—our AI band follows your music directly on-device.</p>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-stone-300">
                    <div className="w-2 h-2 rounded-full bg-moss-500" />
                    Autonomous Jam Sessions
                  </li>
                  <li className="flex items-center gap-3 text-stone-300">
                    <div className="w-2 h-2 rounded-full bg-moss-500" />
                    AI Musicians Follow Your Lead
                  </li>
                  <li className="flex items-center gap-3 text-stone-300">
                    <div className="w-2 h-2 rounded-full bg-moss-500" />
                    High-Fidelity Local Playback
                  </li>
                </ul>
                <button className="px-6 py-3 glass rounded-full font-medium hover:bg-stone-800 transition-colors w-full sm:w-auto">
                  Download Beta (2.4 GB)
                </button>
              </div>
            </div>

            {/* Product 2 */}
            <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <BookOpen className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="inline-block px-3 py-1 bg-moss-500/20 border border-moss-500/30 text-moss-400 text-xs font-bold rounded-full mb-6 tracking-wide uppercase">
                  In Development
                </div>
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/20">
                  <Layers className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">Omlila Sikshya</h3>
                <p className="text-stone-400 text-lg mb-8 leading-relaxed">An offline-first AI teacher capable of running autonomously in a local LAN setup. It handles the classroom, interacts with students, and provides consistent quality education based on prepared course plans.</p>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-stone-300">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    Local LAN Classroom Handling
                  </li>
                  <li className="flex items-center gap-3 text-stone-300">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    Autonomous AI Teacher Interaction
                  </li>
                  <li className="flex items-center gap-3 text-stone-300">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    Occasional Synchronized Course Updates
                  </li>
                </ul>
                <button className="px-6 py-3 border border-slate-700 text-stone-400 rounded-full font-medium w-full sm:w-auto cursor-not-allowed">
                  Join Waitlist
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 bg-stone-900 border-t border-stone-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-20 h-20 bg-moss-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-moss-500/20">
            <Globe2 className="w-10 h-10 text-moss-500" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white">The Motivation</h2>
          <p className="text-xl text-stone-300 leading-relaxed font-light mb-8">
            Imagine trekking in a remote Himalayan village, downloading an app when you occasionally hit internet, but utilizing a full ecosystem of knowledge when disconnected. That's the essence of Omlila. We bring AI-powered knowledge directly to the edge, where people in India, Nepal, and remote geographies who can't afford fast internet can still benefit from AI on their phones or cheaper devices like a Raspberry Pi.
          </p>
          <p className="text-xl text-stone-300 leading-relaxed font-light mb-8">
            Rooted in the high altitudes of Nepal, <span className="text-white font-semibold flex inline-flex items-center justify-center gap-2 mx-2">
              <span className="text-moss-400">Om</span> (Universal Vibration) + <span className="text-moss-400">Lila</span> (Divine Play)
            </span> We bridge ancient wisdom with modern edge technology ensuring <span className="text-white font-semibold">Privacy, Accessibility, and Availability</span> for all.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 py-12 border-t border-stone-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-stone-500" />
            <span className="text-stone-400 font-medium">Omlila Labs © 2026</span>
          </div>
          <div className="flex gap-8 text-sm text-stone-400">
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
