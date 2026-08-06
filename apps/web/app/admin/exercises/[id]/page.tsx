"use client";

import { useParams } from "next/navigation";
import AdminExerciseNew from "../new/page";

export default function AdminExerciseEditPage() {
  const params = useParams();

  return <AdminExerciseNew exerciseId={params.id as string} />;
}
