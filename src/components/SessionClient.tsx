"use client"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Play, Check, X, Info, Shuffle } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { getExerciseById } from "@/app/actions";

interface ExerciseRow {
  block: string;
  block_type: string | null;
  set_number: number;
  ex_id: string;
  ex_order: number;
  tiempo_ej: string | null;
  reps: string | null;
  name: string;
  video_url: string | null;
  description: string | null;
  muscles: string | null;
  joints: string | null;
  easier_id: string | null;
  easier_name: string | null;
  harder_id: string | null;
  harder_name: string | null;
}

type ExerciseDetail = NonNullable<Awaited<ReturnType<typeof getExerciseById>>>;

interface BlockGroup {
  block: string;
  block_type: string | null;
  totalSets: number;
  exercises: ExerciseRow[];
}

interface SessionClientProps {
  sessionId: string;
  sessionName: string;
  sessionDescription: string;
  exercisesRaw: ExerciseRow[];
}

const ENERGY_LEVELS = [
  { label: '¡A tope!',    emoji: '🔥', pct: 1.00, color: '#10b981' },
  { label: 'Bien',        emoji: '💪', pct: 0.75, color: '#3b82f6' },
  { label: 'Cansado',     emoji: '😓', pct: 0.50, color: '#f59e0b' },
  { label: 'Muy Cansado', emoji: '😴', pct: 0.25, color: '#ef4444' },
] as const;
type EnergyLevel = typeof ENERGY_LEVELS[number];
