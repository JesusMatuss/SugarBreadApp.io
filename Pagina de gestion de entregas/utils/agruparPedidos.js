export function agruparPedidos(filas) {
  const mapa = filas.reduce((acc, fila) => {
    const fecha = fila[6];
    const nombre = fila[0];
    const telefono = fila[5];
    const producto = fila[1];
    const detalle = fila[2];
    const cantidad = fila[3];
    const precio = parseFloat(fila[4]) || 0;

    const llave = `${fecha}__${nombre}`;

    if (!acc[llave]) {
      acc[llave] = {
        fecha,
        cliente: nombre,
        telefono,
        items: [],
      };
    }

    acc[llave].items.push({
      producto,
      detalle,
      cantidad,
      precio,
    });

    return acc;
  }, {});

  return Object.values(mapa);
}
