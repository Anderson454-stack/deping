import React from 'react';

const SessionHistory = () => {
  const sessions = [
    {
      id: 1,
      date: 'Oct 24, 2023',
      title: 'The Fast & Furious Friday',
      description: '"Something high octane but with a soul. No mindless explosions."',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCqjkx_15OxiHnv__14dI8caYUIvuxQ53kYvoh8rhbsq6WcExPgOzvUDZMqfZBVkAlhT86s2CTsM3D7MCY20vykufJDbLgoewQMcp0DZ6gFqUavWzaBQ7BrhsuRc6wfXerMmeFSV3I3PLy3hvgF9LW0bylfis04wMVcQ75dWiyHQjWkKKZarTuwjz3WcbokxgNeNk0GH1tr7zayvZHhEt7gRoRQ1y34lgPq4umNG1WmSRRRs8e_sg2O4w7eeRFsFf4PouHc3Bu22Dc',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBNu7KqKregiEqsWsNB_0UR4wQkjZ86IMoLXBWPN8RyGNe_GuK3aB3up3n1uDbdoiNZM1e0A8pWE733ZLFYlITkILxrzmB-sQSPO5hbOAk24CtkHqJxQHkX87l-vF6ZEZQGmA56LCmPtICR44lResfanR8STSLs6iTVQv5QSf6ORnbG9guw4-fFmnh4GSqG7u0OTYDcXJv8OA-DuF4MAHYocN6xpl_mVIiJlR2-dDQHby7WMEkAId8WC2F3Teb1qRO6VUWbpLC9mkw'
      ],
      extra: 3
    },
    {
      id: 2,
      date: 'Oct 22, 2023',
      title: 'Cerebral Sundays',
      description: '"Complex narratives that require a notebook. Philosophical sci-fi."',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA0SfY86ZzR_p70-knBxHLb6DFMwKpv2s0FBPE_u_Q5dQjdLSpM5BLrsky4rAQSSWPSEdpUwXF1Wy6m1KHFzTpWJTRA0EysTln7U0PcW6lj0pKBv36-ti5S5F8G8smfyokPCX-C9OCsdf-N9pK-BDMdiT0P5aEw2JlGlorV8kl_ttD3-PPziScVsJzYOymBO2jcrWLZtU-awtbagX4RBSPCy_P8dXKcCpKgytO02T2XEEpLQ77hxvNPOqodU2kS6urPRufyPramFsc',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAApn5wZASO7z245m1eC4-Yq0iSTUH3V-ve1THuO_mtKUy38dBBr1Y7kTAtu4PK6_VjDd4_KD57y1wdufPidbO9FpPfdvMquYrihBzuEzP7i_cegx8VcnlN7cCS7YbzjrWeDxS-OkjysQfJtieYEzYELHmaCq-FFf--wCLQOA9xc_TQ0-n31awXanhppFO5tLIMca6GhtYGJrJoOuOoF4MazgLSuKlvJuSxNod158FjYyVjvnK0J0rsGwZgA5OkcujUK2lAoPjgj8A'
      ],
      extra: 1
    },
    {
      id: 3,
      date: 'Oct 19, 2023',
      title: 'Rainy Noir Echoes',
      description: '"Melancholic detectives and wet pavement. Jazz-heavy soundtracks."',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD_aVFgoZ5oO2RY8iDyq2H4doj3XybevoSgKsq7jj-LoLYA3xfMnCaWCMolOwl_L_ZqP2Qp3t_-hbhC4KNIeo_kbNTUgbQPyr1lGyDZa4LWXYUpnNhYRjMqmorWG9U-pzo030ZEsddO_MyPIVRA6El-QJWdCTlhOesrNG9qDh8IBwD5vQdkXRetTA7MAkzOqyDktJW_06oZo4-lbqZ2afFqarzbJ9u_SijIkczIKdYcNqeNu_M-rkZVE88D-y7E1V1wsyuMiH2rTPQ'
      ],
      extra: 12
    }
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Previous Sessions</h2>
        <button className="text-primary font-bold text-sm hover:underline">View All Archives</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="group bg-surface-container-low p-1 rounded-3xl hover:bg-surface-container-high transition-all cursor-pointer">
            <div className="bg-surface-container-lowest p-6 rounded-[calc(1.5rem-2px)] h-full flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{session.date}</span>
                <span className="material-symbols-outlined text-primary text-xl">history</span>
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{session.title}</h3>
              <p className="text-sm text-on-surface-variant line-clamp-2 mb-6">{session.description}</p>
              <div className="mt-auto flex -space-x-3">
                {session.images.map((img, idx) => (
                  <img key={idx} className="w-8 h-8 rounded-full border-2 border-surface-container-lowest object-cover" src={img} alt="movie poster" />
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center text-[10px] font-bold">+{session.extra}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SessionHistory;
