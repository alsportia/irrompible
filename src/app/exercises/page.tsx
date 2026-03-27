import { DB } from "@/lib/db";
import ExercisesClient from "@/components/ExercisesClient";

export const dynamic = "force-dynamic";

export interface ExerciseItem {
  id: number;
  name: string;
  video_url: string | null;
  description: string | null;
  muscles: string | null;
  easier_id: number | null;
  easier_name: string | null;
  harder_id: number | null;
  harder_name: string | null;
}

export default async function ExercisesPage() {
  const exercises = await DB.query<ExerciseItem>(`
    SELECT e.exercises_id as id, e.name, e.video_url, e.description, e.muscles,
           e.easier_exercises_id as easier_id, easy.name as easier_name,
           e.harder_exercises_id as harder_id, hard.name as harder_name
    FROM exercises e
    LEFT JOIN exercises easy ON e.easier_exercises_id = easy.exercises_id
    LEFT JOIN exercises hard ON e.harder_exercises_id = hard.exercises_id
    ORDER BY e.name COLLATE NOCASE ASC
  `);
  return <ExercisesClient exercises={exercises} />;
}
