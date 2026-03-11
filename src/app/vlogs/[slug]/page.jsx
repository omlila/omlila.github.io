import { getSortedVlogsData, getVlogData } from '@/lib/vlogs';
import Link from 'next/link';

export async function generateMetadata({ params }) {
    // Read route params (in Next.js 15, params is a promise)
    const resolvedParams = await params;
    const vlogData = await getVlogData(resolvedParams.slug);
    return {
      title: `${vlogData.title} | Sanjeev Bhusal`,
      description: vlogData.description,
    };
  }

export default async function VlogPost({ params }) {
  // In Next.js 15, params is a promise that must be awaited
  const resolvedParams = await params;
  const vlogData = await getVlogData(resolvedParams.slug);

  return (
    <article className="pt-40 max-w-[800px] mx-auto px-[5%] pb-32">
        <Link href="/vlogs" className="inline-flex items-center gap-2 text-[#a1a1aa] hover:text-white transition-colors mb-12">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Vlogs
        </Link>
        
        <header className="mb-14 text-center reveal">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight text-white font-heading">{vlogData.title}</h1>
            <div className="text-[#00f2fe] uppercase tracking-wider text-sm font-semibold">
                {new Date(vlogData.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </header>
        
        {/* Rendered Markdown output */}
        <div 
            className="prose prose-invert prose-lg max-w-none reveal prose-a:text-[#00f2fe] hover:prose-a:text-[#4facfe] prose-headings:font-heading prose-img:rounded-xl" 
            style={{ transitionDelay: '100ms' }}
            dangerouslySetInnerHTML={{ __html: vlogData.contentHtml }} 
        />
        
    </article>
  );
}

// Generate static params for SSG
export async function generateStaticParams() {
  const vlogs = getSortedVlogsData();
  return vlogs.map((vlog) => ({
    slug: vlog.id,
  }));
}
