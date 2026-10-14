"use client";

export default function CierreDelivery({ asignaciones }) {
  // Agrupa las asignaciones por repartidor y suma los costos.
  const resumen = Object.values(asignaciones || {}).reduce((acc, a) => {
    const repartidor = a?.repartidor;
    if (!repartidor || repartidor === "Sin asignar") return acc;
    acc[repartidor] = (acc[repartidor] || 0) + (parseFloat(a.costo) || 0);
    return acc;
  }, {});

  const totalGeneral = Object.values(resumen).reduce(
    (sum, val) => sum + val,
    0
  );

  return (
    <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800">
          Cierre de Delivery
        </h2>
        {Object.keys(resumen).length > 0 && (
          <div className="text-right">
            <span className="block text-xs uppercase tracking-wide text-gray-500">
              Total General a Pagar en Delivery
            </span>
            <span className="text-2xl font-black text-gray-900">
              ${totalGeneral.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {Object.keys(resumen).length === 0 ? (
        <p className="text-sm text-gray-400">
          Sin asignaciones de delivery todavía.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {Object.entries(resumen).map(([repartidor, total]) => (
            <div
              key={repartidor}
              className="bg-blue-50 border border-blue-100 text-blue-800 px-4 py-2 rounded-lg font-medium flex justify-between w-48"
            >
              <span>{repartidor}</span>
              <span className="font-bold">${total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
