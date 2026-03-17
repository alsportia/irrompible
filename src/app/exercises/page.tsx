import { DB } from "@/lib/db";
import ExercisesClient from "@/components/ExercisesClient";

export const dynamic = "force-dynamic";

export interface ExerciseItem {
  ex_id: string;
  name: string;
  video_url: string | null;
  description: string | null;
  muscles: string | null;
  easier_id: string | null;
  easier_name: string | null;
  harder_id: string | null;
  harder_name: string | null;
}

export default async function ExercisesPage() {
  const exercises = await DB.query<ExerciseItem>(`
    SELECT e.ex_id, e.name, e.video_url, e.description, e.muscles,
           e.easier_id, easy.name as easier_name,
           e.harder_id, hard.name as harder_name
    FROM exercises e
    LEFT JOIN exercises easy ON e.easier_id = easy.ex_id
    LEFT JOIN exercises hard ON e.harder_id = hard.ex_id
    ORDER BY e.name COLLATE NOCASE ASC
  `);

  return <ExercisesClient exercises={exercises} />;
}
