"use server"

import { DB } from "@/lib/db";

export async function createWorkoutLog(sessionId: number, userId: number, energyLabel: string) {
  // Resolve energy_level_id from label
  const energy = await DB.get<{ id: number }>(
    "SELECT id FROM energy_levels WHERE label = ?", [energyLabel]
  );
  const res = await DB.run(
    "INSERT INTO workout_logs (session_id, user_id, energy_level_id) VALUES (?, ?, ?)",
    [sessionId, userId, energy?.id ?? null]
  );
  return res.id;
}

export async function finishWorkoutLog(
  logId: number,
  durationSeconds: number,
  feelingScore: number,
  feelingLabel: string
) {
  const feeling = await DB.get<{ id: number }>(
    "SELECT id FROM feeling_levels WHERE label = ?", [feelingLabel]
  );
  await DB.run(
    "UPDATE workout_logs SET duration = ?, completed_at = datetime('now'), feeling_level_id = ? WHERE id = ?",
    [durationSeconds, feeling?.id ?? null, logId]
  );
}

export async function saveWorkoutSet(
  logId: number,
  exerciseId: number,
  repsDone: number | null,
  weight: number | null,
  timeTaken: number
) {
  await DB.run(
    "INSERT INTO workout_sets (workout_log_id, exercise_id, reps_done, weight, time_taken) VALUES (?, ?, ?, ?, ?)",
    [logId, exerciseId, repsDone, weight, timeTaken]
  );
}

export async function getCompletedSessionIds(userId: number): Promise<number[]> {
  const rows = await DB.query<{ session_id: number }>(
    "SELECT DISTINCT session_id FROM workout_logs WHERE user_id = ? AND completed_at IS NOT NULL",
    [userId]
  );
  return rows.map(r => r.session_id);
}

export async function getExerciseById(exId: number) {
  const [ex] = await DB.query<{
    id: number; name: string; video_url: string | null; video_url_yt: string | null;
    description: string | null; muscles: string | null; joints: string | null;
    easier_id: number | null; easier_name: string | null;
    harder_id: number | null; harder_name: string | null;
  }>(`
    SELECT e.id, e.name, e.video_url, e.video_url_yt, e.description, e.muscles, e.joints,
           e.easier_id, easy.name as easier_name,
           e.harder_id, hard.name as harder_name
    FROM exercises e
    LEFT JOIN exercises easy ON e.easier_id = easy.id
    LEFT JOIN exercises hard ON e.harder_id = hard.id
    WHERE e.id = ?
  `, [exId]);
  return ex ?? null;
}
