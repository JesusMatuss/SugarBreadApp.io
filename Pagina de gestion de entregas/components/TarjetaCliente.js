"use client";

export default function TarjetaCliente({ cliente, despachado, onToggle }) {

  return (
    <div
      className={`rounded-xl shadow-md p-5 transition-colors duration-300 ${
        despachado ? "bg-green-50 border-2 border-green-300" : "bg-white border border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{cliente.cliente}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            <i className="fas fa-phone mr-1"></i>{cliente.telefono || "Sin teléfono"}
          </p>
          <p className="text-sm text-gray-500">
            <i className="fas fa-calendar mr-1"></i>{cliente.fecha}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={despachado}
            onChange={onToggle}
            className="w-5 h-5 accent-green-600"
          />
          <span className="text-sm font-medium text-gray-600">
            {despachado ? "Despachado" : "Pendiente"}
          </span>
        </label>
      </div>

      <ul className="space-y-2">
        {cliente.items.map((item, idx) => (
          <li
            key={idx}
            className="flex items-center justify-between text-sm border-b border-dashed border-gray-200 pb-2 last:border-0"
          >
            <div>
              <span className="font-semibold text-gray-700">{item.producto}</span>
              <span className="text-gray-500 ml-2">({item.detalle})</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                x{item.cantidad}
              </span>
              <span className="block text-xs text-green-600 font-semibold">
                ${item.precio.toFixed(2)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
        <span className="text-sm font-bold text-gray-700">Total:</span>
        <span className="text-lg font-black text-green-700">
          ${cliente.items.reduce((sum, item) => sum + item.precio, 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
