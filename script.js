

// ==========================================================================
// CONFIGURACIÓN Y SELECTORES
// ==========================================================================
const JSON_URL = './catalogo.json';
const contenedor = document.getElementById('catalogo');
const listaCarrito = document.getElementById('carrito-items'); // Corregido el ID según tu nuevo HTML
const totalPrecioElemento = document.getElementById('total-precio');
const cartCountElement = document.getElementById('cart-count');
const sidebarCarrito = document.getElementById('carrito-sidebar');
const SHEETDB_URL = 'https://script.google.com/macros/s/AKfycbys9AHsxXzAa1Qjr8Fu2W-IualLdQ6Bewf6ThXI5fTylPGyapMIvIxuI20xVupDmjCP/exec';
let enlaceGoogleMaps = ""; // Variable global para guardar el link de Google Maps generado

const inputNombre = document.getElementById('cliente-nombre');
const inputTelefono = document.getElementById('cliente-telefono');
const inputFecha = document.getElementById('fecha-entrega');
const btnPagar = document.querySelector('.btn-pagar');



let productosData = []; // Base de datos completa
let carritoArray = [];  // Arreglo para los items seleccionados
let categoriaActiva = 'todos'; // Categoría seleccionada actualmente


// --- PASO 1: CARGAR DATOS AL INICIAR ---
document.addEventListener('DOMContentLoaded', () => {
    const nombreGuardado = localStorage.getItem('sugarbread_nombre');
    const telefonoGuardado = localStorage.getItem('sugarbread_telefono');

    if (nombreGuardado) inputNombre.value = nombreGuardado;
    if (telefonoGuardado) inputTelefono.value = telefonoGuardado;
});

// --- PASO 2: GUARDAR DATOS ---
// Opción A: Guardar mientras escriben (más seguro)
inputNombre.addEventListener('input', () => {
    localStorage.setItem('sugarbread_nombre', inputNombre.value);
});

inputTelefono.addEventListener('input', () => {
    localStorage.setItem('sugarbread_telefono', inputTelefono.value);
});

// ==========================================================================
// 1. CARGA DE DATOS
// ==========================================================================
async function cargarProductos() {
    try {
        const respuesta = await fetch(JSON_URL);
        if (!respuesta.ok) throw new Error("No se pudo cargar el catálogo");
        
        productosData = await respuesta.json();
        mostrarProductos(productosData); // Carga inicial
    } catch (error) {
        console.error("Error:", error);
        contenedor.innerHTML = `
            <div class="error-msg">
                <p>Lo sentimos, hubo un problema al cargar los panes. Inténtalo más tarde.</p>
            </div>`;
    }
}

function panPapaDisponible() {
    const ahora = new Date();
    const hora = ahora.getHours();
    const dia = ahora.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab

    const DIAS_PERMITIDOS = [1, 2, 4, 5]; // Lun, Mar, Jue, Vie
    const CORTE_HORA = 9; // 9 AM cutoff

    // 1. Validar el horario diario (Tardes/Noches o Madrugadas)
    const enHorario = hora >= 13 || hora < 8;
    
    // 2. Validar si hoy es un día permitido para solicitar producción
    let diaPermitido = DIAS_PERMITIDOS.includes(dia);
    
    // EXCEPCIÓN: Si es miércoles (3) y ya pasó la hora de corte (9 AM), 
    // se permite porque entrará en la producción/entrega del Jueves (4)
    if (dia === 3 && hora >= CORTE_HORA) {
        diaPermitido = true;
    }

    // 3. Calcular el día real de entrega proyectado hacia el futuro
    const fechaEntrega = new Date(ahora);
    
    if (hora >= CORTE_HORA) {
        // Si ya pasó la hora de corte, la entrega se mueve al menos al día siguiente
        fechaEntrega.setDate(fechaEntrega.getDate() + 1);
    } else {
        // Si es antes de las 9 AM, se procesa para HOY mismo
        // (Mantiene la fecha actual)
    }

    // Si la entrega estimada cae un Miércoles (3) o Domingo (0) por el desfase, 
    // lo movemos un día más hacia adelante (al Jueves o Lunes respectivamente)
    if (fechaEntrega.getDay() === 3 || fechaEntrega.getDay() === 0) {
        fechaEntrega.setDate(fechaEntrega.getDate() + 1);
    }

    // 4. Verificar si el día final de entrega es un día de despacho permitido
    const entregaPermitida = DIAS_PERMITIDOS.includes(fechaEntrega.getDay());

    return { 
        disponible: enHorario && diaPermitido && entregaPermitida, 
        enHorario, 
        diaPermitido, 
        entregaPermitida,
        diaEntregaCalculado: fechaEntrega.getDay() // Útil para hacer debug
    };
}

// ==========================================================================
// 2. RENDERIZADO DE PRODUCTOS
// ==========================================================================
function mostrarProductos(productos) {
    contenedor.innerHTML = '';

    const { disponible: esHorarioPanPapa } = panPapaDisponible();

    let mensajeMostrado = false;

    productos.forEach(p => {

        if (p.categoria === "Pan de Papa" && !esHorarioPanPapa) {
            if (!mensajeMostrado) {
                const aviso = document.createElement('div');
                aviso.className = 'col-span-full bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl';
                aviso.innerHTML = `
                    <div class="flex items-center">
                        <i class="fas fa-info-circle text-amber-500 mr-3"></i>
                        <p class="text-amber-800 font-medium">
                            El <strong>Pan de Papa</strong> solo está disponible para pedidos los días <strong>Lunes, Martes, Jueves y Viernes</strong>, desde la 1:00 PM hasta las 8:00 AM del día siguiente. No se realizan pedidos si la entrega cae en Miércoles, Sábado o Domingo.
                        </p>
                    </div>
                `;
                contenedor.appendChild(aviso);
                mensajeMostrado = true;
            }
            return;
        }

        const card = document.createElement('article');
        card.className = 'bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between group';
        card.innerHTML = `
            <div class="relative overflow-hidden rounded-t-2xl cursor-zoom-in">
                <img src="imagenes/${p.id}.webp" 
                     onclick="expandirImagen(this.src)"
                     onerror="this.src='imagenes/placeholder-pan.jpg'" 
                     alt="${p.producto}" 
                     class="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500">
                <span class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-marron-oscuro text-[14px] px-2 py-1 rounded-full font-bold shadow-sm pointer-events-none">
                    ${p.unidades_pqte} unds
                </span>
            </div>
            <div class="p-4 flex flex-col justify-between flex-1">
                <div>
                    <h3 class="text-md font-bold text-gray-800">${p.producto} (${p.medida_cm} cm)</h3>
                    <p class="text-[12px] text-red-500 uppercase tracking-wider">${p.categoria} | ${p.peso_gr}gr</p>
                    <p class="text-[14px] text-gray-500 mt-1 font-medium">${p.topping}</p>
                    <p class="inline-block px-2 py-0.5 bg-amber-900/10 text-amber-900 text-[14px] mt-1 font-medium rounded-md backdrop-blur-[2px]">
                        ${p.especificacion}
                    </p>
                </div>
                
                <div class="mt-4 flex items-end justify-between">
                    <span class="text-xl font-black text-marron-oscuro">$${parseFloat(p.precio).toFixed(2)}</span>
                    <div class="flex items-center gap-2">
                        <div class="flex flex-col items-end">
                            <label for="cant-${p.id}" class="text-[10px] text-gray-400 font-bold uppercase mb-1">Cant. Paquetes</label>
                            <div class="flex gap-1">
                                <input type="number" id="cant-${p.id}" value="1" min="1" 
                                       class="w-12 text-xs border-none bg-crema rounded-md text-center font-bold outline-none py-1">
                                <button onclick="agregarAlCarrito('${p.id}', this)" 
                                        class="bg-marron-oscuro text-white p-2 rounded-lg hover:bg-negro-suave transition-all active:scale-90">
                                    <i class="fas fa-cart-plus text-sm"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}


// Función para manejar la expansión
function expandirImagen(src) {
    const modal = document.getElementById('modal-foto');
    const modalImg = document.getElementById('modal-img');
    modalImg.src = src;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden'; // Bloquea el scroll del fondo
}

function cerrarImagen() {
    const modal = document.getElementById('modal-foto');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = 'auto'; // Reactiva el scroll
}

// ==========================================================================
// 3. LÓGICA DEL CARRITO
// ==========================================================================


function mostrarNotificacion(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-marron-oscuro text-white px-6 py-3 rounded-full shadow-2xl z-[100] transition-all duration-300 transform translate-y-10 opacity-0 text-sm font-bold';
    toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i> ${mensaje}`;
    
    document.body.appendChild(toast);

    // Animación de entrada
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    // Desaparecer después de 2 segundos
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// 1. Función para agregar (con validación de ID)
function agregarAlCarrito(id, boton) {
    const producto = productosData.find(p => p.id === id);
    // Buscamos el input de cantidad específico para este producto
    const inputCantidad = document.getElementById(`cant-${id}`);
    const cantidad = parseInt(inputCantidad.value);

    if (producto && cantidad > 0) {
        // Buscamos si el producto ya está en el carrito para sumar la cantidad
        const itemExistente = carritoArray.find(item => item.id === id);
        // Disparar la animación si el botón existe
        if (boton) {animarVueloCarrito(boton);}

        mostrarNotificacion(`${cantidad} pqte(s) de ${producto.producto} agregados`);

        

        const btnCarrito = document.getElementById('ver-carrito');
        btnCarrito.classList.add('shake-anim', 'bg-marron-claro');
        setTimeout(() => btnCarrito.classList.remove('shake-anim', 'bg-marron-claro'), 400);

        if (itemExistente) {
            itemExistente.cantidad += cantidad;
        } else {
            carritoArray.push({
                id: producto.id,
                categoria: producto.categoria,
                producto: producto.producto,
                peso: producto.peso_gr,
                medida_cm: producto.medida_cm,
                especificacion: producto.especificacion,
                precio: parseFloat(producto.precio),
                topping: producto.topping,
                cantidad: cantidad, // Guardamos la cantidad elegida
                unidades_por_paquete: parseInt(producto.unidades_pqte)
            });
        }
        
        actualizarCarritoUI();
        // Opcional: resetear el input a 0 después de agregar
        inputCantidad.value = 1;
    }
}

function actualizarCarritoUI() {
    const listaCarrito = document.getElementById('carrito-items');
    const totalPrecioElemento = document.getElementById('total-precio');
    const cartCountElement = document.getElementById('cart-count');

    listaCarrito.innerHTML = '';
    let totalAcumulado = 0;
    let itemsTotales = 0;

    carritoArray.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    const totalUnidades = item.cantidad * item.unidades_por_paquete;
    
    totalAcumulado += subtotal;
    itemsTotales += item.cantidad;

    const divItem = document.createElement('div');
    divItem.className = 'border-b border-gray-100 py-3';
    divItem.innerHTML = `
        <div class="flex flex-col gap-1">
            <div class="flex justify-between items-start">
                <p class="text-xs font-bold text-gray-800 leading-tight flex-.5">
                    ${item.producto} (${item.medida_cm} cm)  - <span class="text-gray-500 font-medium">${item.topping} (${item.especificacion})</span>
                </p>
                <button onclick="eliminarDelCarrito(${index})" class="text-gray-600 hover:text-red-600 ml-2">
                    <i class="fas fa-times text-[16px]"></i>
                </button>
            </div>
            
            <div class="flex items-center justify-between mt-1">
                <div class="flex items-center bg-gray-100 rounded-lg p-1">
                    <button onclick="restarCantidad(${index})" class="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-marron-claro hover:text-white transition-colors text-xs">-</button>
                    <span class="px-3 text-xs font-bold text-marron-oscuro">${item.cantidad}</span>
                    <button onclick="sumarCantidad(${index})" class="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-marron-claro hover:text-white transition-colors text-xs">+</button>
                    <span class="text-gray-500 font-medium">  Paquetes</span>
                </div>
                
                <div class="text-right">
                    <p class="text-[14px] font-bold text-marron-oscuro bg-marron-claro/10 px-2 py-0.5 rounded">
                        ${totalUnidades} unds. total
                    </p>
                    <p class="text-[12px] text-gray-500 mt-0.5">$${subtotal.toFixed(2)}</p>
                </div>
            </div>
        </div>
    `;
    listaCarrito.appendChild(divItem);
    const itemsContainer = document.getElementById('carrito-items');
    
});

    totalPrecioElemento.innerText = `$${totalAcumulado.toFixed(2)}`;
    cartCountElement.innerText = itemsTotales;
}

// Función para aumentar cantidad en el carrito
function sumarCantidad(index) {
    carritoArray[index].cantidad += 1;
    actualizarCarritoUI();
}

// Función para restar cantidad en el carrito
function restarCantidad(index) {
    if (carritoArray[index].cantidad > 1) {
        carritoArray[index].cantidad -= 1;
    } else {
        // Si es 1 y le dan a restar, lo eliminamos
        eliminarDelCarrito(index);
    }
    actualizarCarritoUI();
}


// 3. Función para eliminar
function eliminarDelCarrito(index) {
    carritoArray.splice(index, 1);
    actualizarCarritoUI();
}

// ==========================================================================
// 4. EVENTOS DE INTERFAZ (UI)
// ==========================================================================

// Filtrar por categorías
document.querySelectorAll('.btn-cat').forEach(boton => {
    boton.addEventListener('click', () => {
        document.querySelectorAll('.btn-cat').forEach(b => b.classList.remove('active'));
        boton.classList.add('active');

        const catSeleccionada = boton.getAttribute('data-cat');
        categoriaActiva = catSeleccionada;
        
        if (catSeleccionada === 'todos') {
            mostrarProductos(productosData);
        } else {
            // Filtramos comparando con p.categoria y p.especificacion
            const filtrados = productosData.filter(p => {
                if (catSeleccionada === 'hamb-con-molde') return p.categoria === 'Hamburguesa' && p.especificacion === 'Con Molde';
                if (catSeleccionada === 'hamb-sin-molde') return p.categoria === 'Hamburguesa' && p.especificacion === 'Sin Molde';
                if (catSeleccionada === 'perros') return p.categoria === 'Perro';
                if (catSeleccionada === 'delis') return p.categoria === 'Deli (Pepito)';
                if (catSeleccionada === 'sandwich') return p.categoria === 'Sándwich';
                if (catSeleccionada === 'pan-de-papa') return p.categoria === 'Pan de Papa';
                return false;
            });
            mostrarProductos(filtrados);
        }
    });
});

// Abrir carrito
document.getElementById('ver-carrito').addEventListener('click', () => {
    sidebarCarrito.classList.remove('translate-x-full'); // Tailwind slide in
    document.getElementById('cart-overlay').classList.remove('hidden');
});

// Cerrar carrito
const cerrar = () => {
    sidebarCarrito.classList.add('translate-x-full'); // Tailwind slide out
    document.getElementById('cart-overlay').classList.add('hidden');
};
document.getElementById('close-cart').addEventListener('click', cerrar);
document.getElementById('cart-overlay').addEventListener('click', cerrar);

// Control sheets

document.querySelector('.btn-pagar').addEventListener('click', async () => {
    if (carritoArray.length === 0) return alert("El carrito está vacío");
    if (!document.getElementById('cliente-nombre').value) return alert("Por favor, ingresa el nombre del cliente");
    if (!document.getElementById('cliente-telefono').value) return alert("Por favor, ingresa el número de teléfono del cliente");

    const btn = document.querySelector('.btn-pagar');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;

    const totalGlobal = totalPrecioElemento.innerText.replace('$', '');
    const fechaActual = new Date().toLocaleString('es-ES', { hour12: false });
    const telefono = document.getElementById('cliente-telefono').value.trim();

    const pedidosParaEnviar = carritoArray.map(p => ({
        "Cliente": document.getElementById('cliente-nombre').value || "Cliente Anónimo",
        "Numero_Telefono": telefono ? "+58" + telefono : "No proporcionado",
        "Producto": p.producto,
        "Especificacion": p.especificacion,
        "Peso": p.peso,
        "Topping": p.topping,
        "Cantidad": p.cantidad,
        "Subtotal": (p.precio * p.cantidad).toFixed(2),
        "Total_Pedido": totalGlobal,
        "Fecha": fechaActual,
        "Fecha_Entrega": (() => {
            const fechaElegida = document.getElementById('fecha-entrega').value;
            if (!fechaElegida) return "No especificada";
            const horaActual = new Date().toTimeString().split(' ')[0];
            return `${fechaElegida} ${horaActual}`;
        })(),
        "Delivery": document.getElementById('check-delivery').checked ? 'Sí - ' + document.getElementById('direccion-texto').value : 'No, retiro en local'
    }));

    const jsonData = JSON.stringify(pedidosParaEnviar);
    console.log('📤 Datos:', jsonData);

    let enviado = false;

    try {
        const params = new URLSearchParams();
        params.append('data', jsonData);
        await fetch(SHEETDB_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: params
        });
        enviado = true;
        console.log('✅ Enviado');
    } catch (e) {
        console.error('❌ Error al enviar:', e);
    }

    if (enviado) {
        const totalFinal = totalPrecioElemento.innerText.replace('$', '');
        const ordenFinal = [...carritoArray];

        alert("¡Pedido registrado con éxito!");
        mostrarResumenPedido(totalFinal, ordenFinal);

        actualizarCarritoUI();
        sidebarCarrito.classList.add('carrito-hidden');
    } else {
        alert("⚠️ Hubo un error al enviar el pedido a la base de datos. Intenta de nuevo o contacta al administrador.");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
});

// Bloquear fechas pasadas: antes de 9 AM se puede pedir para hoy, después de 9 AM para mañana
document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    if (hoy.getHours() >= 9) {
        hoy.setDate(hoy.getDate() + 1);
    }
    const fechaMin = [
        hoy.getFullYear(),
        String(hoy.getMonth() + 1).padStart(2, '0'),
        String(hoy.getDate()).padStart(2, '0')
    ].join('-');
    inputFecha.setAttribute('min', fechaMin);
    inputFecha.value = fechaMin;
});

// Función para mostrar el modal con los datos corregida
function mostrarResumenPedido(total, productos) {
    const contenedorResumen = document.getElementById('detalle-orden');
    const modal = document.getElementById('modal-resumen');
    const fechaEntrega = document.getElementById('fecha-entrega').value; // Capturar fecha
    
    const nroOrden = Math.floor(Math.random() * 100) + 1;
    
    let htmlProductos = `<h3 class="font-bold text-lg mb-2 text-marron-oscuro">Orden #${nroOrden}</h3>
                        <p class="text-xs text-marron-oscuro/70 mb-3">📅 Entrega: <strong>${fechaEntrega}</strong></p>`;
    
    productos.forEach(p => {
        htmlProductos += `
            <p class="mb-1"><strong>${p.cantidad}x</strong> ${p.producto} <span class="text-xs text-gray-500">(${p.topping}) (${p.especificacion})</span></p>`
        ;
    });
    
    // Simplificamos los botones del modal para que no choquen con el diseño
    htmlProductos += `
        <hr class="my-3 border-marron-claro">
        <p class="text-xl font-black text-black mb-4 text-center">Total: $${total}</p>
        <div class="flex gap-2">
            <button class="flex-1 bg-marron-claro text-white py-2 rounded-lg text-xs font-bold hover:bg-marron-oscuro transition-colors" onclick="descargarPDF()">
                <i class="fas fa-file-pdf"></i> PDF
            </button>
        </div>
    `;

    contenedorResumen.innerHTML = htmlProductos;
    
    // MANEJO DE CLASES TAILWIND (Sin usar .style.display)
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function descargarPDF() {
    const element = document.getElementById('detalle-orden');
    const opt = {
        margin:       1,
        filename:     'Pedido_Panaderia.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// Función para cerrar el modal corregida
function cerrarResumen() {
    const modal = document.getElementById('modal-resumen');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    
    alert("¡Se enviara su pedido por Whasssap!");
    enviarPedidoWhatsApp();
}


function enviarPedidoWhatsApp() {
    const nombre = document.getElementById('cliente-nombre').value || "Cliente";
    const telefonoCliente = document.getElementById('cliente-telefono').value || "No indicado";
    const fechaEntrega = document.getElementById('fecha-entrega').value || "No especificada";
    const numeroTienda = "584126030518"; 

    // CAPTURAR DATOS DE DELIVERY
    const quiereDelivery = document.getElementById('check-delivery').checked;
    const direccion = document.getElementById('direccion-texto').value;
    
    
    if (carritoArray.length === 0) return; 

    // Encabezado usando códigos Unicode para evitar errores de símbolos extraños ()
    // \uD83E\uDD56 = Pan (🥖)
    let mensaje = '*\uD83E\uDD56 NUEVO PEDIDO SUGARBREAD \uD83E\uDD56*\n';
    mensaje += '_¡Hola! Quisiera realizar el siguiente pedido:_\n\n';
    
    mensaje += '*DATOS DEL CLIENTE*\n';
    // \uD83D\uDC64 = Usuario (👤) | \uD83D\uDCDE = Teléfono (📞) | \uD83D\uDCC5 = Calendario (📅)
    mensaje += '\uD83D\uDC64 *Nombre:* ' + nombre + '\n';
    mensaje += '\uD83D\uDCDE *Teléfono:* ' + telefonoCliente + '\n';
    mensaje += '\uD83D\uDCC5 *Fecha de Entrega:* ' + fechaEntrega + '\n';
    mensaje += '-------------------------------------------\n\n';

    // SECCIÓN DE ENTREGA / DELIVERY
    // \uD83D\uDE1A = Moto (🛵) | \uD83C\uDFE2 = Edificio (🏢) | \uD83C\uDFEA = Tienda (🏪)
    if (quiereDelivery) {
        mensaje += '\uD83D\uDE1A *Tipo:* Servicio de Delivery\n';
    
        // Si tenemos enlace de GPS lo ponemos primero
    if (enlaceGoogleMaps !== "") {
        mensaje += '\uD83D\uDCCD *Link Maps:* ' + enlaceGoogleMaps + '\n';
    }
    
    // Si escribió algo en el cuadro de texto (puntos de referencia), lo añadimos
    const detallesExtras = document.getElementById('direccion-texto').value;
    if (detallesExtras) {
        mensaje += '\uD83C\uDFE2 *Referencia:* ' + detallesExtras + '\n';
    }
    } else {
    mensaje += '\uC3EA *Tipo:* Retiro en Local\n';
    }
    
    mensaje += '-------------------------------------------\n\n';

    mensaje += '*DETALLE DE LA ORDEN:*\n';

    let totalUnidadesPan = 0;

    carritoArray.forEach(p => {
        const totalU = p.cantidad * p.unidades_por_paquete;
        totalUnidadesPan += totalU;
        
        // \u2705 = Check verde (✅)
        mensaje += '\u2705 *' + p.cantidad + ' pqte(s)* - ' + p.producto + '\n';
        mensaje += '   • Topping: ' + p.topping + '\n';
        mensaje += '   • Unidades: ' + totalU + ' unds.\n\n';

        
    });

    const totalDinero = document.getElementById('total-precio').innerText;

    // Nota sobre el costo de envío
    if (quiereDelivery) {
        mensaje += '_* El costo del delivery se acordará por este chat._\n';
    }
    
    mensaje += '-------------------------------------------\n';
    // \uD83D\uDCE6 = Caja (📦) | \uD83D\uDCB0 = Bolsa dinero (💰)
    mensaje += '\uD83D\uDCE6 *TOTAL PANES:* ' + totalUnidadesPan + ' unidades\n';
    mensaje += '\uD83D\uDCB0 *TOTAL ESTIMADO:* ' + totalDinero + '\n';
    mensaje += '-------------------------------------------\n\n';
    
    mensaje += '_Quedo atento a su confirmación. ¡Muchas gracias!_';

    // Codificar y abrir
    const mensajeURL = encodeURIComponent(mensaje);
    const urlWhatsApp = 'https://wa.me/' + numeroTienda + '?text=' + mensajeURL;

    window.open(urlWhatsApp, '_blank');
    
    // Limpiar después de enviar
    carritoArray = []; 
    actualizarCarritoUI();

    // Resetear campos de delivery
    document.getElementById('check-delivery').checked = false;
    document.getElementById('campo-direccion').classList.add('hidden');
    document.getElementById('direccion-texto').value = '';
}

function animarVueloCarrito(botonElement) {
    const carritoBtn = document.getElementById('ver-carrito');
    
    // Obtener posiciones del botón pulsado y del icono del carrito
    const rectBoton = botonElement.getBoundingClientRect();
    const rectCarrito = carritoBtn.getBoundingClientRect();

    // Crear la partícula
    const particula = document.createElement('div');
    particula.className = 'vuelo-particula';
    particula.innerHTML = '<i class="fas fa-bread-slice"></i>';
    
    // Posición inicial (donde está el botón "Agregar")
    particula.style.left = `${rectBoton.left + rectBoton.width / 2}px`;
    particula.style.top = `${rectBoton.top + rectBoton.height / 2}px`;

    document.body.appendChild(particula);

    // Pequeño delay para que el navegador registre la posición inicial antes de animar
    setTimeout(() => {
        particula.style.left = `${rectCarrito.left + rectCarrito.width / 2}px`;
        particula.style.top = `${rectCarrito.top + rectCarrito.height / 2}px`;
        particula.style.transform = 'scale(0.2)';
        particula.style.opacity = '0';
    }, 50);

    // Limpiar el elemento después de la animación
    setTimeout(() => {
        particula.remove();
        // Efecto de "sacudida" al carrito al recibir el item
        carritoBtn.classList.add('animate-bounce');
        setTimeout(() => carritoBtn.classList.remove('animate-bounce'), 500);
    }, 850);
}

function toggleDireccion() {
    const check = document.getElementById('check-delivery');
    const campo = document.getElementById('campo-direccion');
    
    if (check.checked) {
        campo.classList.remove('hidden');
        // Opcional: Hacer scroll hacia abajo para asegurar que el usuario vea el campo
        document.getElementById('carrito-items').scrollTo({ top: 1000, behavior: 'smooth' });
    } else {
        campo.classList.add('hidden');
        document.getElementById('direccion-texto').value = ''; // Limpiar si se desmarca
    }
}

function obtenerUbicacion() {
    const btnTexto = document.getElementById('texto-gps');
    
    if (!navigator.geolocation) {
        alert("Tu navegador no soporta geolocalización");
        return;
    }

    btnTexto.innerText = "Localizando...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            // Creamos el enlace de Google Maps
            enlaceGoogleMaps = `https://www.google.com/maps?q=${lat},${lon}`;
            
            btnTexto.innerText = "¡Ubicación capturada! ✅";
            document.getElementById('direccion-texto').placeholder = "Ubicación GPS fijada. Puedes añadir detalles extras aquí (ej: Casa azul).";
        },
        (error) => {
            console.error(error);
            btnTexto.innerText = "Error al obtener ubicación";
            alert("No pudimos obtener tu ubicación. Por favor, escríbela manualmente.");
        }
    );
}


// Verificar cada 30s si cambió la disponibilidad del Pan de Papa y re-renderizar
let previoHorarioPanPapa = null;
setInterval(() => {
    const { disponible } = panPapaDisponible();
    if (previoHorarioPanPapa !== null && previoHorarioPanPapa !== disponible) {
        if (categoriaActiva === 'todos') {
            mostrarProductos(productosData);
        } else {
            const filtrados = productosData.filter(p => {
                if (categoriaActiva === 'hamb-con-molde') return p.categoria === 'Hamburguesa' && p.especificacion === 'Con Molde';
                if (categoriaActiva === 'hamb-sin-molde') return p.categoria === 'Hamburguesa' && p.especificacion === 'Sin Molde';
                if (categoriaActiva === 'perros') return p.categoria === 'Perro';
                if (categoriaActiva === 'delis') return p.categoria === 'Deli (Pepito)';
                if (categoriaActiva === 'sandwich') return p.categoria === 'Sándwich';
                if (categoriaActiva === 'pan-de-papa') return p.categoria === 'Pan de Papa';
                return false;
            });
            mostrarProductos(filtrados);
        }
    }
    previoHorarioPanPapa = disponible;
}, 30000);

cargarProductos(); // Carga inicial de productos al abrir la página








