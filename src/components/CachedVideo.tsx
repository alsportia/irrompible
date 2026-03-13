"use client"

import { useState, useEffect } from 'react';
import { Play, Download } from 'lucide-react';
import { videoCache } from '@/lib/videoCache';

interface CachedVideoProps {
  videoUrl: string | null;
  className?: string;
}

export default function CachedVideo({ videoUrl, className = '' }: CachedVideoProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl) return;

    // Check if it's a YouTube URL
    const ytId = getYTId(videoUrl);
    if (ytId) {
      // For YouTube videos, we can't cache them, just embed
      setVideoSrc(`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&playsinline=1`);
      return;
    }

    // For direct video URLs, try to load from cache
    loadVideo(videoUrl);
  }, [videoUrl]);

  const loadVideo = async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if video is already cached
      const cached = await videoCache.getVideo(url);
      if (cached) {
        setVideoSrc(cached);
        setIsLoading(false);
        return;
      }

      // Download and cache the video
      const blobUrl = await videoCache.downloadAndCache(url, (progress) => {
        setDownloadProgress(progress);
      });

      setVideoSrc(blobUrl);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading video:', err);
      setError('Error al cargar el vídeo');
      setIsLoading(false);
      // Fallback to direct URL
      setVideoSrc(url);
    }
  };

  const getYTId = (url: string | null) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!videoUrl) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-text-secondary bg-bg-tertiary ${className}`}>
        <Play size={32} className="mb-2 opacity-50" />
        <p className="text-sm">No hay vídeo disponible</p>
      </div>
    );
  }

  const ytId = getYTId(videoUrl);

  if (isLoading) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-text-secondary bg-bg-tertiary ${className}`}>
        <Download size={32} className="mb-4 opacity-50 animate-pulse" />
        <p className="text-sm mb-2">Descargando vídeo...</p>
        <div className="w-48 h-2 bg-border-subtle rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent-primary transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
        <p className="text-xs text-text-secondary mt-2">{downloadProgress}%</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-text-secondary bg-bg-tertiary ${className}`}>
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (ytId) {
    return (
      <iframe
        className={`w-full h-full object-cover ${className}`}
        src={videoSrc || `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&playsinline=1`}
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  if (!videoSrc) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-text-secondary bg-bg-tertiary ${className}`}>
        <Play size={32} className="mb-2 opacity-50" />
        <p className="text-sm">Cargando vídeo...</p>
      </div>
    );
  }

  return (
    <video
      className={`w-full h-full object-cover ${className}`}
      src={videoSrc}
      autoPlay
      loop
      muted
      playsInline
      controls
    />
  );
}
