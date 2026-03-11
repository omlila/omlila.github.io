'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  useEffect(() => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));
  }, []);

  return (
    <>
      <section className="hero min-h-screen flex items-center justify-center px-[5%] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#00f2fe]/20 to-[#4facfe]/20 blur-[100px] rounded-full z-0 animate-[pulse_8s_infinite_alternate_ease-in-out]"></div>
          <div className="relative z-10 text-center max-w-[800px]">
              <div className="reveal inline-block px-4 py-2 bg-[#141414]/60 border border-white/10 rounded-full text-sm text-[#a1a1aa] mb-8 backdrop-blur-md">Status: Building the future 🚀</div>
              <h1 className="reveal text-[clamp(3rem,6vw,5rem)] font-extrabold mb-6 tracking-tight text-white font-heading" style={{ transitionDelay: '100ms' }}>
                  Hi, I'm Sanjeev.<br/>
                  <span className="text-gradient">Software & AI Engineer</span>
              </h1>
              <p className="reveal text-[clamp(1.1rem,2vw,1.25rem)] text-[#a1a1aa] mb-12 max-w-[600px] mx-auto" style={{ transitionDelay: '200ms' }}>
                  I specialize in designing and developing state-of-the-art software systems. 
                  From scalable backend architectures to intelligent AI integrations, I bring ideas to reality.
              </p>
              <div className="reveal flex justify-center gap-6 max-md:flex-col" style={{ transitionDelay: '300ms' }}>
                  <Link href="#projects" className="btn btn-primary">View My Work</Link>
                  <Link href="/vlogs" className="btn btn-secondary">Watch My Vlogs</Link>
              </div>
          </div>
      </section>

      <section id="about" className="reveal py-32 px-[5%] max-w-[1200px] mx-auto">
          <h2 className="section-title text-white">About Me</h2>
          <div className="glass-card">
              <p className="text-lg text-[#a1a1aa] text-center max-w-[800px] mx-auto">
                  I'm a passionate engineer currently based in the USA. I love solving complex problems using modern technology stacks. My background spans full-stack development, artificial intelligence, and cloud infrastructure. When I'm not coding, I'm usually documenting my journey through my vlogs.
              </p>
          </div>
      </section>

      <section id="projects" className="py-32 px-[5%] max-w-[1200px] mx-auto">
          <h2 className="section-title reveal text-white">Featured Projects</h2>
          <div className="projects-grid">
              
              <div className="glass-card project-card reveal">
                  <div className="project-image"></div>
                  <div className="project-content">
                      <div className="project-tags">
                          <span className="tag">AI</span>
                          <span className="tag">Python</span>
                      </div>
                      <h3 className="text-2xl mb-3 font-heading text-white">Onyx AI Platform</h3>
                      <p className="text-[#a1a1aa] text-[0.95rem] mb-6 flex-1">A sophisticated AI platform running locally to process complex agentic workflows with seamless UI integration.</p>
                      <a href="https://github.com/omlila" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white font-medium text-sm transition-colors hover:text-[#00f2fe]">
                          View on GitHub 
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </a>
                  </div>
              </div>

              <div className="glass-card project-card reveal" style={{ transitionDelay: '100ms' }}>
                  <div className="project-image"></div>
                  <div className="project-content">
                      <div className="project-tags">
                          <span className="tag">Swift</span>
                          <span className="tag">CoreML</span>
                      </div>
                      <h3 className="text-2xl mb-3 font-heading text-white">AI Jam Band</h3>
                      <p className="text-[#a1a1aa] text-[0.95rem] mb-6 flex-1">An interactive iOS application under Omlila Labs allowing users to create music interactively using CoreML.</p>
                      <a href="https://github.com/omlila" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white font-medium text-sm transition-colors hover:text-[#00f2fe]">
                          View on GitHub 
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </a>
                  </div>
              </div>

              <div className="glass-card project-card reveal" style={{ transitionDelay: '200ms' }}>
                  <div className="project-image"></div>
                  <div className="project-content">
                      <div className="project-tags">
                          <span className="tag">Automation</span>
                          <span className="tag">Finance</span>
                      </div>
                      <h3 className="text-2xl mb-3 font-heading text-white">Portfolio Automation</h3>
                      <p className="text-[#a1a1aa] text-[0.95rem] mb-6 flex-1">A scheduled autonomous agent tracking stock portfolios and providing AI-driven buy/sell recommendations.</p>
                      <a href="https://github.com/omlila" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white font-medium text-sm transition-colors hover:text-[#00f2fe]">
                          View on GitHub 
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </a>
                  </div>
              </div>

          </div>
      </section>
      
      <section id="contact" className="reveal py-32 px-[5%] max-w-[1200px] mx-auto">
          <h2 className="section-title text-white">Get In Touch</h2>
          <div className="glass-card text-center">
              <h3 className="mb-4 text-3xl font-heading text-white">Let's build something amazing together.</h3>
              <p className="text-[#a1a1aa] mb-8">I'm always open to discussing new projects, creative ideas or opportunities to be part of your visions.</p>
              <a href="mailto:hello@example.com" className="btn btn-primary">Say Hello</a>
          </div>
      </section>
    </>
  );
}
