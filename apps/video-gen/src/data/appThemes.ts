import type { AppWorkspaceTheme } from '../types';

export interface WorkspaceThemeDefinition {
  id: AppWorkspaceTheme;
  name: string;
  badge: string;
  bgClass: string;
  panelClass: string;
  headerClass: string;
  accentGradient: string;
  accentText: string;
  accentBorder: string;
  glowClass: string;
}

export const WORKSPACE_THEMES: WorkspaceThemeDefinition[] = [
  {
    id: 'forest-green',
    name: 'Forest Green Dark',
    badge: 'Forest Mint',
    bgClass: 'bg-[#051c14]',
    panelClass: 'bg-[#0a291e]/85 backdrop-blur-xl border-emerald-500/30 text-emerald-50',
    headerClass: 'bg-[#03140d]/95 border-emerald-500/30',
    accentGradient: 'from-emerald-600 via-green-500 to-teal-400',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-400/50',
    glowClass: 'glow-emerald',
  },
  {
    id: 'studio-dark',
    name: 'Studio Dark Pro',
    badge: 'Pro Dark',
    bgClass: 'bg-[#09090b]',
    panelClass: 'bg-[#121216]/80 backdrop-blur-xl border-white/10 text-zinc-100',
    headerClass: 'bg-[#0f0f13]/90 border-white/10',
    accentGradient: 'from-purple-600 via-pink-600 to-amber-500',
    accentText: 'text-purple-400',
    accentBorder: 'border-purple-500/40',
    glowClass: 'glow-purple',
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    badge: 'Neon 2077',
    bgClass: 'bg-[#030712]',
    panelClass: 'bg-[#0b132b]/85 backdrop-blur-xl border-cyan-500/30 text-cyan-50',
    headerClass: 'bg-[#050b1a]/95 border-cyan-500/30',
    accentGradient: 'from-cyan-500 via-teal-400 to-fuchsia-500',
    accentText: 'text-cyan-400',
    accentBorder: 'border-cyan-400/50',
    glowClass: 'glow-cyan',
  },
  {
    id: 'midnight-oled',
    name: 'Midnight OLED',
    badge: 'Pure Black',
    bgClass: 'bg-black',
    panelClass: 'bg-zinc-950 border-zinc-800 text-zinc-100',
    headerClass: 'bg-black border-zinc-800',
    accentGradient: 'from-blue-600 via-indigo-600 to-sky-400',
    accentText: 'text-blue-400',
    accentBorder: 'border-blue-500/40',
    glowClass: 'glow-blue',
  },
  {
    id: 'synthwave-sunset',
    name: 'Synthwave Sunset',
    badge: 'Retro 80s',
    bgClass: 'bg-[#0f0728]',
    panelClass: 'bg-[#1a0c3b]/85 backdrop-blur-xl border-pink-500/30 text-pink-50',
    headerClass: 'bg-[#140830]/95 border-pink-500/30',
    accentGradient: 'from-fuchsia-600 via-pink-500 to-amber-400',
    accentText: 'text-pink-400',
    accentBorder: 'border-pink-500/50',
    glowClass: 'glow-pink',
  },
  {
    id: 'nordic-slate',
    name: 'Nordic Slate',
    badge: 'Emerald Slate',
    bgClass: 'bg-[#0f172a]',
    panelClass: 'bg-[#1e293b]/85 backdrop-blur-xl border-emerald-500/25 text-slate-100',
    headerClass: 'bg-[#0f172a]/95 border-emerald-500/25',
    accentGradient: 'from-emerald-500 via-teal-400 to-cyan-500',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500/40',
    glowClass: 'glow-emerald',
  },
  {
    id: 'dracula-studio',
    name: 'Dracula Studio',
    badge: 'Vampire Dark',
    bgClass: 'bg-[#1e1e2e]',
    panelClass: 'bg-[#2b2b3d]/90 backdrop-blur-xl border-purple-400/30 text-purple-100',
    headerClass: 'bg-[#181825]/95 border-purple-400/30',
    accentGradient: 'from-purple-500 via-pink-400 to-indigo-400',
    accentText: 'text-purple-300',
    accentBorder: 'border-purple-400/50',
    glowClass: 'glow-purple',
  },
];
