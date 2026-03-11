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


const inputNombre = document.getElementById('cliente-nombre');
const inputTelefono = document.getElementById('cliente-telefono');
const inputFecha = document.getElementById('fecha-entrega');
const btnPagar = document.querySelector('.btn-pagar');



let productosData = []; // Base de datos completa
let carritoArray = [];  // Arreglo para los items seleccionados


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

// ==========================================================================
// 2. RENDERIZADO DE PRODUCTOS
// ==========================================================================
function mostrarProductos(productos) {
    contenedor.innerHTML = '';
    productos.forEach(p => {
        const card = document.createElement('article');
        // Clases de Tailwind para la tarjeta
        card.className = 'bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between group';
        card.innerHTML = `
    <div class="relative overflow-hidden rounded-t-2xl">
        <img src="imagenes/HB-SM-01.png" onerror="this.src='imagenes/placeholder-pan.jpg'" alt="${p.producto}" class="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500">
        <span class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-marron-oscuro text-[14px] px-2 py-1 rounded-full font-bold shadow-sm">
            ${p.unidades_pqte} unds
        </span>
    </div>
    <div class="p-4 flex flex-col justify-between flex-1">
        <div>
            <h3 class="text-md font-bold text-gray-800">${p.producto}  (${p.medida_cm} cm)</h3>
            <p class="text-[12px] text-red-500 uppercase tracking-wider">${p.categoria} | ${p.peso_gr}gr</p>
            <p class="text-[14px] text-gray-500 mt-1 font-medium">${p.topping}</p>
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
        btnCarrito.classList.add('ring-4', 'ring-marron-claro', 'scale-110');
        setTimeout(() => {
            btnCarrito.classList.remove('ring-4', 'ring-marron-claro', 'scale-110');
        }, 500);

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
                    ${item.producto} (${item.medida_cm} cm)  - <span class="text-gray-500 font-medium">${item.topping}</span>
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

            // Cambiamos el texto del botón para dar feedback al usuario
            const btn = document.querySelector('.btn-pagar');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            btn.disabled = true;

            // Calculamos el total global para el registro
            const totalGlobal = totalPrecioElemento.innerText.replace('$', '');
            const fechaActual = new Date().toLocaleString();

            // Preparamos los datos. SheetDB espera un array de objetos llamado "data"
            // Registraremos cada item como una fila independiente para mejor control
            const pedidosParaEnviar = carritoArray.map(p => ({
                "Cliente": document.getElementById('cliente-nombre').value || "Cliente Anónimo",
                "Numero_Telefono": "+58" + document.getElementById('cliente-telefono').value || "No proporcionado",
                "Producto": p.producto,
                "Especificacion": p.especificacion,
                "Peso": p.peso,
                "Topping": p.topping,
                "Cantidad": p.cantidad,
                "Subtotal": (p.precio * p.cantidad).toFixed(2),
                "Total_Pedido": totalGlobal,
                "Fecha": fechaActual,
                "Fecha_Entrega": document.getElementById('fecha-entrega').value || "No especificada"
            }));



    try {
        // Usamos URLSearchParams para enviar datos como formulario (evita CORS)
        const params = new URLSearchParams();
        params.append('data', JSON.stringify(pedidosParaEnviar));

        const response = await fetch(SHEETDB_URL, {
            method: 'POST',
            mode: 'no-cors', // Evita la comprobación CORS
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        // Con 'no-cors', response.ok siempre es false. 
        // Asumimos éxito si no hubo error de red.
        const totalFinal = totalPrecioElemento.innerText.replace('$', '');
        const ordenFinal = [...carritoArray]; 

        alert("¡Pedido registrado con éxito!");
        mostrarResumenPedido(totalFinal, ordenFinal); 

        actualizarCarritoUI();
        sidebarCarrito.classList.add('carrito-hidden');
            
    } catch (error) {
        console.error("Error al enviar:", error);
        alert("Hubo un fallo al enviar. Asegúrate de haber actualizado el despliegue en Google Apps Script.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Bloquear fechas pasadas y establecer mañana por defecto si son más de las 9 AM
document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    // Si quieres aplicar la regla de las 9:00 AM automáticamente:
    if (hoy.getHours() >= 9) {
        hoy.setDate(hoy.getDate() + 1); // Si son después de las 9 AM, el mínimo será mañana
    }
    const fechaMin = hoy.toISOString().split('T')[0];
    inputFecha.setAttribute('min', fechaMin);
    inputFecha.value = fechaMin; // Valor por defecto

    // Cargar fecha guardada si existe
    const fechaGuardada = localStorage.getItem('sugarbread_fecha');
    if (fechaGuardada) inputFecha.value = fechaGuardada;
});

// Guardar mientras eligen
inputFecha.addEventListener('input', () => {
    localStorage.setItem('sugarbread_fecha', inputFecha.value);
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
            <p class="mb-1"><strong>${p.cantidad}x</strong> ${p.producto} <span class="text-xs text-gray-500">(${p.topping})</span></p>`
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

    // Opcional: Preguntar si quiere enviar por WhatsApp al cerrar
    if(confirm("¿Deseas enviar el resumen de tu pedido por WhatsApp para agilizar la atención?")) {
        enviarPedidoWhatsApp();
    }
}


function enviarPedidoWhatsApp() {
    const nombre = document.getElementById('cliente-nombre').value || "Cliente";
    const telefonoCliente = document.getElementById('cliente-telefono').value || "No indicado";
    const fechaEntrega = document.getElementById('fecha-entrega').value || "No especificada";
    const numeroTienda = "584126030518"; 
    
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


cargarProductos(); // Carga inicial de productos al abrir la página
