"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function FeatureRequestPage() {
    const [app, setApp] = useState("Omlila TV");
    const [message, setMessage] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const subject = encodeURIComponent(`Feature Request for ${app}`);
        const body = encodeURIComponent(`App: ${app}\n\nFeature Details:\n${message}`);
        
        window.location.href = `mailto:s360@duck.com?subject=${subject}&body=${body}`;
    };

    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 pt-32 pb-20 px-6">
            <div className="max-w-3xl mx-auto prose prose-invert prose-stone">
                <Link href="/" className="text-moss-500 hover:text-moss-400 mb-8 inline-block transition-colors no-underline">
                    &larr; Back to Home
                </Link>
                <h1 className="text-4xl font-black text-white mb-2">Feature Request</h1>
                <p className="text-stone-500 mb-8">Help us improve our applications</p>

                <section className="space-y-6">
                    <p>
                        Have an idea to make our apps better? Submit your feature request below. 
                        Clicking submit will open your default email app.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6 max-w-xl">
                        
                        <div>
                            <label htmlFor="app" className="block text-sm font-medium text-stone-400 mb-2">App</label>
                            <select 
                                id="app" 
                                name="app" 
                                value={app}
                                onChange={(e) => setApp(e.target.value)}
                                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-moss-500"
                                required
                            >
                                <option value="Omlila TV">Omlila TV</option>
                                <option value="Omlila Sikshya">Omlila Sikshya</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-stone-400 mb-2">Feature Details</label>
                            <textarea 
                                id="message" 
                                name="message" 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={5}
                                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-moss-500"
                                placeholder="Describe the feature you'd like to see..."
                                required
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            className="bg-moss-600 hover:bg-moss-500 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                        >
                            Open Email to Submit
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
