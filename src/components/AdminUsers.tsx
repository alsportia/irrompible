"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { UserPlus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import type { Program } from "@/types/index";

type UserRow = { id: number; name: string; email: string; role: 'admin' | 'user'; status: 'active' | 'pending' };
type UserWithPrograms = UserRow & { programs: Program[]; expanded: boolean };
type ModalState = { type: 'create' } | { type: 'edit'; user: UserRow } | { type: 'delete'; user: UserRow } | null;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.625rem 0.75rem', background: 'var(--bg-primary)',
  border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box',
};

export default function AdminUsers() {
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

  const headers = { 'x-user-id': String(user?.id ?? 0) };

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

  const toggleExpand = (userId: number) =>
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, expanded: !u.expanded } : u));

  const openCreate = () => { setFormName(''); setFormEmail(''); setFormError(''); setModal({ type: 'create' }); };
  const openEdit = (u: UserRow) => { setFormName(u.name); setFormEmail(u.email); setFormError(''); setModal({ type: 'edit', user: u }); };
  const openDelete = (u: UserRow) => { setFormError(''); setModal({ type: 'delete', user: u }); };

  const handleCreate = async () => {
    if (!formName.trim() || !formEmail.trim()) { setFormError('Nombre y email son obligatorios'); return; }
    setSaving(true); setFormError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName, email: formEmail }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? 'Error al crear usuario'); return; }
    setModal(null); loadData();
  };

  const handleEdit = async () => {
    if (modal?.type !== 'edit') return;
    if (!formName.trim() || !formEmail.trim()) { setFormError('Nombre y email son obligatorios'); return; }
    setSaving(true); setFormError('');
    const res = await fetch(`/api/admin/users/${modal.user.id}`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
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
    const res = await fetch(`/api/admin/users/${modal.user.id}`, { method: 'DELETE', headers });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setFormError(d.error ?? 'Error al eliminar'); return; }
    setUsers(prev => prev.filter(u => u.id !== modal.user.id));
    setModal(null);
  };

  const handleRoleChange = async (userId: number, role: 'admin' | 'user') => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
  };

  const handleProgramToggle = async (userId: number, programId: number, checked: boolean) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    const currentIds = targetUser.programs.map(p => p.id);
    let newIds = checked ? [...currentIds, programId] : currentIds.filter(id => id !== programId);
    if (!checked && currentIds.length <= 1) {
      if (!window.confirm('¿Seguro que quieres quitar el último programa de este usuario?')) return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, programs: allPrograms.filter(p => newIds.includes(p.id)) } : u));
    await fetch(`/api/admin/users/${userId}/programs`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ programIds: newIds }),
    });
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', padding: '1.5rem 1.25rem' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => router.push('/admin')}
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Volver
          </button>
          <h1 className="heading-display" style={{ fontSize: '1.5rem', margin: 0 }}>Gestión de Usuarios</h1>
        </div>

        {loading ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Cargando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: 0 }}>
                Usuarios activos ({users.filter(u => u.status !== 'pending').length})
              </p>
              <button onClick={openCreate} className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}>
                <UserPlus size={14} /> Nuevo usuario
              </button>
            </div>

            {users.filter(u => u.status !== 'pending').map(u => (
              <div key={u.id} style={{ background: 'rgba(10, 25, 10, 0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', flexWrap: 'wrap' as const }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                  </div>
                  <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value as 'admin' | 'user')}
                    style={{ background: 'var(--bg-secondary, #1a1a2e)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.8rem', padding: '0.25rem 0.5rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <button onClick={() => openEdit(u)} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }} title="Editar"><Pencil size={16} /></button>
                  <button onClick={() => openDelete(u)} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }} title="Eliminar"><Trash2 size={16} /></button>
                  <button onClick={() => toggleExpand(u.id)} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                    {u.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {u.expanded && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.875rem 1.25rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', marginTop: 0 }}>Programas asignados:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.5rem' }}>
                      {allPrograms.map(program => (
                        <label key={program.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          <input type="checkbox" checked={u.programs.some(p => p.id === program.id)}
                            onChange={e => handleProgramToggle(u.id, program.id, e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
                          {program.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '24rem', background: 'var(--bg-secondary)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {modal.type === 'delete' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Eliminar usuario</h2>
                  <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={20} /></button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                  ¿Seguro que quieres eliminar a <strong style={{ color: 'var(--text-primary)' }}>{modal.user.name}</strong>?
                </p>
                {formError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>{formError}</p>}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem' }}>Cancelar</button>
                  <button onClick={handleDelete} disabled={saving} style={{ flex: 1, padding: '0.75rem', background: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <Trash2 size={15} />{saving ? 'Eliminando...' : 'Eliminar'}
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
                    <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre completo" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Email</label>
                    <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="correo@ejemplo.com" style={inputStyle} />
                  </div>
                </div>
                {formError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>{formError}</p>}
                <button onClick={modal.type === 'create' ? handleCreate : handleEdit} disabled={saving} className="btn-primary"
                  style={{ width: '100%', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>
                  <Check size={16} />{saving ? 'Guardando...' : modal.type === 'create' ? 'Crear usuario' : 'Guardar cambios'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
