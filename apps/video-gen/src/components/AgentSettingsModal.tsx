import { useState, useEffect } from 'react';
import { Key, Shield, Check, X, Loader2, Cpu, Globe, Save, RefreshCw, Plus, Trash2, ChevronLeft, Power } from 'lucide-react';

interface AgentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Provider {
  id: string;
  name: string;
  type: 'deepseek' | 'ollama' | 'openrouter' | 'custom';
  isDefault: boolean;
  apiKey?: string;
  apiBase?: string;
  model?: string;
}

export function AgentSettingsModal({ isOpen, onClose }: AgentSettingsModalProps) {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  const [formData, setFormData] = useState<Partial<Provider>>({});
  
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  const loadProviders = async () => {
    let loadedProviders: Provider[] = [];
    
    const defaults: Provider[] = [
      { id: 'deepseek', name: 'Primary Agent (OpenAI/DeepSeek)', type: 'deepseek', isDefault: true, apiBase: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKey: '' },
      { id: 'ollama', name: 'Ollama Local Host', type: 'ollama', isDefault: true, apiBase: 'http://localhost:11434/api/generate', model: 'gemma4:e4b' },
      { id: 'openrouter', name: 'OpenRouter Universal', type: 'openrouter', isDefault: true, apiKey: '' }
    ];

    try {
      const res = await fetch('http://localhost:8000/api/config/settings');
      if (res.ok) {
        const data = await res.json();
        defaults[0].apiBase = data.deepseek_api_base || defaults[0].apiBase;
        defaults[0].model = data.deepseek_model || defaults[0].model;
        if (data.deepseek_api_key_set) defaults[0].apiKey = '••••••••';

        defaults[1].apiBase = data.ollama_url || defaults[1].apiBase;
        defaults[1].model = data.ollama_model || defaults[1].model;

        if (data.openrouter_api_key_set) defaults[2].apiKey = '••••••••';
      }
    } catch (e) {}

    loadedProviders = [...defaults];

    const custom = localStorage.getItem('custom_providers');
    if (custom) {
      try {
        const parsed = JSON.parse(custom);
        loadedProviders = [...loadedProviders, ...parsed];
      } catch (e) {}
    }

    setProviders(loadedProviders);
    setView('list');
  };

  const handleAddNew = () => {
    const newProv: Provider = {
      id: `custom_${Date.now()}`,
      name: 'New Custom Provider',
      type: 'custom',
      isDefault: false,
      apiBase: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      apiKey: ''
    };
    setActiveProvider(newProv);
    setFormData(newProv);
    setView('edit');
    setTestStatus('');
  };

  const handleEdit = (p: Provider) => {
    setActiveProvider(p);
    setFormData({ ...p });
    setView('edit');
    setTestStatus('');
  };

  const handleDelete = (id: string) => {
    const updated = providers.filter(p => p.id !== id || p.isDefault);
    setProviders(updated);
    
    const customOnly = updated.filter(p => !p.isDefault);
    localStorage.setItem('custom_providers', JSON.stringify(customOnly));
    
    setView('list');
  };

  const handleActivate = async (p: Provider) => {
    if (p.isDefault) return; // Only custom providers need "activation" to override Primary Agent
    setActivatingId(p.id);
    
    try {
      const payload = {
        deepseek_api_base: p.apiBase,
        deepseek_model: p.model,
        deepseek_api_key: p.apiKey !== '••••••••' ? p.apiKey : undefined,
      };

      const res = await fetch('http://localhost:8000/api/config/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadProviders(); // Reload from server to show it as Primary Agent settings
      }
    } catch (e) {} finally {
      setActivatingId(null);
    }
  };

  const handleTestKey = async () => {
    if (!activeProvider) return;
    setIsTesting(true);
    setTestStatus('Testing connection...');
    
    try {
      let body: any = {};
      
      if (activeProvider.type === 'ollama') {
        body = { provider: 'ollama', api_base: formData.apiBase };
      } else {
        body = { 
          provider: 'deepseek', 
          api_key: formData.apiKey === '••••••••' ? '' : formData.apiKey, 
          api_base: formData.apiBase 
        };
      }

      const res = await fetch('http://localhost:8000/api/config/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setTestStatus(data.message || (data.connected ? '🟢 Verified' : '🔴 Failed'));
      } else {
        setTestStatus('🔴 HTTP Error');
      }
    } catch (e) {
      setTestStatus('🔴 Network Error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!activeProvider) return;
    setIsSaving(true);
    
    try {
      if (activeProvider.isDefault) {
        const payload: any = {};
        if (activeProvider.type === 'deepseek') {
          payload.deepseek_api_base = formData.apiBase;
          payload.deepseek_model = formData.model;
          if (formData.apiKey && formData.apiKey !== '••••••••') payload.deepseek_api_key = formData.apiKey;
        } else if (activeProvider.type === 'ollama') {
          payload.ollama_url = formData.apiBase;
          payload.ollama_model = formData.model;
        } else if (activeProvider.type === 'openrouter') {
          if (formData.apiKey && formData.apiKey !== '••••••••') payload.openrouter_api_key = formData.apiKey;
        }

        await fetch('http://localhost:8000/api/config/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const customProviders = providers.filter(p => !p.isDefault && p.id !== activeProvider.id);
        const updatedCustom = [...customProviders, { ...activeProvider, ...formData } as Provider];
        localStorage.setItem('custom_providers', JSON.stringify(updatedCustom));
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        loadProviders();
        setView('list');
      }, 1000);
    } catch (e) {
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (type: string) => {
    if (type === 'deepseek') return <Cpu className="w-4 h-4" />;
    if (type === 'ollama') return <Globe className="w-4 h-4" />;
    if (type === 'openrouter') return <Shield className="w-4 h-4" />;
    return <Key className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            {view === 'edit' && (
              <button onClick={() => setView('list')} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {view === 'list' ? 'Agent Providers' : 'Edit Provider'}
              </h3>
              <p className="text-xs text-slate-400">Manage LLM configurations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {view === 'list' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-300 uppercase tracking-wider">Available Providers</span>
                <button onClick={handleAddNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition font-bold">
                  <Plus className="w-3.5 h-3.5" /> Add New
                </button>
              </div>

              <div className="space-y-2">
                {providers.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-xl hover:border-emerald-500/40 transition">
                    <div className="flex items-center gap-3">
                      <div className="text-slate-400">{getIcon(p.type)}</div>
                      <div>
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                          {p.name}
                          {p.isDefault && <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] rounded-md text-slate-400">Default</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.apiBase || 'No URL configured'}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!p.isDefault && (
                        <button 
                          onClick={() => handleActivate(p)} 
                          disabled={activatingId === p.id}
                          title="Set as Primary Agent globally"
                          className="px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg font-bold transition flex items-center gap-1"
                        >
                          {activatingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button onClick={() => handleEdit(p)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition">
                        Edit
                      </button>
                      {!p.isDefault && (
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'edit' && activeProvider && (
            <div className="space-y-6">
              <div className="md-surface-container p-6 space-y-6">
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[var(--md-sys-color-on-surface)]">Provider Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={activeProvider.isDefault}
                    className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-4 py-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] disabled:opacity-50"
                  />
                </div>

                {activeProvider.type !== 'openrouter' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[var(--md-sys-color-on-surface)]">Base API URL</label>
                    <input
                      type="text"
                      value={formData.apiBase || ''}
                      onChange={(e) => setFormData({...formData, apiBase: e.target.value})}
                      className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-4 py-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]"
                    />
                  </div>
                )}

                {activeProvider.type !== 'openrouter' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[var(--md-sys-color-on-surface)]">Model Name</label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-4 py-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]"
                    />
                  </div>
                )}

                {activeProvider.type !== 'ollama' && (
                  <div className="space-y-2">
                    <label className="flex justify-between items-center text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                      <span>API Key</span>
                      <span className="text-[10px] text-emerald-400">{testStatus}</span>
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey || ''}
                      onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                      placeholder="sk-..."
                      className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-4 py-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {view === 'edit' && (
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleTestKey}
              disabled={isTesting || activeProvider?.type === 'openrouter'}
              className="px-5 py-3 bg-slate-800 text-sm hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Test Connection
            </button>

            <button
              onClick={handleSaveProvider}
              disabled={isSaving}
              className="px-6 py-3 bg-emerald-500 text-sm hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg transition"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saveSuccess ? 'Saved!' : 'Save Provider'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
