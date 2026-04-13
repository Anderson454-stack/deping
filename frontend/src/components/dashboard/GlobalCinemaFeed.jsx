import React from 'react';

/**
 * Global Cinema Feed (Task 4)
 * 잡지 레이아웃 형태의 영화 뉴스 피드 컴포넌트
 * Naver News API 및 해외 RSS 피드 연동을 위한 구조
 */
const GlobalCinemaFeed = () => {
  const newsItems = [
    {
      id: 1,
      category: 'Festival',
      title: 'Cannes 2026: The Return of the Masters',
      summary: 'Explore the highly anticipated lineup for this year\'s festival, featuring new works from established legends and emerging voices.',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800',
      source: 'Variety',
      date: '2h ago',
      featured: true
    },
    {
      id: 2,
      category: 'Industry',
      title: 'AI in Cinema: Beyond the Hype',
      summary: 'How generative AI is actually being used in post-production today.',
      image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=400',
      source: 'The Hollywood Reporter',
      date: '5h ago'
    },
    {
      id: 3,
      category: 'Box Office',
      title: 'Global Trends: The Rise of Independent Horror',
      summary: 'Why small-budget horror is dominating the international market.',
      image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=400',
      source: 'IndieWire',
      date: '8h ago'
    }
  ];

  return (
    <section className="mt-20">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tighter italic">Global Cinema Feed</h2>
          <div className="h-1 w-12 bg-primary mt-2" />
        </div>
        <button className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
          Explore Archive
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Featured Story */}
        {newsItems.filter(item => item.featured).map(item => (
          <div key={item.id} className="lg:col-span-8 group cursor-pointer">
            <div className="relative aspect-video overflow-hidden rounded-3xl mb-6">
              <img 
                src={item.image} 
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <span className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">
                  {item.category}
                </span>
                <h3 className="text-3xl font-bold text-white mb-2 leading-tight group-hover:underline">
                  {item.title}
                </h3>
                <p className="text-white/70 text-sm line-clamp-2 max-w-2xl">
                  {item.summary}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Secondary Stories */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {newsItems.filter(item => !item.featured).map(item => (
            <div key={item.id} className="flex gap-4 group cursor-pointer">
              <div className="shrink-0 w-24 h-24 rounded-2xl overflow-hidden bg-surface-container-high">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-primary text-[9px] font-bold uppercase tracking-widest mb-1">
                  {item.category}
                </span>
                <h4 className="font-bold text-sm leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60">
                  <span className="font-bold">{item.source}</span>
                  <span>•</span>
                  <span>{item.date}</span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Magazine Footer Info */}
          <div className="mt-auto p-4 rounded-2xl bg-surface-container-low border border-outline-variant/5">
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              Curated from 20+ global sources including Naver News, Variety, and RSS feeds. Updated every 30 minutes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalCinemaFeed;
