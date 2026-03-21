"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { UserPlus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, UserCheck, UserX, Download } from "lucide-react";
import type { Program } from "@/types/index";
import AdminExercises from "./AdminExercises";

type UserRow = { id: number; name: string; email: string; role: 'admin' | 'user'; status: 'active' | 'pending' };
type UserWithPrograms = UserRow & { programs: Program[]; expanded: boolean };

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; user: UserRow }
  | { type: 'delete'; user: UserRow }
  | null;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function AdminClient() {
  const { user } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithPrograms[]>([]);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  const headers = { 'x-user-id': String(user?.id ?? 0) };

  async function handleBackup() {
    const res = await fetch('/api/admin/backup', { headers });
    if (!res.ok) return;
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="(.+)"/);
    const filename = match?.[1] ?? 'backup.db';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`¿Restaurar la base de datos desde "${file.name}"? La app se reiniciará.`)) {
      e.target.value = '';
      return;
    }
    setRestoring(true);
    setRestoreError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/restore', { method: 'POST', headers, body: formData });
      if (!res.ok) {
        const { error } = await res.json();
        setRestoreError(error ?? 'Error al restaurar');
      } else {
        window.location.reload();
      }
    } catch {
      setRestoreError('Error de red');
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  }

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role !== 'admin') { router.push('/programs'); return; }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const [usersData, programsData] = await Promise.all([
        fetch('/api/admin/users', { headers }).then(r => r.json()),
        fetch('/api/admin/programs', { headers }).then(r => r.json()),
      ]);
      const allUsers: UserRow[] = Array.isArray(usersData) ? usersData : [];
      const allProgs: Program[] = Array.isArray(programsData) ? programsData : [];
      const usersWithPrograms = await Promise.all(
        allUsers.map(async (u) => {
          const res = await fetch(`/api/admin/users/${u.id}/programs`, { headers });
          const progs = await res.json();
          return { ...u, programs: Array.isArray(progs) ? progs : [], expanded: false };
        })
      );
      setUsers(usersWithPrograms);
      setAllPrograms(allProgs);
    } catch {}
    setLoading(false);
  }

  const toggleExpand = (userId: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, expanded: !u.expanded } : u));
  };

  const openCreate = () => {
    setFormName(''); setFormEmail(''); setFormError('');
    setModal({ type: 'create' });
  };

  const openEdit = (u: UserRow) => {
    setFormName(u.name); setFormEmail(u.email); setFormError('');
    setModal({ type: 'edit', user: u });
  };

  const openDelete = (u: UserRow) => {
    setFormError('');
    setModal({ type: 'delete', user: u });
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formEmail.trim()) { setFormError('Nombre y email son obligatorios'); return; }
    setSaving(true); setFormError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName, email: formEmail }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? 'Error al crear usuario'); return; }
    setModal(null);
    loadData();
  };

  const handleEdit = async () => {
    if (modal?.type !== 'edit') return;
    if (!formName.trim() || !formEmail.trim()) { setFormError('Nombre y email son obligatorios'); return; }
    setSaving(true); setFormError('');
    const res = await fetch(`/api/admin/users/${modal.user.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName, email: formEmail }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? 'Error al guardar'); return; }
    setUsers(prev => prev.map(u => u.id === modal.user.id ? { ...u, name: data.name, email: data.email } : u));
    setModal(null);
  };

  const handleDelete = async () => {
    if (modal?.type !== 'delete') return;
    setSaving(true);
    const res = await fetch(`/api/admin/users/${modal.user.id}`, {
      method: 'DELETE',
      headers,
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setFormError(d.error ?? 'Error al eliminar'); return; }
    setUsers(prev => prev.filter(u => u.id !== modal.user.id));
    setModal(null);
  };

  const handleRoleChange = async (userId: number, role: 'admin' | 'user') => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
  };

  const handleStatusChange = async (userId: number, status: 'active' | 'rejected') => {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      if (status === 'rejected') {
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
      }
    }
  };

  const handleProgramToggle = async (userId: number, programId: number, checked: boolean) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    const currentIds = targetUser.programs.map(p => p.id);
    let newIds = checked ? [...currentIds, programId] : currentIds.filter(id => id !== programId);
    if (!checked && currentIds.length <= 1) {
      if (!window.confirm('¿Seguro que quieres quitar el último programa de este usuario?')) return;
    }
    const newPrograms = allPrograms.filter(p => newIds.includes(p.id));
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, programs: newPrograms } : u));
    await fetch(`/api/admin/users/${userId}/programs`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ programIds: newIds }),
    });
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', padding: '1.5rem 1.25rem' }}>
      <div style={{ position: 'fixed', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '48rem', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => router.push('/programs')}
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Volver
          </button>
          <h1 className="heading-display" style={{ fontSize: '1.5rem', margin: 0 }}>Admin</h1>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Cargando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: 0 }}>
                Usuarios
              </p>
              <button
                onClick={openCreate}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}
              >
                <UserPlus size={14} />
                Nuevo usuario
              </button>
            </div>
            {/* Pending users */}
            {users.filter(u => u.status === 'pending').length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Pendientes de aprobación ({users.filter(u => u.status === 'pending').length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {users.filter(u => u.status === 'pending').map(u => (
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
                      <button
                        onClick={() => handleStatusChange(u.id, 'active')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', background: '#166534', border: '1px solid #22c55e', borderRadius: 'var(--radius-md)', color: '#dcfce7', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}
                      >
                        <UserCheck size={14} /> Aceptar
                      </button>
                      <button
                        onClick={() => handleStatusChange(u.id, 'rejected')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', color: '#fee2e2', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}
                      >
                        <UserX size={14} /> Rechazar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active users */}
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Usuarios activos ({users.filter(u => u.status !== 'pending').length})
            </p>
            {users.filter(u => u.status !== 'pending').map(u => (
              <div key={u.id} style={{ background: 'rgba(10, 25, 10, 0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
                {/* User row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                  </div>

                  {/* Role selector */}
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value as 'admin' | 'user')}
                    style={{ background: 'var(--bg-secondary, #1a1a2e)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.8rem', padding: '0.25rem 0.5rem', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(u)}
                    style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => openDelete(u)}
                    style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Expand programs */}
                  <button
                    onClick={() => toggleExpand(u.id)}
                    style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                    title="Programas"
                  >
                    {u.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Programs (collapsible) */}
                {u.expanded && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.875rem 1.25rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', marginTop: 0 }}>Programas asignados:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {allPrograms.map(program => {
                        const assigned = u.programs.some(p => p.id === program.id);
                        return (
                          <label key={program.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
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
                )}
              </div>
            ))}
            {/* Maintenance section */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
                Mantenimiento
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={handleBackup}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', fontSize: '0.9rem', fontWeight: 700, width: '100%' }}
                >
                  <Download size={18} />
                  Descargar copia de seguridad
                </button>
                <label
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', fontSize: '0.9rem', fontWeight: 700, width: '100%', background: 'transparent', border: '2px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: restoring ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: restoring ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
                >
                  <Download size={18} style={{ transform: 'rotate(180deg)' }} />
                  {restoring ? 'Restaurando...' : 'Restaurar desde copia de seguridad'}
                  <input type="file" accept=".db" onChange={handleRestore} disabled={restoring} style={{ display: 'none' }} />
                </label>
                {restoreError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>{restoreError}</p>}
              </div>
            </div>

            {/* Exercises section */}
            <AdminExercises headers={headers} />

          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '24rem', background: 'var(--bg-secondary)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {modal.type === 'delete' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Eliminar usuario</h2>
                  <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={20} /></button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                  ¿Seguro que quieres eliminar a <strong style={{ color: 'var(--text-primary)' }}>{modal.user.name}</strong>? Esta acción no se puede deshacer.
                </p>
                {formError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>{formError}</p>}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem' }}>
                    Cancelar
                  </button>
                  <button onClick={handleDelete} disabled={saving} style={{ flex: 1, padding: '0.75rem', background: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <Trash2 size={15} />
                    {saving ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
                    {modal.type === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
                  </h2>
                  <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={20} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nombre</label>
                    <input
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Nombre completo"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      style={inputStyle}
                    />
                  </div>
                </div>
                {formError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>{formError}</p>}
                <button
                  onClick={modal.type === 'create' ? handleCreate : handleEdit}
                  disabled={saving}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  <Check size={16} />
                  {saving ? 'Guardando...' : modal.type === 'create' ? 'Crear usuario' : 'Guardar cambios'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
