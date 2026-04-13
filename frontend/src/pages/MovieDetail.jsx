import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageTransition } from '../components/motion/PageTransition';
import { movieService } from '../api/movieService';
import StreamingBadges from '../components/movie/StreamingBadges';

const MovieDetail = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    movieService.getMovieDetail(id)
      .then(res => {
        setMovie(res.data);
      })
      .catch(err => {
        console.error('Failed to load movie details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto py-12 px-6 flex items-center justify-center min-h-[50vh]">
          <div className="flex gap-2">
            <span className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '120ms' }} />
            <span className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!movie) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto py-12 px-6 text-center">
          <h2 className="text-2xl font-bold text-on-surface-variant">Movie not found.</h2>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto py-12 px-6">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Poster Section */}
          <div className="w-full lg:w-1/3">
            <div className="sticky top-24">
              <img 
                src={movie.image || `https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                alt={movie.title_ko || movie.title} 
                className="w-full aspect-[2/3] object-cover rounded-3xl cinematic-shadow"
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 space-y-8">
            <div>
              <span className="text-primary font-bold uppercase tracking-widest text-xs mb-3 block">
                Recommended by Deeping
              </span>
              <h1 className="text-5xl font-black tracking-tight mb-4">
                {movie.title_ko || movie.title}
              </h1>
              <div className="flex flex-wrap gap-3">
                {movie.genres?.map(genre => (
                  <span key={genre} className="px-4 py-2 bg-surface-container-low rounded-full text-sm font-medium">
                    {genre}
                  </span>
                ))}
                {movie.runtime && (
                  <span className="px-4 py-2 bg-surface-container-low rounded-full text-sm font-medium">
                    {movie.runtime} min
                  </span>
                )}
                {movie.year && (
                  <span className="px-4 py-2 bg-surface-container-low rounded-full text-sm font-medium">
                    {movie.year}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold">The Synopsis</h3>
              <p className="text-lg text-on-surface-variant leading-relaxed max-w-2xl">
                {movie.overview || movie.overview_ko}
              </p>
            </div>

            {/* Availability Badges (Task G) */}
            <StreamingBadges 
              tmdbId={movie.tmdb_id || movie.id} 
              title={movie.title_ko || movie.title}
              isTheater={movie.is_theater} 
            />

            <div className="pt-4 flex flex-wrap gap-4">
              <button className="ruby-gradient px-12 py-4 rounded-full text-on-primary font-bold cinematic-shadow hover:scale-105 transition-all">
                Add to Watchlist
              </button>
              <button className="px-12 py-4 rounded-full bg-surface-container text-on-surface font-bold hover:bg-surface-container-high transition-all">
                Rate this Film
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default MovieDetail;
