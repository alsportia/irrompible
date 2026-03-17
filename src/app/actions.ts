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
