"use server"

import { DB } from "@/lib/db";

export async function createWorkoutLog(sessionId: string) {
  // We'll create a workout_log and return its ID
  const res = await DB.run(
    "INSERT INTO workout_logs (session_id) VALUES (?)",
    [sessionId]
  );
  return res.id;
}

export async function finishWorkoutLog(logId: number, durationSeconds: number) {
  await DB.run(
    "UPDATE workout_logs SET duration = ? WHERE id = ?",
    [durationSeconds, logId]
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
