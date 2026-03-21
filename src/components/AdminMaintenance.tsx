"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { Download } from "lucide-react";

export default function AdminMaintenance() {
  const { user } = useUser();
  const router = useRouter();
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
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`¿Restaurar la base de datos desde "${file.name}"? La app se reiniciará.`)) { e.target.value = ''; return; }
    setRestoring(true); setRestoreError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/restore', { method: 'POST', headers, body: formData });
      if (!res.ok) { const { error } = await res.json(); setRestoreError(error ?? 'Error al restaurar'); }
      else { window.location.reload(); }
    } catch { setRestoreError('Error de red'); }
    finally { setRestoring(false); e.target.value = ''; }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', padding: '1.5rem 1.25rem' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => router.push('/admin')}
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Volver
          </button>
          <h1 className="heading-display" style={{ fontSize: '1.5rem', margin: 0 }}>Mantenimiento</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: '0 0 0.25rem' }}>
            Copia de seguridad
          </p>
          <button onClick={handleBackup} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', fontSize: '0.9rem', fontWeight: 700, width: '100%' }}>
            <Download size={18} /> Descargar copia de seguridad
          </button>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', fontSize: '0.9rem', fontWeight: 700, width: '100%', background: 'transparent', border: '2px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: restoring ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: restoring ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' as const }}>
            <Download size={18} style={{ transform: 'rotate(180deg)' }} />
            {restoring ? 'Restaurando...' : 'Restaurar desde copia de seguridad'}
            <input type="file" accept=".db" onChange={handleRestore} disabled={restoring} style={{ display: 'none' }} />
          </label>
          {restoreError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>{restoreError}</p>}
        </div>
      </div>
    </div>
  );
}
