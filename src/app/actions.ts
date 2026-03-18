"use server"

import { DB } from "@/lib/db";

export async function createWorkoutLog(sessionId: string, userId: number, energyLabel: string) {
  const res = await DB.run(
    "INSERT INTO workout_logs (session_id, user_id, energy_label) VALUES (?, ?, ?)",
    [sessionId, userId, energyLabel]
  );
  return res.id;
}

export async function finishWorkoutLog(
  logId: number,
  durationSeconds: number,
  feelingScore: number,
  feelingLabel: string
) {
  await DB.run(
    "UPDATE workout_logs SET duration = ?, completed_at = datetime('now'), feeling_score = ?, feeling_label = ? WHERE id = ?",
    [durationSeconds, feelingScore, feelingLabel, logId]
  );
}

export async function saveWorkoutSet(
  logId: number,
  exerciseId: string,
  repsDone: number | null,
  weight: number | null,
  timeTaken: number
) {
  await DB.run(
    "INSERT INTO workout_sets (workout_log_id, exercise_id, reps_done, weight, time_taken) VALUES (?, ?, ?, ?, ?)",
    [logId, exerciseId, repsDone, weight, timeTaken]
  );
}

export async function getCompletedSessionIds(userId: number): Promise<string[]> {
  const rows = await DB.query<{ session_id: string }>(
    "SELECT DISTINCT session_id FROM workout_logs WHERE user_id = ? AND completed_at IS NOT NULL",
    [userId]
  );
  return rows.map(r => r.session_id);
}

export async function getExerciseById(exId: string) {
  const [ex] = await DB.query<{
    ex_id: string; name: string; video_url: string | null;
    description: string | null; muscles: string | null; joints: string | null;
    easier_id: string | null; easier_name: string | null;
    harder_id: string | null; harder_name: string | null;
  }>(`
    SELECT e.ex_id, e.name, e.video_url, e.description, e.muscles, e.joints,
           e.easier_id, easy.name as easier_name,
           e.harder_id, hard.name as harder_name
    FROM exercises e
    LEFT JOIN exercises easy ON e.easier_id = easy.ex_id
    LEFT JOIN exercises hard ON e.harder_id = hard.ex_id
    WHERE e.ex_id = ?
  `, [exId]);
  return ex ?? null;
}
