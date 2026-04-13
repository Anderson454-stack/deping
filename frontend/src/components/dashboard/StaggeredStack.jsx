import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StaggerList, StaggerListItem } from '../motion/PageTransition';

const StaggeredStack = () => {
  const navigate = useNavigate();
  const movies = [
    {
      id: 1,
      title: 'Event Horizon: Revisited',
      reason: "Because you liked 'Interstellar'",
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApH5Mq2aFaAPGdWmYYaii_jb2VowpkiJX8OXFmJqb9zDWjfQ7vfLg122elS347LxI3MqgYSXgukonwdWeAH-Z-ocQNb6eQxijeMhMYf9kC8jnPol-TUeGw7fEv21FP1zJVcqMssukNMWI4_ulfCeM0IlncmNbRgvwrGGM7MU3uE15G1AGsErH-vGNvEWBlNoP992_uGSNfFBKFWLyKy7_nyE3J14RXa1tUYt3U_c_CZcV44gp55ClnGKXNXgxV4P4lioqH-5oEqOM',
      staggerClass: 'md:translate-y-4'
    },
    {
      id: 2,
      title: 'Midnight in Seoul',
      reason: "Your current 'New Frontier' focus",
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDp3EbOdUrhxsgt3TccpZPIUUf8nVZ5QLvFPQqbm5902KdSfX6vobT4hQVTy0Z82X22QygTjsgzOzeWcRjLZ58wVr_301c-ldZx2_yxaykygMJPp5KmImFlp9d_VDknyMTeoWMDFYt-dP7nfurkDRmOrq70yOHC-5J3Qt6QS44ghULOf_ftt62jNKyAwgltv1t9mnjvnwXz0ZQlj_d5p0IFJhAJN343gm_N2vqbqA0lTcQpTzG8X0EBkmWM4knb_uiQr8K-GsqIrs',
      staggerClass: 'md:-translate-y-4'
    },
    {
      id: 3,
      title: 'The Library of Babel',
      reason: "Recommended surrealist narrative",
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHZS71FUyJrvQGifYycYbSY1RvezXAkHEy_ty1JKxPansBMyxSgBSHawfdYCiUOsLjdPSv1LIoLoX01jyjkFrzGDO5BVUOEY2V3Xtayxxyq0KFpkD0u-HcW99mocorpgbdWSgJg5UyXj7DDeUI3q5qsoc90NIk9130iDcXuu5rlZy9AAitWAnAhRDvqCblZU-QUo_IVhCGU4wmBabODeQngtrd2n73THwvtCeHRSJ89iU9EJ1bhbNAenykA0CLIdvrbsGBBI7U8m0',
      staggerClass: 'md:translate-y-8'
    }
  ];

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold mb-8">The Staggered Stack</h2>
      <StaggerList className="relative flex flex-col md:flex-row gap-8">
        {movies.map((movie) => (
          <StaggerListItem
            key={movie.id}
            className={`w-full md:w-1/3 ${movie.staggerClass}`}
          >
            <div
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="bg-surface-container-low rounded-3xl p-4 cinematic-shadow cursor-pointer hover:bg-surface-container-high transition-all h-full"
            >
              <img className="w-full aspect-[2/3] object-cover rounded-2xl mb-4" src={movie.image} alt={movie.title} />
              <div className="px-2 pb-2">
                <h4 className="font-bold">{movie.title}</h4>
                <p className="text-xs text-on-surface-variant">{movie.reason}</p>
              </div>
            </div>
          </StaggerListItem>
        ))}
      </StaggerList>
    </section>
  );
};

export default StaggeredStack;
