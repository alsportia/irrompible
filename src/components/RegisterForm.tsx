"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Dumbbell, Check } from "lucide-react";

interface Program { id: number; name: string; }

type Step = 'form' | 'success';

export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/public/programs')
      .then(r => r.json())
      .then(data => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const toggleProgram = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    if (!email.trim()) { setError('El email es obligatorio'); return; }
    if (selectedIds.size === 0) { setError('Selecciona al menos un programa'); return; }

    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), programIds: Array.from(selectedIds) }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Error al registrarse'); return; }
    setStep('success');
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.875rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--glass-bg)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  if (step === 'success') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem 1.25rem', textAlign: 'center' }}>
        <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Check size={28} color="#10b981" />
        </div>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.75rem' }}>
          Solicitud enviada
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '22rem', marginBottom: '2rem' }}>
          Tu cuenta está pendiente de aprobación. El administrador revisará tu solicitud y te dará acceso en breve.
        </p>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.75rem 1.5rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <div style={{ position: 'fixed', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
        <button
          onClick={() => router.push('/')}
          style={{ padding: '0.5rem', marginLeft: '-0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
          Crear cuenta
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '28rem', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10 }}>
        {/* Icon */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', color: 'var(--accent-primary)' }}>
            <Dumbbell size={24} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Rellena el formulario y el administrador aprobará tu acceso
          </p>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Nombre</label>
            <input
              autoFocus
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Tu nombre"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="tu@email.com"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Programs */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>
            Programas de interés
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {programs.map(p => {
              const selected = selectedIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => { toggleProgram(p.id); setError(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: `2px solid ${selected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`, background: selected ? 'rgba(59,130,246,0.1)' : 'var(--glass-bg)', cursor: 'pointer', textAlign: 'left' as const }}
                >
                  <div style={{ width: '1.1rem', height: '1.1rem', borderRadius: '4px', border: `2px solid ${selected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`, background: selected ? 'var(--accent-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selected && <Check size={10} color="#fff" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: '0.9rem', color: selected ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: selected ? 600 : 400 }}>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{error}</p>}
      </div>

      {/* Submit */}
      <div style={{ paddingTop: '1rem', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary glow"
          style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700 }}
        >
          {loading ? 'Enviando...' : 'Solicitar acceso'}
        </button>
      </div>
    </div>
  );
}
