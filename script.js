

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
            <div class="mb-4">
                <h3 class="text-lg font-bold text-marron-oscuro group-hover:text-black transition-colors">${p.producto}</h3>
                <div class="flex flex-wrap gap-2 mt-2">
                    <span class="bg-crema text-[10px] px-2 py-1 rounded-md border border-marron-claro/30 text-marron-oscuro font-bold uppercase">${p.especificacion}</span>
                    <span class="bg-gray-100 text-[10px] px-2 py-1 rounded-md text-gray-500 font-bold uppercase">${p.peso_gr}gr</span>
                </div>
                <p class="text-sm mt-3 text-gray-600 italic">Topping: <span class="font-bold text-marron-oscuro">${p.topping}</span></p>
                <p class="text-xs text-gray-400 mt-1">Paquete de ${p.unidades_pqte} unidades</p>
            </div>
            <div class="mt-auto border-t border-gray-50 pt-4">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-2xl font-black text-negro-suave">$${parseFloat(p.precio).toFixed(2)}</span>
                </div>
                <div class="flex gap-2">
                    <input type="number" id="cant-${p.id}" value="1" min="1" class="w-16 p-2 border-2 border-crema bg-crema rounded-lg text-center font-bold focus:border-marron-claro outline-none transition-all">
                    <button class="flex-1 bg-marron-oscuro text-white py-2 rounded-lg font-bold hover:bg-negro-suave transition-colors flex items-center justify-center gap-2" onclick="agregarAlCarrito('${p.id}')">
                        <i class="fas fa-plus text-xs"></i> AGREGAR
                    </button>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// ==========================================================================
// 3. LÓGICA DEL CARRITO
// ==========================================================================

// 1. Función para agregar (con validación de ID)
function agregarAlCarrito(id) {
    const producto = productosData.find(p => p.id === id);
    // Buscamos el input de cantidad específico para este producto
    const inputCantidad = document.getElementById(`cant-${id}`);
    const cantidad = parseInt(inputCantidad.value);

    if (producto && cantidad > 0) {
        // Buscamos si el producto ya está en el carrito para sumar la cantidad
        const itemExistente = carritoArray.find(item => item.id === id);

        if (itemExistente) {
            itemExistente.cantidad += cantidad;
        } else {
            carritoArray.push({
                id: producto.id,
                categoria: producto.categoria,
                producto: producto.producto,
                peso: producto.peso_gr,
                especificacion: producto.especificacion,
                precio: parseFloat(producto.precio),
                topping: producto.topping,
                cantidad: cantidad, // Guardamos la cantidad elegida
                unidades_por_paquete: parseInt(producto.unidades_pqte)
            });
        }
        
        actualizarCarritoUI();
        // Opcional: resetear el input a 1 después de agregar
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
                <p class="text-xs font-bold text-gray-800 leading-tight flex-1">
                    ${item.producto}
                </p>
                <button onclick="eliminarDelCarrito(${index})" class="text-gray-300 hover:text-red-500 ml-2">
                    <i class="fas fa-times text-[10px]"></i>
                </button>
            </div>
            
            <div class="flex items-center justify-between mt-1">
                <div class="flex items-center bg-gray-100 rounded-lg p-1">
                    <button onclick="restarCantidad(${index})" class="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-marron-claro hover:text-white transition-colors text-xs">-</button>
                    <span class="px-3 text-xs font-bold text-marron-oscuro">${item.cantidad}</span>
                    <button onclick="sumarCantidad(${index})" class="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-marron-claro hover:text-white transition-colors text-xs">+</button>
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
    const numeroTienda = "584126030518"; // <--- PON AQUÍ TU NÚMERO DE NEGOCIO
    const fechaEntrega = document.getElementById('fecha-entrega').value || "No especificada"; // Definir fechaEntrega
    
    // Recuperamos los datos que se guardaron antes de limpiar el carrito
    // O puedes usar una variable global si no has limpiado el carrito aún
    if (carritoArray.length === 0) return; 

    let mensaje = `*NUEVO PEDIDO - SUGARBREAD* 🥖\n`;
    mensaje += `--------------------------\n`;
    mensaje += `👤 *Cliente:* ${nombre}\n`;
    mensaje += `--------------------------\n`;

    carritoArray.forEach(p => {
        mensaje += `• *${p.cantidad}x* ${p.producto}\n`;
        mensaje += `  _${p.topping} (${p.especificacion})_\n`
        mensaje += `📅 *Fecha Entrega:* ${fechaEntrega}\n`;
    });

    const total = document.getElementById('total-precio').innerText;
    mensaje += `--------------------------\n`;
    mensaje += `💰 *TOTAL A PAGAR:* ${total}\n`;
    mensaje += `--------------------------\n`;
    mensaje += `_Por favor, confírmame la recepción de este pedido._`;

    // Codificar el mensaje para URL
    const mensajeURL = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${numeroTienda}?text=${mensajeURL}`;

    // Abrir en una pestaña nueva
    window.open(urlWhatsApp, '_blank');
    carritoArray = []; // Limpiar el carrito después de enviar
    actualizarCarritoUI();
}


cargarProductos(); // Carga inicial de productos al abrir la página




