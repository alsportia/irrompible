"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { Download, AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminMaintenance() {
  const { user } = useUser();
  const router = useRouter();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStep, setResetStep] = useState<'idle' | 'confirm' | 'running' | 'done'>('idle');
  const [resetError, setResetError] = useState('');

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

  async function handleResetDb() {
    setResetStep('running');
    setResetError('');
    try {
      const res = await fetch('/api/admin/reset-db', { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) { setResetError(data.error ?? 'Error al reiniciar'); setResetStep('confirm'); return; }

      // Auto-download backup if available
      if (data.backupBase64 && data.backupFilename) {
        const bytes = Uint8Array.from(atob(data.backupBase64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = data.backupFilename; a.click();
        URL.revokeObjectURL(url);
      }

      setResetStep('done');
      setTimeout(() => { window.location.reload(); }, 2000);
    } catch { setResetError('Error de red'); setResetStep('confirm'); }
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
          <label className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', fontSize: '0.9rem', fontWeight: 700, width: '100%', cursor: restoring ? 'not-allowed' : 'pointer', opacity: restoring ? 0.6 : 1, boxSizing: 'border-box' as const }}>
            <Download size={18} style={{ transform: 'rotate(180deg)' }} />
            {restoring ? 'Restaurando...' : 'Restaurar desde copia de seguridad'}
            <input type="file" accept=".db" onChange={handleRestore} disabled={restoring} style={{ display: 'none' }} />
          </label>
          {restoreError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>{restoreError}</p>}
        </div>

        {/* Danger zone */}
        <div style={{ marginTop: '2rem', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(239,68,68,0.25)', backdropFilter: 'blur(12px)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#ef4444' }}>Zona de peligro</span>
          </div>
          <div style={{ padding: '1rem', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 1rem', lineHeight: 1.5 }}>
              Reinicia la base de datos al estado inicial del <code>seed.db</code>. Se perderán todos los usuarios, entrenamientos y datos registrados.
            </p>
            {resetStep === 'idle' && (
              <button
                onClick={() => setResetStep('confirm')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.875rem', background: 'transparent', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <RotateCcw size={16} /> Reiniciar base de datos
              </button>
            )}
            {resetStep === 'confirm' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.875rem', fontSize: '0.875rem', color: '#ef4444', lineHeight: 1.5 }}>
                  ⚠️ Se descargará automáticamente una copia de seguridad antes de reiniciar. Esta acción no se puede deshacer.
                </div>
                {resetError && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{resetError}</p>}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => { setResetStep('idle'); setResetError(''); }}
                    style={{ flex: 1, padding: '0.875rem', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                  <button onClick={handleResetDb}
                    style={{ flex: 1, padding: '0.875rem', background: '#ef4444', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Sí, reiniciar
                  </button>
                </div>
              </div>
            )}
            {resetStep === 'running' && (
              <div style={{ textAlign: 'center', padding: '0.875rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Creando backup y reiniciando...
              </div>
            )}
            {resetStep === 'done' && (
              <div style={{ textAlign: 'center', padding: '0.875rem', color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                ✓ Base de datos reiniciada. Recargando...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

