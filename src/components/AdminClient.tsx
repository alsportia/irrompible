"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { Users, Dumbbell, Wrench, BookOpen, UserCheck, UserX, BarChart2 } from "lucide-react";
import type { Program } from "@/types/index";
import AdminStatsView from "./AdminStatsView";

type UserRow = { id: number; name: string; email: string; role: 'admin' | 'user'; status: 'active' | 'pending' };
type UserWithPrograms = UserRow & { programs: Program[] };

const NAV_BUTTONS = [
  { label: 'Gestión de Usuarios',   icon: Users,      href: '/admin/users'       },
  { label: 'Gestión de Programas',  icon: Dumbbell,   href: '/admin/programs'    },
  { label: 'Gestión de Ejercicios', icon: BookOpen,   href: '/admin/exercises'   },
  { label: 'Mantenimiento',         icon: Wrench,     href: '/admin/maintenance' },
];

export default function AdminClient() {
  const { user } = useUser();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<UserWithPrograms[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);

  const headers = { 'x-user-id': String(user?.id ?? 0) };

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role !== 'admin') { router.push('/programs'); return; }
    loadPending();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadPending() {
    setLoading(true);
    try {
      const usersData = await fetch('/api/admin/users', { headers }).then(r => r.json());
      const allUsers: UserRow[] = Array.isArray(usersData) ? usersData : [];
      const pending = allUsers.filter(u => u.status === 'pending');
      const withPrograms = await Promise.all(
        pending.map(async (u) => {
          const res = await fetch(`/api/admin/users/${u.id}/programs`, { headers });
          const progs = await res.json();
          return { ...u, programs: Array.isArray(progs) ? progs : [] };
        })
      );
      setPendingUsers(withPrograms);
    } catch {}
    setLoading(false);
  }

  const handleStatusChange = async (userId: number, status: 'active' | 'rejected') => {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setPendingUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', padding: '1.5rem 1.25rem' }}>
      {showStats && <AdminStatsView onClose={() => setShowStats(false)} />}
      <div style={{ position: 'fixed', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '48rem', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => router.push('/programs')}
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Volver
          </button>
          <h1 className="heading-display" style={{ fontSize: '1.5rem', margin: 0, flex: 1 }}>Panel de Administración</h1>
        </div>

        {/* Nav buttons — 2x2 grid + stats full-width */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
          {NAV_BUTTONS.map(({ label, icon: Icon, href }) => (
            <button key={href} onClick={() => router.push(href)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1rem', background: 'rgba(10, 25, 10, 0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(10px)', transition: 'border-color 0.15s ease', color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
            >
              <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(232,245,233,0.08)', border: '1px solid rgba(232,245,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Icon size={22} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
            </button>
          ))}
          {/* Stats — ocupa las 2 columnas */}
          <button onClick={() => setShowStats(true)}
            style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.25rem 1rem', background: 'rgba(10, 25, 10, 0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(10px)', transition: 'border-color 0.15s ease', color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
          >
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(232,245,233,0.08)', border: '1px solid rgba(232,245,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <BarChart2 size={22} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>Estadísticas Globales</span>
          </button>
        </div>

        {/* Pending users */}
        {!loading && pendingUsers.length > 0 && (
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
              Pendientes de aprobación ({pendingUsers.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pendingUsers.map(u => (
                <div key={u.id} style={{ background: 'rgba(10, 30, 10, 0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' as const, backdropFilter: 'blur(10px)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.1rem 0 0' }}>{u.email}</p>
                    {u.programs.length > 0 && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                        Solicita: {u.programs.map(p => p.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <button onClick={() => handleStatusChange(u.id, 'active')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', background: '#166534', border: '1px solid #22c55e', borderRadius: 'var(--radius-md)', color: '#dcfce7', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                    <UserCheck size={14} /> Aceptar
                  </button>
                  <button onClick={() => handleStatusChange(u.id, 'rejected')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', color: '#fee2e2', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                    <UserX size={14} /> Rechazar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && pendingUsers.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
            No hay usuarios pendientes de aprobación.
          </p>
        )}
      </div>
    </div>
  );
}
