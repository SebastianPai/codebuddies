"use client";

export default function ModuleCard({
  title,
  description,
  image,
  level,
  courseNumber,
  onClick,
}) {
  return (
    <div
      className="bg-[#0f1424] border border-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
      onClick={onClick}
    >
      <div className="h-48 overflow-hidden">
        <img
          src={image || "/placeholder.svg?height=200&width=400"}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-5">
        {courseNumber && (
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
            Curso {courseNumber}
          </div>
        )}
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-3">{description}</p>
        {level && (
          <div className="flex items-center">
            <div className="bg-gray-800 rounded-full px-3 py-1 text-xs flex items-center">
              <span className="mr-1">•</span>
              <span className="uppercase">{level}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
