"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { Dumbbell, Settings, LogOut } from "lucide-react";
import type { Program } from "@/types/index";

export default function ProgramSelector() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/programs', {
      headers: { 'x-user-id': String(user.id) },
    })
      .then(res => res.json())
      .then(data => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    router.push('/');
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', padding: '0 1.25rem' }}>
      {/* Glow */}
      <div style={{ position: 'fixed', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '28rem', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--accent-primary)' }}>
            <Dumbbell size={28} />
          </div>
          <h1 className="heading-display" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            Hola, {user?.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Selecciona tu programa</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Admin panel button */}
          {user?.role === 'admin' && (
            <button
              onClick={() => router.push('/admin')}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Settings size={18} />
              Panel de Administración
            </button>
          )}

          {/* Programs */}
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem' }}>Cargando programas...</p>
          ) : programs.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem' }}>
              No tienes programas asignados. Contacta con el administrador.
            </p>
          ) : (
            programs.map(program => (
              <button
                key={program.id}
                onClick={() => router.push(`/?programId=${program.id}`)}
                className="btn-primary glow"
                style={{ width: '100%', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Dumbbell size={18} />
                {program.name}
              </button>
            ))
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
