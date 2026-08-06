"use client";

import { useParams } from "next/navigation";
import { LearningPathForm } from "../components/LearningPathForm";

export default function EditLearningPathPage() {
  const { id } = useParams<{ id: string }>();
  return <LearningPathForm pathId={id} />;
}
