"use client";

export default function FiltroFecha({ fechaInicio, fechaFin, onInicioChange, onFinChange, tipoEntrega, onTipoChange }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="fecha-inicio" className="text-sm font-semibold text-gray-700">
          Desde:
        </label>
        <input
          id="fecha-inicio"
          type="datetime-local"
          value={fechaInicio}
          onChange={(e) => onInicioChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="fecha-fin" className="text-sm font-semibold text-gray-700">
          Hasta:
        </label>
        <input
          id="fecha-fin"
          type="datetime-local"
          value={fechaFin}
          onChange={(e) => onFinChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onTipoChange("todos")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
            tipoEntrega === "todos"
              ? "bg-gray-800 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => onTipoChange("delivery")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
            tipoEntrega === "delivery"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-blue-50"
          }`}
        >
          Delivery
        </button>
        <button
          onClick={() => onTipoChange("sede")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
            tipoEntrega === "sede"
              ? "bg-amber-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-amber-50"
          }`}
        >
          Sede
        </button>
      </div>
    </div>
  );
}
