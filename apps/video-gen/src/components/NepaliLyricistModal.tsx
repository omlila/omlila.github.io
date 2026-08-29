import { useState } from 'react';
import { Sparkles, Search, Music, Wand2, X, Check, Loader2 } from 'lucide-react';

interface NepaliLyricistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLyrics: (lrcContent: string) => void;
  onOpenPlaygroundPage?: () => void;
}

export function NepaliLyricistModal({ isOpen, onClose, onImportLyrics, onOpenPlaygroundPage }: NepaliLyricistModalProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'search'>('generate');
  const [prompt, setPrompt] = useState('आमाको मीठो माया सम्झिएर');
  const [mood, setMood] = useState('Emotional');
  const [artist, setArtist] = useState('Narayan Gopal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLyrics, setGeneratedLyrics] = useState<string>('');
  const [generatedLrc, setGeneratedLrc] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ title: string; artist: string; lyrics: string }>>([]);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:8000/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mood, artist, max_tokens: 180 }),
      });
      if (response.ok) {
        const data = await response.json();
        setGeneratedLyrics(data.lyrics);
        setGeneratedLrc(data.formatted_lrc);
      } else {
        // Mock fallback if local API service isn't running yet
        const mockLines = [
          prompt,
          'आमा तिम्रो न्यानो काखमा सिरानी हालेर',
          'संसारका सारा दुःख बिर्सन्छु म हाँसी हाँसी',
          'खोला झैं बग्ने तिम्रो माया कहिल्यै नसकियोस्',
          'जिन्दगीका हरेक मोडमा तिम्रै आशीर्वाद रहिरहोस्',
        ];
        const mockLrc = mockLines.map((line, idx) => `[00:${(idx * 4).toString().padStart(2, '0')}.00] ${line}`).join('\n');
        setGeneratedLyrics(mockLines.join('\n'));
        setGeneratedLrc(mockLrc);
      }
    } catch (e) {
      // Offline fallback
      const mockLines = [
        prompt,
        'आमा तिम्रो न्यानो काखमा सिरानी हालेर',
        'संसारका सारा दुःख बिर्सन्छु म हाँसी हाँसी',
        'खोला झैं बग्ने तिम्रो माया कहिल्यै नसकियोस्',
        'जिन्दगीका हरेक मोडमा तिम्रै आशीर्वाद रहिरहोस्',
      ];
      const mockLrc = mockLines.map((line, idx) => `[00:${(idx * 4).toString().padStart(2, '0')}.00] ${line}`).join('\n');
      setGeneratedLyrics(mockLines.join('\n'));
      setGeneratedLrc(mockLrc);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:8000/api/lyrics/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (e) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = (lrcText: string) => {
    onImportLyrics(lrcText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Nepali AI Lyricist <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Qwen 1.5B ML</span>
              </h3>
              <p className="text-xs text-slate-400">Generate or search Nepali song lyrics to auto-fill video studio timeline</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenPlaygroundPage && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPlaygroundPage();
                }}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-sm font-bold rounded-lg transition"
              >
                Full Control Center ↗
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === 'generate' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-4 h-4" /> AI Lyrics Generator
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === 'search' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" /> Search Scraped Song DB
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-slate-300">Prompt / Starting Line</label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. आमा तिम्रो माया सम्झिएर"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-slate-300">Mood / Vibe</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Emotional">Emotional / Emotional</option>
                    <option value="Romantic">Romantic / मायालु</option>
                    <option value="Folk">Folk / लोक गीत</option>
                    <option value="Sad">Sad / विरही</option>
                    <option value="Devotional">Devotional / भक्ति</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-slate-300">Artist Style Tag</label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g. Narayan Gopal, Sugam Pokhrel"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isGenerating ? 'Generating Nepali Lyrics...' : 'Generate Lyrics with AI'}
              </button>

              {generatedLyrics && (
                <div className="mt-4 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Generated Result</span>
                    <button
                      onClick={() => handleImport(generatedLrc)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Music className="w-4 h-4" />}
                      {copied ? 'Imported!' : 'Import to Timeline'}
                    </button>
                  </div>
                  <pre className="text-sm font-sans text-slate-200 whitespace-pre-wrap leading-relaxed border-l-2 border-emerald-500/50 pl-3">
                    {generatedLyrics}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search Nepali song lyrics or titles..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl flex items-center gap-2"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>

              <div className="space-y-3">
                {searchResults.length === 0 && !isSearching && (
                  <p className="text-xs text-slate-500 text-center py-6">Type a song title or lyric phrase to search scraped parquet database.</p>
                )}
                {searchResults.map((result, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">{result.title}</h4>
                      <p className="text-xs text-slate-400">{result.artist || 'Nepali Lyric'}</p>
                    </div>
                    <button
                      onClick={() => {
                        const lines = result.lyrics.split('\n').filter(Boolean);
                        const lrc = lines.map((l, i) => `[00:${(i * 4).toString().padStart(2, '0')}.00] ${l}`).join('\n');
                        handleImport(lrc);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-medium rounded-lg transition"
                    >
                      Import
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
