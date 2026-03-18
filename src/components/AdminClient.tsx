"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import type { Program } from "@/types/index";

type UserRow = { id: number; name: string; email: string; role: 'admin' | 'user' };
type UserWithPrograms = UserRow & { programs: Program[] };

export default function AdminClient() {
  const { user } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithPrograms[]>([]);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role !== 'admin') { router.push('/programs'); return; }
    const headers = { 'x-user-id': String(user.id) };
    Promise.all([
      fetch('/api/admin/users', { headers }).then(r => r.json()),
      fetch('/api/admin/programs', { headers }).then(r => r.json()),
    ])
      .then(async ([usersData, programsData]) => {
        const allUsers: UserRow[] = Array.isArray(usersData) ? usersData : [];
        const allProgs: Program[] = Array.isArray(programsData) ? programsData : [];
        // Load programs for each user in parallel
        const usersWithPrograms = await Promise.all(
          allUsers.map(async (u) => {
            const res = await fetch(`/api/admin/users/${u.id}/programs`, { headers });
            const progs = await res.json();
            return { ...u, programs: Array.isArray(progs) ? progs : [] };
          })
        );
        setUsers(usersWithPrograms);
        setAllPrograms(allProgs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleRoleChange = async (userId: number, role: 'admin' | 'user') => {
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': String(user!.id) },
      body: JSON.stringify({ role }),
    });
  };

  const handleProgramToggle = async (userId: number, programId: number, checked: boolean) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const currentIds = targetUser.programs.map(p => p.id);
    let newIds: number[];

    if (checked) {
      newIds = [...currentIds, programId];
    } else {
      if (currentIds.length <= 1) {
        const confirmed = window.confirm('¿Seguro que quieres quitar el último programa de este usuario?');
        if (!confirmed) return;
      }
      newIds = currentIds.filter(id => id !== programId);
    }

    const newPrograms = allPrograms.filter(p => newIds.includes(p.id));
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, programs: newPrograms } : u));

    await fetch(`/api/admin/users/${userId}/programs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': String(user!.id) },
      body: JSON.stringify({ programIds: newIds }),
    });
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', padding: '1.5rem 1.25rem' }}>
      {/* Glow */}
      <div style={{ position: 'fixed', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '48rem', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => router.push('/programs')}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← Volver
          </button>
          <h1 className="heading-display" style={{ fontSize: '1.5rem', margin: 0 }}>
            Panel de Administración
          </h1>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Cargando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {users.map(u => (
              <div
                key={u.id}
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{u.name}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.125rem 0 0' }}>{u.email}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Rol:</label>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as 'admin' | 'user')}
                      style={{
                        background: 'var(--bg-secondary, #1a1a2e)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm, 6px)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        padding: '0.25rem 0.5rem',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Programas:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {allPrograms.map(program => {
                      const assigned = u.programs.some(p => p.id === program.id);
                      return (
                        <label
                          key={program.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' }}
                        >
                          <input
                            type="checkbox"
                            checked={assigned}
                            onChange={e => handleProgramToggle(u.id, program.id, e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                          />
                          {program.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
