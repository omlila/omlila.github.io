import Link from 'next/link';

export default function TermsAndConditions() {
    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 pt-32 pb-20 px-6">
            <div className="max-w-3xl mx-auto prose prose-invert prose-stone">
                <Link href="/" className="text-moss-500 hover:text-moss-400 mb-8 inline-block transition-colors no-underline">
                    &larr; Back to Home
                </Link>
                <h1 className="text-4xl font-black text-white mb-2">Terms & Conditions</h1>
                <p className="text-stone-500 mb-8">Last Updated: March 2026</p>

                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mt-10">1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using products by Omlila Labs, you accept and agree to be bound by the terms and
                        provision of this agreement. Our software is provided intentionally for offline communities and 5G connected systems.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-10">2. Software Usage & Licensing</h2>
                    <p>
                        Omlila applications (AI Jam Band, Sikshya) are licensed on a per-device basis. The software is provided "as is",
                        without warranty of any kind, express or implied, including but not limited to the warranties of merchantability or
                        fitness for a particular purpose.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-10">3. API Hub & Developer Tools</h2>
                    <p>
                        Developers engaging with the Omlila Core API agree to rate limits imposed by our edge infrastructure.
                        Misuse, reverse engineering, or attempting to breach our offline-first security modeling will result in immediate termination of API keys.
                    </p>
                </section>
            </div>
        </div>
    );
}
