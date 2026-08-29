import Link from 'next/link';
import { Terminal, Copy, CheckCircle2 } from 'lucide-react';

export default function ApiHub() {
    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="text-moss-500 hover:text-moss-400 mb-8 inline-block transition-colors">
                    &larr; Back to Home
                </Link>
                <h1 className="text-5xl font-black text-white mb-6">Omlila Core API</h1>
                <p className="text-xl mb-12 text-stone-400">
                    Built for the offline-first web. Sync data when 5G is available, operate autonomously when it's not.
                    Connect your custom apps to our suite.
                </p>

                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 mb-12 relative">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Terminal className="w-24 h-24" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">REST Endpoint</h2>
                    <p className="mb-6 font-mono text-moss-400 bg-stone-950 p-4 rounded-xl border border-stone-800 break-all">
                        GET https://api.omlila.web/v1/status
                    </p>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 glass px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-stone-800 text-white transition-all">
                            <Copy className="w-4 h-4" /> Copy Endpoint
                        </button>
                        <span className="text-sm text-stone-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-moss-500" /> Operational</span>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 bg-stone-900 border border-stone-800 rounded-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">Authentication</h3>
                        <p className="text-stone-400 text-sm">Use standard Bearer tokens generated from your developer dashboard. Offline mode uses signed local caching.</p>
                    </div>
                    <div className="p-6 bg-stone-900 border border-stone-800 rounded-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">Webhooks</h3>
                        <p className="text-stone-400 text-sm">Register edge-functions to receive immediate push updates when devices reconnect to the 5G network.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
