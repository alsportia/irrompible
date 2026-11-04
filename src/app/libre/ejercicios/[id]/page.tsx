import ExerciseDetail from "@/components/free/ExerciseDetail";

export default async function FreeExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExerciseDetail exerciseId={Number(id)} />;
}
