import Link from 'next/link';

export default function DonatePage() {
    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 pt-32 pb-20 px-6">
            <div className="max-w-3xl mx-auto prose prose-invert prose-stone">
                <Link href="/" className="text-moss-500 hover:text-moss-400 mb-8 inline-block transition-colors no-underline">
                    &larr; Back to Home
                </Link>
                <h1 className="text-4xl font-black text-white mb-2">Support Omlila Labs</h1>
                <p className="text-stone-500 mb-8">Thank you for your support!</p>

                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mt-10">Our Mission</h2>
                    <p>
                        At Omlila Labs, our aim is to provide free, highly usable, and premium software for everyday users. 
                        We build tools like Omlila TV and Omlila Sikshya with a focus on local performance, privacy, and superior user experience.
                    </p>

                    <h2 className="text-2xl font-bold text-white mt-10">Donate</h2>
                    <p>
                        Currently, we are setting up our donation systems. Please check back later for a QR code or payment link to support our open-source and free applications!
                    </p>
                    
                    {/* Placeholder for future QR Code / Payment link */}
                    <div className="mt-8 p-12 border-2 border-dashed border-stone-800 rounded-xl flex items-center justify-center bg-stone-900/50">
                        <p className="text-stone-500 italic">QR Code / Payment Link coming soon</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
