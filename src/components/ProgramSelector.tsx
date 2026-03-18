"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { Dumbbell, Settings, LogOut, Info, X } from "lucide-react";
import type { Program } from "@/types/index";

export default function ProgramSelector() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoProgram, setInfoProgram] = useState<Program | null>(null);

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
      <div style={{ position: 'fixed', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

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
              className="btn-admin"
              style={{ width: '100%', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Settings size={16} />
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
              <div key={program.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => router.push(`/?programId=${program.id}`)}
                  className="btn-primary glow"
                  style={{ flex: 1, padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Dumbbell size={18} />
                  {program.name}
                </button>
                {(program.description || program.image_url) && (
                  <button
                    onClick={() => setInfoProgram(program)}
                    style={{ flexShrink: 0, width: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    aria-label={`Información sobre ${program.name}`}
                  >
                    <Info size={18} />
                  </button>
                )}
              </div>
            ))
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-md)', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(8px)' }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Program info modal */}
      {infoProgram && (
        <div
          onClick={() => setInfoProgram(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxHeight: '85dvh', background: 'var(--bg-secondary)', borderRadius: '1.25rem 1.25rem 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* Image */}
            {infoProgram.image_url && (
              <div style={{ height: '220px', flexShrink: 0, overflow: 'hidden', background: '#000' }}>
                <img
                  src={infoProgram.image_url}
                  alt={infoProgram.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.25rem', margin: 0, flex: 1 }}>
                  {infoProgram.name}
                </h2>
                <button
                  onClick={() => setInfoProgram(null)}
                  style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
                >
                  <X size={22} />
                </button>
              </div>
              {infoProgram.description && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {infoProgram.description}
                </p>
              )}
            </div>

            {/* CTA */}
            <div style={{ paddingTop: '1rem', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => { setInfoProgram(null); router.push(`/?programId=${infoProgram.id}`); }}
                className="btn-primary glow"
                style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700 }}
              >
                <Dumbbell size={20} />
                Empezar {infoProgram.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
