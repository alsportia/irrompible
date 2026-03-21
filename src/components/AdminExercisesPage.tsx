"use client"

import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import AdminExercises from "./AdminExercises";

export default function AdminExercisesPage() {
  const { user } = useUser();
  const router = useRouter();
  const headers = { 'x-user-id': String(user?.id ?? 0) };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', padding: '1.5rem 1.25rem' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => router.push('/admin')}
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Volver
          </button>
          <h1 className="heading-display" style={{ fontSize: '1.5rem', margin: 0 }}>Gestión de Ejercicios</h1>
        </div>
        <AdminExercises headers={headers} />
      </div>
    </div>
  );
}
