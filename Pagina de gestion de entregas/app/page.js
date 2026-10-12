"use client";

import { useState, useCallback } from "react";
import FiltroFecha from "../components/FiltroFecha";
import TarjetaCliente from "../components/TarjetaCliente";

export default function Home() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState("todos");
  const [clientes, setClientes] = useState([]);
  const [despachados, setDespachados] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargarPedidos = useCallback(async () => {
    if (!fechaInicio || !fechaFin) {
      setClientes([]);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        inicio: fechaInicio,
        fin: fechaFin,
        tipo: tipoEntrega,
      });
      const res = await fetch(`/api/pedidos?${params}`);
      if (!res.ok) throw new Error("Error al cargar pedidos");
      const data = await res.json();
      setClientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [fechaInicio, fechaFin, tipoEntrega]);

  function handleInicioChange(valor) {
    setFechaInicio(valor);
    if (valor && fechaFin) cargarPedidos();
  }

  function handleFinChange(valor) {
    setFechaFin(valor);
    if (fechaInicio && valor) cargarPedidos();
  }

  function handleTipoChange(tipo) {
    setTipoEntrega(tipo);
    if (fechaInicio && fechaFin) cargarPedidos();
  }

  function toggleDespachado(llave) {
    setDespachados((prev) => ({
      ...prev,
      [llave]: !prev[llave],
    }));
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Despacho de Pedidos
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <FiltroFecha
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            onInicioChange={handleInicioChange}
            onFinChange={handleFinChange}
            tipoEntrega={tipoEntrega}
            onTipoChange={handleTipoChange}
          />
        </div>

        {cargando && (
          <p className="text-gray-500 text-center py-10">Cargando pedidos...</p>
        )}

        {error && (
          <p className="text-red-500 text-center py-10">{error}</p>
        )}

        {!cargando && !error && clientes.length === 0 && fechaInicio && fechaFin && (
          <p className="text-gray-500 text-center py-10">
            No hay pedidos en este rango.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((cliente, idx) => {
            const llave = `${cliente.fecha}__${cliente.cliente}`;
            return (
              <TarjetaCliente
                key={llave}
                cliente={cliente}
                despachado={despachados[llave] || false}
                onToggle={() => toggleDespachado(llave)}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
