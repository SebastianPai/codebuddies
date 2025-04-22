"use client";

import { useState } from "react";
import { ChevronDown, Bell, User } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (menu: string) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  return (
    <nav className="bg-[#0a0e1a] text-white py-4 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-8">
        <Link to="/" className="flex items-center">
          <div className="bg-yellow-500 w-8 h-8 rounded-md flex items-center justify-center mr-2">
            <span className="font-bold text-black">C</span>
          </div>
          <span className="font-mono text-2xl font-bold">CODEBUDDIES</span>
          <span className="text-purple-500 text-sm ml-1">Altaquer</span>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          <div className="relative">
            <button
              className="flex items-center space-x-1 hover:text-purple-400 transition-colors"
              onClick={() => toggleDropdown("aprender")}
            >
              <span>Aprender</span>
              <ChevronDown size={16} />
            </button>
            {activeDropdown === "aprender" && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#151a2d] rounded-md shadow-lg z-10">
                <div className="py-1">
                  <Link
                    to="/python"
                    className="block px-4 py-2 hover:bg-[#1e2642]"
                  >
                    Python
                  </Link>
                  <Link
                    to="/javascript"
                    className="block px-4 py-2 hover:bg-[#1e2642]"
                  >
                    JavaScript
                  </Link>
                  <Link
                    to="/html-css"
                    className="block px-4 py-2 hover:bg-[#1e2642]"
                  >
                    HTML & CSS
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              className="flex items-center space-x-1 hover:text-purple-400 transition-colors"
              onClick={() => toggleDropdown("practica")}
            >
              <span>Práctica</span>
              <ChevronDown size={16} />
            </button>
            {activeDropdown === "practica" && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#151a2d] rounded-md shadow-lg z-10">
                <div className="py-1">
                  <Link
                    to="/ejercicios"
                    className="block px-4 py-2 hover:bg-[#1e2642]"
                  >
                    Ejercicios
                  </Link>
                  <Link
                    to="/desafios"
                    className="block px-4 py-2 hover:bg-[#1e2642]"
                  >
                    Desafíos
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/construir"
            className="hover:text-purple-400 transition-colors"
          >
            Construir
          </Link>

          <div className="relative">
            <button
              className="flex items-center space-x-1 hover:text-purple-400 transition-colors"
              onClick={() => toggleDropdown("comunidad")}
            >
              <span>Comunidad</span>
              <ChevronDown size={16} />
            </button>
            {activeDropdown === "comunidad" && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#151a2d] rounded-md shadow-lg z-10">
                <div className="py-1">
                  <Link
                    to="/foro"
                    className="block px-4 py-2 hover:bg-[#1e2642]"
                  >
                    Foro
                  </Link>
                  <Link
                    to="/eventos"
                    className="block px-4 py-2 hover:bg-[#1e2642]"
                  >
                    Eventos
                  </Link>
                  <Link
                    to="/discord"
                    className="block px-4 py-2 hover:bg-[#1e2642]"
                  >
                    Discord
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="hover:text-purple-400 transition-colors">
          <Bell size={20} />
        </button>
        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
          <User size={18} />
        </div>
      </div>
    </nav>
  );
}
