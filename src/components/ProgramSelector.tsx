"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { Dumbbell, Settings, LogOut, Info, X, PlusCircle, Check } from "lucide-react";
import type { Program } from "@/types/index";
import LoginSelector from "./LoginSelector";

export default function ProgramSelector() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoProgram, setInfoProgram] = useState<Program | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [requesting, setRequesting] = useState<number | null>(null);
  const [requested, setRequested] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    Promise.all([
      fetch('/api/programs', { headers: { 'x-user-id': String(user.id) } }).then(r => r.json()),
      fetch('/api/public/programs').then(r => r.json()),
    ])
      .then(([mine, all]) => {
        setPrograms(Array.isArray(mine) ? mine : []);
        setAllPrograms(Array.isArray(all) ? all : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = () => setUser(null);

  const handleRequest = async (programId: number) => {
    if (!user || requesting) return;
    setRequesting(programId);
    try {
      const res = await fetch('/api/programs/request', {
        method: 'POST',
        headers: { 'x-user-id': String(user.id), 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId }),
      });
      if (res.ok) setRequested(prev => new Set(prev).add(programId));
    } finally {
      setRequesting(null);
    }
  };

  if (!user) return <LoginSelector />;

  const assignedIds = new Set(programs.map(p => p.id));
  const unassigned = allPrograms.filter(p => !assignedIds.has(p.id));

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

          {/* Request more programs */}
          {!loading && unassigned.length > 0 && (
            <button
              onClick={() => setShowRequest(true)}
              style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(8px)' }}
            >
              <PlusCircle size={15} />
              Solicitar acceso a otro programa
            </button>
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

      {/* Request program modal */}
      {showRequest && (
        <div onClick={() => setShowRequest(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg-secondary)', borderRadius: '1.25rem 1.25rem 0 0', padding: '1.5rem 1.25rem', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Solicitar programa</h2>
              <button onClick={() => setShowRequest(false)} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              El administrador recibirá tu solicitud y te asignará el programa si lo aprueba.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {unassigned.map(p => {
                const done = requested.has(p.id);
                return (
                  <button key={p.id} onClick={() => !done && handleRequest(p.id)} disabled={done || requesting === p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: done ? 'rgba(102,187,106,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? 'rgba(102,187,106,0.3)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 'var(--radius-md)', cursor: done ? 'default' : 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)', opacity: requesting && requesting !== p.id ? 0.5 : 1, transition: 'all 0.15s' }}>
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: done ? 'rgba(102,187,106,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${done ? '#66bb6a' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {done ? <Check size={14} color="#66bb6a" /> : <Dumbbell size={14} color="var(--text-secondary)" />}
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>{p.name}</span>
                    {done
                      ? <span style={{ fontSize: '0.72rem', color: '#66bb6a', fontWeight: 600 }}>Solicitado</span>
                      : requesting === p.id
                        ? <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Enviando...</span>
                        : <PlusCircle size={16} color="var(--text-secondary)" />
                    }
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
