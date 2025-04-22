import { useEffect, useState, JSX } from "react";
import { useParams } from "react-router-dom";

interface Challenge {
  _id: string;
  title: string;
  description: string;
  starterCode: string;
  // Puedes agregar más campos si los usas en el futuro
}

export default function ChallengeView(): JSX.Element {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/challenges/lesson/${lessonId}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setChallenge(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar el reto.");
      }
    };

    if (lessonId) {
      fetchChallenge();
    }
  }, [lessonId]);

  if (error) {
    return <p className="text-red-500 text-center mt-4">{error}</p>;
  }

  if (!challenge) {
    return <p className="text-gray-500 text-center mt-4">Cargando reto...</p>;
  }

  return (
    <div className="min-h-screen bg-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-indigo-600 mb-4">
          {challenge.title}
        </h1>
        <p className="text-gray-700 mb-4">{challenge.description}</p>

        <div className="mb-6">
          <h2 className="font-semibold text-gray-800 mb-1">Código base:</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
            <code>{challenge.starterCode}</code>
          </pre>
        </div>

        <div>
          <h2 className="font-semibold text-gray-800 mb-2">
            Escribe tu solución:
          </h2>
          <textarea
            className="w-full p-3 border rounded min-h-[150px]"
            placeholder="Escribe tu solución aquí..."
          ></textarea>
        </div>
      </div>
    </div>
  );
}
