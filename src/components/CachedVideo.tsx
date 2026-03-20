"use client"

import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface CachedVideoProps {
  videoUrl: string | null;
  exerciseName?: string;
}

function getYTEmbedUrl(url: string | null): string | null {
  if (!url) return null;

  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) {
    const id = shortsMatch[1];
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&controls=1&modestbranding=1`;
  }

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) {
    const id = shortMatch[1];
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&controls=1&modestbranding=1`;
  }

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    const id = watchMatch[1];
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&controls=1&modestbranding=1`;
  }

  return null;
}

const placeholder = {
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary)',
    gap: '0.75rem',
  },
  iconBox: {
    width: '4rem',
    height: '4rem',
    borderRadius: '50%',
    background: 'rgba(59,130,246,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    fontWeight: 500,
    textAlign: 'center' as const,
    padding: '0 1rem',
    maxWidth: '200px',
  },
  label: {
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    opacity: 0.5,
  }
};

export default function CachedVideo({ videoUrl, exerciseName }: CachedVideoProps) {
  const [failed, setFailed] = useState(false);

  // Local video file
  if (videoUrl && videoUrl.startsWith('/') && !failed) {
    return (
      <video
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }}
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        onError={() => setFailed(true)}
      />
    );
  }

  const embedUrl = getYTEmbedUrl(videoUrl);

  if (!videoUrl || !embedUrl || failed) {
    return (
      <div style={{ ...placeholder.wrapper, height: '100%' }}>
        <div style={placeholder.iconBox}>
          <Dumbbell size={28} color="var(--accent-primary)" />
        </div>
        {exerciseName && <p style={placeholder.name}>{exerciseName}</p>}
        <span style={placeholder.label}>Sin vídeo disponible</span>
      </div>
    );
  }

  return (
    <iframe
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      src={embedUrl}
      allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      onError={() => setFailed(true)}
    />
  );
}
