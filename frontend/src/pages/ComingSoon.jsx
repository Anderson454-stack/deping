import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageTransition } from '../components/motion/PageTransition';

const SECTION_META = {
  '/discover': {
    icon: 'explore',
    title: 'Discover',
    desc: '취향 유형을 탐색하고 새로운 영화 세계를 발견하는 공간입니다.',
  },
  '/journal': {
    icon: 'menu_book',
    title: 'Journal',
    desc: 'AI와의 대화로 쌓인 추천 기록과 나의 시네마 일지를 볼 수 있습니다.',
  },
};

const ComingSoon = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meta = SECTION_META[pathname] ?? SECTION_META['/discover'];

  return (
    <PageTransition className="h-full">
      <div className="h-full overflow-y-auto flex flex-col items-center justify-center min-h-full text-center px-6 gap-6">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-2"
          style={{ background: 'rgba(142,0,4,0.08)' }}
        >
          <span className="material-symbols-outlined text-primary text-4xl">{meta.icon}</span>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-3">
            Coming Soon
          </p>
          <h1 className="text-4xl font-black tracking-tight mb-4">{meta.title}</h1>
          <p className="text-on-surface-variant text-lg max-w-sm mx-auto leading-relaxed">
            {meta.desc}
          </p>
          <p className="text-on-surface-variant/50 text-sm mt-3">
            🎬 준비 중입니다. 곧 만나요!
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-4 flex items-center gap-2 px-8 py-3 rounded-full bg-surface-container text-on-surface font-bold hover:bg-surface-container-high transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          돌아가기
        </button>
      </div>
    </PageTransition>
  );
};

export default ComingSoon;
