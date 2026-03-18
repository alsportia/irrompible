"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { Dumbbell } from "lucide-react";

export default function LoginSelector() {
  const { setUser } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Introduce tu email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 404) {
        setError('Email no encontrado');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
      router.push('/programs');
    } catch {
      setError('Error al conectar con el servidor');
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', padding: '0 1.25rem' }}>
      {/* Glow */}
      <div style={{ position: 'fixed', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Center content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '28rem', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--accent-primary)' }}>
            <Dumbbell size={28} />
          </div>
          <h1 className="heading-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Unbreakable</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Introduce tu email para continuar</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="tu@email.com"
            style={{
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${error ? 'var(--danger)' : 'var(--border-subtle)'}`,
              background: 'var(--glass-bg)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              outline: 'none',
              width: '100%',
            }}
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'center' }}>{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary glow"
            style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>

      {/* Footer register button */}
      <div style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
          ¿Aún no tienes cuenta?
        </p>
        <button
          onClick={() => router.push('/register')}
          style={{ padding: '0.6rem 1.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 'var(--radius-md)', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(8px)' }}
        >
          Registrarse
        </button>
      </div>
    </div>
  );
}
