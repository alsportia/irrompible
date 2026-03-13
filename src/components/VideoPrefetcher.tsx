"use client"

import { useEffect, useState } from 'react';
import { videoCache } from '@/lib/videoCache';
import { Download, Check } from 'lucide-react';

interface VideoPrefetcherProps {
  videoUrls: (string | null)[];
}

export default function VideoPrefetcher({ videoUrls }: VideoPrefetcherProps) {
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentVideo, setCurrentVideo] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);

  useEffect(() => {
    prefetchVideos();
  }, [videoUrls]);

  const isYouTubeUrl = (url: string | null): boolean => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const prefetchVideos = async () => {
    // Filter out null, YouTube URLs (can't cache), and get unique URLs
    const validUrls = Array.from(new Set(
      videoUrls.filter(url => url && !isYouTubeUrl(url))
    )) as string[];

    if (validUrls.length === 0) return;

    setTotalVideos(validUrls.length);

    // Check which videos need to be downloaded
    const videosToDownload: string[] = [];
    for (const url of validUrls) {
      const hasVideo = await videoCache.hasVideo(url);
      if (!hasVideo) {
        videosToDownload.push(url);
      }
    }

    if (videosToDownload.length === 0) return;

    setIsPrefetching(true);

    // Download videos one by one
    for (let i = 0; i < videosToDownload.length; i++) {
      setCurrentVideo(i + 1);
      try {
        await videoCache.downloadAndCache(videosToDownload[i], (percent) => {
          setProgress(percent);
        });
      } catch (error) {
        console.error('Error prefetching video:', error);
      }
    }

    setIsPrefetching(false);
  };

  if (!isPrefetching) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 animate-fade-in">
      <div className="glass-panel p-4 rounded-xl border-accent-primary/30">
        <div className="flex items-center gap-3 mb-2">
          <Download size={20} className="text-accent-primary animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-medium">Descargando vídeos para uso offline</p>
            <p className="text-xs text-text-secondary">
              Vídeo {currentVideo} de {totalVideos} ({progress}%)
            </p>
          </div>
        </div>
        <div className="w-full h-2 bg-border-subtle rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
