'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-100 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 py-4 px-[5%]' : 'py-6 px-[5%]'}`}>
      <nav className="flex justify-between items-center max-w-[1200px] mx-auto">
        <Link href="/" className="font-heading text-2xl font-bold no-underline text-white tracking-tight">
          Sanjeev.
        </Link>
        <ul className="hidden md:flex gap-10 list-none">
          <li>
            <Link href="/#about" className="text-[#a1a1aa] font-medium transition-colors hover:text-white relative group">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#00f2fe] to-[#4facfe] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </li>
          <li>
            <Link href="/#projects" className="text-[#a1a1aa] font-medium transition-colors hover:text-white relative group">
              Work
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#00f2fe] to-[#4facfe] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </li>
          <li>
            <Link href="/vlogs" className="text-[#a1a1aa] font-medium transition-colors hover:text-white relative group">
              Vlogs
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#00f2fe] to-[#4facfe] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </li>
          <li>
            <Link href="/#contact" className="text-[#a1a1aa] font-medium transition-colors hover:text-white relative group">
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#00f2fe] to-[#4facfe] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
