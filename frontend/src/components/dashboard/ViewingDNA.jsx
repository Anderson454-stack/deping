import React from 'react';

const ViewingDNA = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {/* DNA Summary Card */}
      <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-3xl cinematic-shadow relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4 block">Current Profile</span>
          <h3 className="text-2xl font-bold mb-6">Your Viewing DNA</h3>
          <div className="flex flex-wrap gap-3">
            {['Noir Minimalism', '90s Hong Kong', 'Surrealist Narrative', 'Technicolor Epics'].map((tag) => (
              <span key={tag} className="px-4 py-2 bg-surface-container-low rounded-full text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-8 text-on-surface-variant italic leading-relaxed">
            "You seem to be gravitating towards high-contrast visual storytelling with a preference for non-linear timelines and isolationist character arcs."
          </p>
        </div>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Curation Score Card */}
      <div className="bg-surface-container-lowest p-8 rounded-3xl cinematic-shadow flex flex-col justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4 block">Active Pulse</span>
          <h3 className="text-2xl font-bold">Curation Score</h3>
        </div>
        <div className="py-4">
          <div className="text-6xl font-black text-primary tracking-tighter">
            84<span className="text-2xl opacity-50">%</span>
          </div>
          <p className="text-on-surface-variant text-sm mt-2">Alignment with critical consensus</p>
        </div>
        <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full w-[84%]"></div>
        </div>
      </div>
    </div>
  );
};

export default ViewingDNA;
