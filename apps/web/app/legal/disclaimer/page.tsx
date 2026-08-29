import Link from 'next/link';

export default function AppDisclaimer() {
    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 pt-32 pb-20 px-6">
            <div className="max-w-3xl mx-auto prose prose-invert prose-stone">
                <Link href="/" className="text-moss-500 hover:text-moss-400 mb-8 inline-block transition-colors no-underline">
                    &larr; Back to Home
                </Link>
                <h1 className="text-4xl font-black text-white mb-2">App Disclaimer & EULA</h1>
                <p className="text-stone-500 mb-8">Last Updated: August 2026</p>

                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mt-10">1. Media Player Only</h2>
                    <p>
                        Omlila TV is purely a media player client intended to play user-provided content. 
                        We do not provide, host, sell, or distribute any media content, live streams, or IPTV subscriptions.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-10">2. User Responsibility</h2>
                    <p>
                        Users must provide their own content (e.g., M3U playlists or Xtream Codes API credentials) to use the application. 
                        By using Omlila TV, you agree that you are solely responsible for the content you stream and that you possess the necessary rights to access it.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-10">3. No Affiliation</h2>
                    <p>
                        Omlila TV is not affiliated with any third-party IPTV providers or content creators. 
                        We do not condone piracy or the unauthorized streaming of copyrighted material.
                    </p>
                </section>
            </div>
        </div>
    );
}
