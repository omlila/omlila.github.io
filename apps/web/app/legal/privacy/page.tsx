import Link from 'next/link';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 pt-32 pb-20 px-6">
            <div className="max-w-3xl mx-auto prose prose-invert prose-stone">
                <Link href="/" className="text-moss-500 hover:text-moss-400 mb-8 inline-block transition-colors no-underline">
                    &larr; Back to Home
                </Link>
                <h1 className="text-4xl font-black text-white mb-2">Privacy Policy</h1>
                <p className="text-stone-500 mb-8">Last Updated: March 2026</p>

                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mt-10">1. Offline-First Philosophy</h2>
                    <p>
                        At Omlila Labs, our core promise is "Privacy from the cloud." Our applications are
                        designed to run autonomously on your device. We do not require constant internet connectivity
                        and we do not sync your personal data to our servers unless explicitly requested by you.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-10">2. Data We Collect</h2>
                    <p>
                        When utilizing our 5G synchronous features, we collect minimal diagnostic data to ensure
                        connectivity and operation:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mt-4">
                        <li>Device type and OS version</li>
                        <li>Crash reports (opt-in only)</li>
                        <li>Sync timestamps</li>
                    </ul>

                    <h2 className="text-2xl font-bold text-white mt-10">3. Local AI Processing</h2>
                    <p>
                        All AI inferences made through Omlila AI Jam Band or Omlila Sikshya occur entirely on-device
                        using local neural engine processing. Your audio data, crop images, and personal inputs never leave your device.
                    </p>
                </section>
            </div>
        </div>
    );
}
