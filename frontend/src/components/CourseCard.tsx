import React from "react";

interface Props {
  title: string;
  description: string;
  level: string;
  imageUrl?: string;
  onClick?: () => void;
}

export default function CourseCard({
  title,
  description,
  level,
  imageUrl = "/placeholder.svg?height=200&width=400",
  onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-yellow-400 transition-all duration-200"
    >
      <div className="h-48 relative overflow-hidden">
        <img
          src={imageUrl}
          alt={`Curso de ${title}`}
          width={400}
          height={200}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="text-gray-400 text-sm mb-1">{title.toUpperCase()}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        <div className="inline-flex items-center px-3 py-1 bg-gray-800 rounded-full text-xs">
          <span className="mr-2">•</span>
          {level.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
