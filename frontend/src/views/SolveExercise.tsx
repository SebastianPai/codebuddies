"use client";

import { useEffect, useState } from "react";
import {
  Code,
  Play,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import Editor from "react-simple-code-editor";

export default function SolveExercise({ courseType = "python" }) {
  const [code, setCode] = useState("/* Escribe tu código aquí ❤️ */\n\n");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [checkResult, setCheckResult] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");

  useEffect(() => {
    // Set default template and expected output based on courseType
    switch (courseType) {
      case "html":
        setCode("<!-- Escribe tu código HTML aquí -->\n\n");
        setExpectedAnswer("<h1>Hola mundo</h1>");
        break;
      case "css":
        setCode(
          "/* Escribe tu código CSS aquí */\n\nbody { background-color: lightblue; }"
        );
        setExpectedAnswer("body{background-color:lightblue;}");
        break;
      case "javascript":
        setCode(
          "// Escribe tu código JavaScript aquí\n\nconsole.log('Hola mundo');"
        );
        setExpectedAnswer("console.log('Hola mundo');");
        break;
      default:
        setCode("# Escribe tu código aquí ❤️\n\nprint('Hola mundo')");
        setExpectedAnswer("print('Hola mundo')");
    }
  }, [courseType]);

  const handleRunCode = () => {
    setTerminalOutput(">> Simulando ejecución del código...");
  };

  const handleCheckAnswer = () => {
    const cleanedUserCode = code.trim().replace(/\s+/g, "");
    const cleanedExpected = expectedAnswer.trim().replace(/\s+/g, "");

    if (cleanedUserCode === cleanedExpected) {
      setCheckResult("✅ ¡Respuesta correcta!");
    } else {
      setCheckResult("❌ Intenta de nuevo. Revisa tu sintaxis.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f1729] text-white">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-medium">
          Ejercicio - {courseType.toUpperCase()}
        </h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-800">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold mb-4">01. Hola Mundo</h2>

            <div className="flex items-center mb-4">
              <span className="text-blue-400 mr-2">#</span>
              <h3 className="text-2xl font-bold">{courseType.toUpperCase()}</h3>
            </div>

            <p className="text-lg">
              {courseType === "html" && (
                <>
                  Escribe un documento HTML que muestre un mensaje:
                  <br />
                  <code className="bg-black px-2 py-1 rounded mt-2 block text-green-400">
                    &lt;h1&gt;Hola mundo&lt;/h1&gt;
                  </code>
                </>
              )}
              {courseType === "css" && (
                <>
                  Aplica un fondo azul claro al <code>body</code>:<br />
                  <code className="bg-black px-2 py-1 rounded mt-2 block text-green-400">
                    body &#123; background-color: lightblue; &#125;
                  </code>
                </>
              )}
              {courseType === "javascript" && (
                <>
                  Haz un <code>console.log</code> con el mensaje:
                  <br />
                  <code className="bg-black px-2 py-1 rounded mt-2 block text-green-400">
                    console.log('Hola mundo')
                  </code>
                </>
              )}
              {courseType === "python" && (
                <>
                  Escribe un programa en Python que muestre:
                  <br />
                  <code className="bg-black px-2 py-1 rounded mt-2 block text-green-400">
                    print('Hola mundo')
                  </code>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="flex items-center p-2 bg-[#1a1a2e] border-b border-gray-800">
            <div className="flex items-center space-x-2 px-2">
              <Code size={16} />
              <span>
                {courseType === "css"
                  ? "style.css"
                  : courseType === "html"
                  ? "index.html"
                  : courseType === "javascript"
                  ? "script.js"
                  : "script.py"}
              </span>
            </div>
          </div>

          <div className="flex-1 bg-[#0d1117] overflow-hidden p-4">
            <Editor
              value={code}
              onValueChange={setCode}
              highlight={(code) => (
                <Highlight
                  theme={themes.vsDark}
                  code={code}
                  language={courseType === "javascript" ? "js" : courseType}
                >
                  {({
                    className,
                    style,
                    tokens,
                    getLineProps,
                    getTokenProps,
                  }) => (
                    <pre className={className} style={style}>
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line, key: i })}>
                          {line.map((token, key) => (
                            <span
                              key={key}
                              {...getTokenProps({ token, key })}
                            />
                          ))}
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              )}
              padding={16}
              className="font-mono text-sm bg-[#0d1117] text-white rounded-lg h-full outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-2 bg-[#1a1a2e] border-t border-gray-800">
            <button
              onClick={handleRunCode}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded flex items-center space-x-2"
            >
              <Play size={16} />
              <span>Run</span>
            </button>

            <div className="flex space-x-2 text-gray-400">
              <Terminal size={16} />
            </div>
          </div>

          <div className="h-1/3 bg-[#0d1117] border-t border-gray-800 flex flex-col">
            <div className="p-2 bg-[#1a1a2e] border-b border-gray-800">
              <h3>Terminal</h3>
            </div>
            <div className="flex-1 p-4 font-mono text-sm overflow-auto">
              {terminalOutput || ">"}
              {checkResult && <div className="mt-2">{checkResult}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-800 flex justify-center items-center space-x-3">
        <button className="border border-gray-700 px-4 py-2 rounded flex items-center space-x-2">
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        <button
          onClick={handleCheckAnswer}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
        >
          Comprobar respuesta
        </button>

        <button className="border border-gray-700 px-4 py-2 rounded flex items-center space-x-2">
          <span>Próximo</span>
          <ChevronRight size={16} />
        </button>

        <button className="ml-2 text-gray-400 hover:text-white">
          <Info size={16} />
        </button>
      </div>
    </div>
  );
}
