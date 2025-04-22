"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Trash2, Plus, Save, BookOpen, RefreshCw } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Module {
  _id?: string;
  title: string;
  description: string;
  type: string;
}

// Reusable ModuleCard component
const ModuleCard = ({
  module,
  onUpdate,
  onDelete,
  onNavigateToCourses,
  isLoading,
}: {
  module: Module;
  onUpdate: (module: Module) => void;
  onDelete: (id?: string) => void;
  onNavigateToCourses: (id?: string) => void;
  isLoading: boolean;
}) => {
  const [localModule, setLocalModule] = useState(module);

  return (
    <article
      className="p-4 bg-gray-800 rounded-xl border border-gray-700 space-y-4"
      aria-labelledby={`module-title-${module._id}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label
            htmlFor={`title-${module._id}`}
            className="text-sm text-gray-400"
          >
            Título
          </label>
          <input
            id={`title-${module._id}`}
            type="text"
            value={localModule.title}
            onChange={(e) =>
              setLocalModule({ ...localModule, title: e.target.value })
            }
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Título del módulo"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`description-${module._id}`}
            className="text-sm text-gray-400"
          >
            Descripción
          </label>
          <input
            id={`description-${module._id}`}
            type="text"
            value={localModule.description}
            onChange={(e) =>
              setLocalModule({ ...localModule, description: e.target.value })
            }
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Descripción del módulo"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`type-${module._id}`}
            className="text-sm text-gray-400"
          >
            Tipo
          </label>
          <input
            id={`type-${module._id}`}
            type="text"
            value={localModule.type}
            onChange={(e) =>
              setLocalModule({ ...localModule, type: e.target.value })
            }
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Tipo del módulo"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
        <button
          onClick={() => onUpdate(localModule)}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Guardar cambios para el módulo ${localModule.title}`}
        >
          <Save className="w-4 h-4 mr-2" />
          Guardar
        </button>
        <button
          onClick={() => onDelete(module._id)}
          disabled={isLoading}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Eliminar módulo ${localModule.title}`}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </button>
        <button
          onClick={() => onNavigateToCourses(module._id)}
          disabled={isLoading}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Ver cursos del módulo ${localModule.title}`}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Ver Cursos
        </button>
      </div>
    </article>
  );
};

export default function AdminModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [newModule, setNewModule] = useState<Module>({
    title: "",
    description: "",
    type: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Track loading per module

  const fetchModules = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get("http://localhost:5000/api/modules");
      setModules(res.data);
    } catch (err) {
      toast.error("Error al obtener módulos. Intenta de nuevo.");
      console.error("Error al obtener módulos:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleCreate = async () => {
    if (!newModule.title || !newModule.description || !newModule.type) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }
    try {
      setIsLoading(true);
      await axios.post("http://localhost:5000/api/modules", newModule);
      toast.success("Módulo creado exitosamente.");
      setNewModule({ title: "", description: "", type: "" });
      fetchModules();
    } catch (err) {
      toast.error("Error al crear módulo. Intenta de nuevo.");
      console.error("Error al crear módulo:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (module: Module) => {
    if (!module._id) return;
    try {
      setActionLoading(module._id);
      await axios.put(
        `http://localhost:5000/api/modules/${module._id}`,
        module
      );
      toast.success("Módulo actualizado exitosamente.");
      fetchModules();
    } catch (err) {
      toast.error("Error al actualizar módulo. Intenta de nuevo.");
      console.error("Error al actualizar módulo:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("¿Estás seguro de que deseas eliminar este módulo?")) {
      return;
    }
    try {
      setActionLoading(id);
      await axios.delete(`http://localhost:5000/api/modules/${id}`);
      toast.success("Módulo eliminado exitosamente.");
      fetchModules();
    } catch (err) {
      toast.error("Error al eliminar módulo. Intenta de nuevo.");
      console.error("Error al eliminar módulo:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const navigateToCourses = (moduleId?: string) => {
    if (moduleId) {
      window.location.href = `/admin/modules/${moduleId}/courses`;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-xl font-bold">Gestión de Módulos</h1>
        <button
          onClick={fetchModules}
          disabled={isLoading}
          className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refrescar módulos"
          aria-label="Refrescar módulos"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Form for creating new module */}
        <section className="mb-6 bg-gray-800 p-4 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Crear Nuevo Módulo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="new-module-title"
                className="text-sm text-gray-400"
              >
                Título
              </label>
              <input
                id="new-module-title"
                type="text"
                placeholder="Título del Módulo"
                value={newModule.title}
                onChange={(e) =>
                  setNewModule({ ...newModule, title: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Título del nuevo módulo"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="new-module-description"
                className="text-sm text-gray-400"
              >
                Descripción
              </label>
              <input
                id="new-module-description"
                type="text"
                placeholder="Descripción"
                value={newModule.description}
                onChange={(e) =>
                  setNewModule({ ...newModule, description: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Descripción del nuevo módulo"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="new-module-type"
                className="text-sm text-gray-400"
              >
                Tipo
              </label>
              <input
                id="new-module-type"
                type="text"
                placeholder="Tipo"
                value={newModule.type}
                onChange={(e) =>
                  setNewModule({ ...newModule, type: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Tipo del nuevo módulo"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Crear nuevo módulo"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Módulo
              </button>
            </div>
          </div>
        </section>

        {/* List of modules */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Módulos Existentes</h2>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"
                aria-label="Cargando módulos"
              ></div>
            </div>
          ) : modules.length > 0 ? (
            <div className="space-y-4">
              {modules.map((mod) => (
                <ModuleCard
                  key={mod._id}
                  module={mod}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onNavigateToCourses={navigateToCourses}
                  isLoading={actionLoading === mod._id}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-800 rounded-xl border border-gray-700">
              <p className="text-gray-400" aria-live="polite">
                No hay módulos creados todavía.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
