const THEATER_WINDOW_DAYS = 120;

export function getTheaterLinks(movieTitle) {
  const query = encodeURIComponent(movieTitle ?? '');

  return [
    { name: 'CGV', url: `https://www.cgv.co.kr/search/?query=${query}` },
    { name: '메가박스', url: `https://www.megabox.co.kr/movie?searchText=${query}` },
    { name: '롯데시네마', url: `https://www.lottecinema.co.kr/NLCHS/Movie/List?search=${query}` },
  ];
}

export function isLikelyNowPlaying(movie) {
  if (!movie) return false;

  if (movie.source === 'kobis' || movie.source === 'tmdb') {
    return true;
  }

  const releaseDate = movie.release_date;
  if (!releaseDate) return false;

  const parsed = new Date(releaseDate);
  if (Number.isNaN(parsed.getTime())) return false;

  const diffDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= -7 && diffDays <= THEATER_WINDOW_DAYS;
}
