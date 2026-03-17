"use client"

import { useState, useEffect } from "react";
import { useUser } from "@/lib/userContext";
import { Dumbbell, Plus, ChevronRight, User } from "lucide-react";

interface UserRow {
  id: number;
  name: string;
}

export default function UserSelector() {
  const { setUser } = useUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);

  const handleSelect = (u: UserRow) => setUser(u);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setError('Introduce un nombre'); return; }
    setLoading(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Error al crear usuario'); setLoading(false); return; }
    setUser(data);
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', padding: '0 1.25rem' }}>
      {/* Glow */}
      <div style={{ position: 'fixed', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '28rem', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--accent-primary)' }}>
            <Dumbbell size={28} />
          </div>
          <h1 className="heading-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Unbreakable</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>¿Quién entrena hoy?</p>
        </div>

        {!creating ? (
          <>
            {/* User list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {users.map(u => (
                <button key={u.id} onClick={() => handleSelect(u)}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', cursor: 'pointer', width: '100%', textAlign: 'left' as const }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={16} color="var(--accent-primary)" />
                  </div>
                  <span style={{ flex: 1, fontFamily: 'var(--font-outfit)', fontWeight: 600, fontSize: '1.1rem' }}>{u.name}</span>
                  <ChevronRight size={18} color="var(--text-secondary)" />
                </button>
              ))}
            </div>

            <button onClick={() => setCreating(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(59,130,246,0.4)', background: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer', width: '100%', fontWeight: 600 }}>
              <Plus size={18} />
              <span>Nuevo usuario</span>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>¿Cómo te llamas?</p>
            <input
              autoFocus
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Tu nombre"
              style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border-subtle)'}`, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', width: '100%' }}
            />
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'center' }}>{error}</p>}
            <button onClick={handleCreate} disabled={loading} className="btn-primary glow" style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? 'Creando...' : 'Empezar'}
            </button>
            {users.length > 0 && (
              <button onClick={() => { setCreating(false); setNewName(''); setError(''); }}
                style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                Volver
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
