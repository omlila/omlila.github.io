import Link from 'next/link';
import { getSortedVlogsData } from '@/lib/vlogs';

export const metadata = {
  title: 'Vlogs | Sanjeev Bhusal',
  description: 'Video logs and technical deep dives by Sanjeev Bhusal.',
};

export default function Vlogs() {
  const vlogsData = getSortedVlogsData();

  return (
    <>
      <section className="reveal pt-48 pb-16 text-center px-[5%]">
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] mb-4"><span className="text-gradient">Video Logs</span></h1>
          <p className="text-[#a1a1aa] text-lg max-w-[600px] mx-auto">
              A collection of my thoughts, travels, and technical deep dives documenting my journey round the world.
          </p>
      </section>

      <section className="vlogs-grid">
        {vlogsData.length === 0 ? (
            <div className="col-span-full text-center text-[#a1a1aa] py-20">
                <p>No vlogs found yet. Add some `.md` files to the `content/vlogs` directory!</p>
            </div>
        ) : (
            vlogsData.map(({ id, date, title, description }, index) => (
                <Link href={`/vlogs/${id}`} key={id} className="vlog-card reveal" style={{ transitionDelay: `${index * 100}ms` }}>
                    <div className="vlog-thumbnail">
                        <div className="play-btn">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                    <div className="p-6">
                        <span className="text-[#00f2fe] text-xs mb-2 block uppercase tracking-wider font-semibold">
                            {new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <h2 className="text-xl mb-2 text-white font-heading">{title}</h2>
                        <p className="text-sm text-[#a1a1aa] leading-relaxed">{description}</p>
                    </div>
                </Link>
            ))
        )}
      </section>
    </>
  );
}
