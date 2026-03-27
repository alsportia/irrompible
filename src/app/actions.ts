"use server"

import { DB } from "@/lib/db";

export async function createWorkoutLog(sessionId: number, userId: number, energyLabel: string) {
  const energy = await DB.get<{ energy_levels_id: number }>(
    "SELECT energy_levels_id FROM energy_levels WHERE label = ?", [energyLabel]
  );
  const res = await DB.run(
    "INSERT INTO workout_logs (sessions_id, users_id, energy_levels_id) VALUES (?, ?, ?)",
    [sessionId, userId, energy?.energy_levels_id ?? null]
  );
  return res.id;
}

export async function finishWorkoutLog(
  logId: number,
  durationSeconds: number,
  feelingScore: number,
  feelingLabel: string
) {
  const feeling = await DB.get<{ feeling_levels_id: number }>(
    "SELECT feeling_levels_id FROM feeling_levels WHERE label = ?", [feelingLabel]
  );
  await DB.run(
    "UPDATE workout_logs SET duration = ?, completed_at = datetime('now'), feeling_levels_id = ? WHERE workout_logs_id = ?",
    [durationSeconds, feeling?.feeling_levels_id ?? null, logId]
  );
}

export async function saveWorkoutSet(
  logId: number,
  exerciseId: number,
  setNumber: number,
  repsDone: number | null,
  weight: number | null,
  timeTaken: number
) {
  await DB.run(
    "INSERT INTO workout_sets (workout_logs_id, exercises_id, set_number, reps_done, weight, time_taken) VALUES (?, ?, ?, ?, ?, ?)",
    [logId, exerciseId, setNumber, repsDone, weight, timeTaken]
  );
}

export async function getLastWeight(userId: number, exerciseId: number): Promise<number> {
  const row = await DB.get<{ weight: number }>(
    `SELECT ws.weight FROM workout_sets ws
     JOIN workout_logs wl ON ws.workout_logs_id = wl.workout_logs_id
     WHERE wl.users_id = ? AND ws.exercises_id = ? AND ws.weight IS NOT NULL AND ws.weight > 0
     ORDER BY wl.created_at DESC, ws.workout_sets_id DESC
     LIMIT 1`,
    [userId, exerciseId]
  );
  return row?.weight ?? 0;
}

export async function getCompletedSessionIds(userId: number): Promise<number[]> {
  const rows = await DB.query<{ sessions_id: number }>(
    "SELECT DISTINCT sessions_id FROM workout_logs WHERE users_id = ? AND completed_at IS NOT NULL",
    [userId]
  );
  return rows.map(r => r.sessions_id);
}

export async function unmarkSessionCompleted(userId: number, sessionId: number): Promise<void> {
  await DB.run(
    "DELETE FROM workout_logs WHERE users_id = ? AND sessions_id = ?",
    [userId, sessionId]
  );
}

export async function getExerciseById(exId: number) {
  const [ex] = await DB.query<{
    exercises_id: number; name: string; video_url: string | null; video_url_yt: string | null;
    description: string | null; muscles: string | null; joints: string | null;
    easier_exercises_id: number | null; easier_name: string | null;
    harder_exercises_id: number | null; harder_name: string | null;
  }>(`
    SELECT e.exercises_id, e.name, e.video_url, e.video_url_yt, e.description, e.muscles, e.joints,
           e.easier_exercises_id, easy.name as easier_name,
           e.harder_exercises_id, hard.name as harder_name
    FROM exercises e
    LEFT JOIN exercises easy ON e.easier_exercises_id = easy.exercises_id
    LEFT JOIN exercises hard ON e.harder_exercises_id = hard.exercises_id
    WHERE e.exercises_id = ?
  `, [exId]);
  return ex ?? null;
}
