

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

// Persistencia del carrito en localStorage
function guardarCarrito() {
    localStorage.setItem('sugarbread_carrito', JSON.stringify(carritoArray));
}

function cargarCarrito() {
    const guardado = localStorage.getItem('sugarbread_carrito');
    if (guardado) {
        try {
            carritoArray = JSON.parse(guardado);
            actualizarCarritoUI();
        } catch (e) {
            console.error('Error al cargar carrito:', e);
            carritoArray = [];
        }
    }
}
let categoriaActiva = 'todos'; // Categoría seleccionada actualmente
let seleccionVariante = {}; // Mapa grupoId -> varianteId seleccionada

// Toppings descontinuados que se ocultan del catálogo (se restauran quitándolos de esta lista)
const TOPPINGS_EXCLUIDOS = ['Sésamo Negro'];

// ==========================================================================
// PAN DE JAMÓN: precios al detal / al mayor
// El mayor se activa al juntar UMBRAL_MAYOR_PAN_JAMON unidades entre TODOS los
// panes de jamón del carrito (se pueden combinar, ej. 4 + 4 + 4 = 12).
// Al activarse, el precio al mayor se recalcula para TODO el pan de jamón,
// incluidos los agregados antes de cruzar el umbral.
// ==========================================================================
const CATEGORIA_PAN_JAMON = 'Pan de Jamon';
const UMBRAL_MAYOR_PAN_JAMON = 12;

function totalUnidadesPanJamon() {
    return carritoArray
        .filter(item => item.categoria === CATEGORIA_PAN_JAMON)
        .reduce((suma, item) => suma + item.cantidad * (item.unidades_por_paquete || 1), 0);
}

function panJamonTieneMayor() {
    return totalUnidadesPanJamon() >= UMBRAL_MAYOR_PAN_JAMON;
}

// Precio unitario real a aplicar: mayor si corresponde, caso contrario detal
function precioUnitarioEfectivo(item) {
    if (item.categoria === CATEGORIA_PAN_JAMON && item.precio_mayor && panJamonTieneMayor()) {
        return parseFloat(item.precio_mayor);
    }
    return parseFloat(item.precio);
}

function subtotalItem(item) {
    return precioUnitarioEfectivo(item) * item.cantidad;
}


// --- PASO 1: CARGAR DATOS AL INICIAR ---
document.addEventListener('DOMContentLoaded', () => {
    const nombreGuardado = localStorage.getItem('sugarbread_nombre');
    const telefonoGuardado = localStorage.getItem('sugarbread_telefono');

    if (nombreGuardado) inputNombre.value = nombreGuardado;
    if (telefonoGuardado) inputTelefono.value = telefonoGuardado;

    cargarCarrito();
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
        // Filtrar toppings descontinuados antes de renderizar
        if (TOPPINGS_EXCLUIDOS.length > 0) {
            productosData = productosData.filter(p => !TOPPINGS_EXCLUIDOS.includes(p.topping));
        }
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

    const DIAS_PERMITIDOS = [1, 2, 3, 4, 5]; // Lunes a Viernes
    const CORTE_HORA = 8; // 8 AM cutoff

    // 1. Validar el horario diario (Tardes/Noches o Madrugadas)
    const enHorario = hora >= 13 || hora < 8;

    // 2. Validar si hoy es un día permitido para solicitar producción
    const diaPermitido = DIAS_PERMITIDOS.includes(dia);

    // 3. Calcular el día real de entrega proyectado hacia el futuro
    const fechaEntrega = new Date(ahora);

    if (hora >= CORTE_HORA) {
        // Si ya pasó la hora de corte (8 AM), la entrega se mueve al día siguiente
        fechaEntrega.setDate(fechaEntrega.getDate() + 1);
    } else {
        // Si es antes de las 8 AM, se procesa para HOY mismo
        // (Mantiene la fecha actual)
    }

    // Si la entrega estimada cae Sábado (6) o Domingo (0) por el desfase,
    // la movemos al próximo Lunes
    if (fechaEntrega.getDay() === 6) {
        fechaEntrega.setDate(fechaEntrega.getDate() + 2);
    } else if (fechaEntrega.getDay() === 0) {
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
// Agrupa productos que comparten características (solo cambia el topping)
function agruparPorVariantes(productos) {
    const grupos = new Map();
    productos.forEach(p => {
        const clave = [p.categoria, p.producto, p.especificacion, p.peso_gr, p.medida_cm, p.unidades_pqte].join('|');
        if (!grupos.has(clave)) grupos.set(clave, []);
        grupos.get(clave).push(p);
    });
    return Array.from(grupos.values());
}

function mostrarProductos(productos) {
    contenedor.innerHTML = '';

    const { disponible: esHorarioPanPapa } = panPapaDisponible();

    let mensajeMostrado = false;

    const productosVisibles = [];
    productos.forEach(p => {
        if (p.categoria === "Pan de Papa" && !esHorarioPanPapa) {
            if (!mensajeMostrado) {
                const aviso = document.createElement('div');
                aviso.className = 'col-span-full bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl';
                aviso.innerHTML = `
                    <div class="flex items-center">
                        <i class="fas fa-info-circle text-amber-500 mr-3"></i>
                        <p class="text-amber-800 font-medium">
                            El <strong>Pan de Papa</strong> está disponible para pedidos los días <strong>Lunes a Viernes</strong>, desde la 1:00 PM hasta las 8:00 AM del día siguiente.
                        </p>
                    </div>
                `;
                contenedor.appendChild(aviso);
                mensajeMostrado = true;
            }
            return;
        }
        productosVisibles.push(p);
    });

    // Aviso sutil de días de elaboración del Pan de Jamón (solo si hay de esos productos en pantalla)
    if (productosVisibles.some(p => p.categoria === CATEGORIA_PAN_JAMON)) {
        const avisoJamon = document.createElement('div');
        avisoJamon.className = 'col-span-full flex items-center justify-center gap-2 mb-5 text-[12px] text-gray-500 text-center';
        avisoJamon.innerHTML = `
            <i class="fas fa-calendar-day text-marron-claro"></i>
            <span>El <strong class="text-marron-oscuro font-bold">Pan de Jamón</strong> se realiza mayormente los <strong class="text-marron-oscuro font-bold">miércoles y sábados</strong></span>
        `;
        contenedor.appendChild(avisoJamon);
    }

    const grupos = agruparPorVariantes(productosVisibles);

    grupos.forEach(grupo => {
        const base = grupo[0];
        const grupoId = base.id;
        seleccionVariante[grupoId] = grupoId; // Por defecto, la primera variante

        const card = document.createElement('article');
        card.className = 'bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden h-full';
        card.innerHTML = `
            <div class="relative overflow-hidden cursor-zoom-in bg-crema rounded-t-2xl">
                <img id="img-${grupoId}" src="imagenes/${base.id}.webp" 
                     onclick="expandirImagen(this.src)"
                     onerror="this.src='imagenes/placeholder-pan.jpg'" 
                     alt="${base.producto}" 
                     class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500">
                <span class="absolute top-3 right-3 bg-white/70 backdrop-blur-md text-marron-oscuro text-[14px] px-2.5 py-1 rounded-full font-bold shadow-sm pointer-events-none">
                    ${parseInt(base.unidades_pqte) === 1 ? 'Por unidad' : base.unidades_pqte + ' unds'}
                </span>
            </div>
            <div class="p-5 flex flex-col flex-1 min-h-0">
                <div>
                    <div class="flex items-start justify-between gap-2">
                        <h3 class="text-base font-bold text-gray-800 leading-snug">${base.producto}</h3>
                        <span class="text-[11px] font-bold text-white bg-marron-oscuro px-2 py-1 rounded-full whitespace-nowrap">${base.medida_cm} cm</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <p class="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">${base.categoria} | ${base.peso_gr} gr</p>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${base.especificacion === 'Con Molde' ? 'bg-amber-100 text-amber-800' : 'bg-marron-claro/25 text-marron-oscuro'}">
                            <i class="fas fa-hamburger text-[8px]"></i> ${base.especificacion}
                        </span>
                    </div>
                    
                    ${grupo.length > 1 && base.categoria !== CATEGORIA_PAN_JAMON ? `
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-3 mb-1.5">Elige tu topping:</p>
                    <div id="pills-${grupoId}" class="pills-scroll flex flex-wrap gap-1.5 pr-1">
                        ${grupo.map((v, i) => `
                            <button type="button" data-variante-id="${v.id}" onclick="seleccionarTopping('${grupoId}', '${v.id}')"
                                    class="topping-pill text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-crema text-marron-oscuro border-marron-claro/60 hover:bg-marron-claro/40 ${i === 0 ? 'active-pill' : ''}">
                                ${v.topping} <span class="pill-precio font-bold text-terracota">$${parseFloat(v.precio).toFixed(2)}</span>
                            </button>
                        `).join('')}
                    </div>` : ''}
                </div>
                
                <div class="mt-auto pt-5 flex items-center justify-between gap-3">
                    <div>
                        <p class="text-[10px] text-gray-400 font-bold uppercase mb-0.5">${base.unidades_pqte === 1 ? 'Precio por unidad' : 'Precio'}</p>
                        <span id="precio-${grupoId}" class="text-2xl font-extrabold text-terracota leading-none">$${parseFloat(base.precio).toFixed(2)}</span>
                        ${base.precio_mayor ? `
                        <p id="precio-mayor-${grupoId}" class="text-[10px] font-bold text-green-600 mt-1 leading-tight">
                            Al mayor: $${parseFloat(base.precio_mayor).toFixed(2)} <span class="text-gray-400 font-medium">(12+ unds)</span>
                        </p>` : ''}
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <div class="flex items-center gap-1.5 bg-crema border border-marron-claro/40 rounded-full p-1">
                            <button type="button" onclick="cambiarCantidadProducto('${grupoId}', -1)" class="w-8 h-8 flex items-center justify-center bg-white text-marron-oscuro rounded-full shadow-sm hover:bg-marron-oscuro hover:text-white transition-colors font-bold text-lg active:scale-90">-</button>
                            <input type="number" id="cant-${grupoId}" value="1" min="1" readonly
                                   class="w-10 text-sm bg-transparent text-center font-extrabold text-marron-oscuro outline-none pointer-events-none">
                            <button type="button" onclick="cambiarCantidadProducto('${grupoId}', 1)" class="w-8 h-8 flex items-center justify-center bg-white text-marron-oscuro rounded-full shadow-sm hover:bg-marron-oscuro hover:text-white transition-colors font-bold text-lg active:scale-90">+</button>
                        </div>
                        <button onclick="agregarVarianteSeleccionada('${grupoId}', this)" 
                                class="bg-miel hover:bg-terracota text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5">
                            <i class="fas fa-cart-plus text-sm"></i> Agregar
                        </button>
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// Cambia la variante seleccionada de una tarjeta agrupada
function seleccionarTopping(grupoId, varianteId) {
    seleccionVariante[grupoId] = varianteId;

    const img = document.getElementById(`img-${grupoId}`);
    const precio = document.getElementById(`precio-${grupoId}`);
    const precioMayor = document.getElementById(`precio-mayor-${grupoId}`);
    if (img) img.src = `imagenes/${varianteId}.webp`;
    if (precio) {
        const variante = productosData.find(p => p.id === varianteId);
        if (variante) precio.innerText = `$${parseFloat(variante.precio).toFixed(2)}`;
    }
    if (precioMayor) {
        const variante = productosData.find(p => p.id === varianteId);
        if (variante && variante.precio_mayor) {
            precioMayor.innerHTML = `Al mayor: $${parseFloat(variante.precio_mayor).toFixed(2)} <span class="text-gray-400 font-medium">(12+ unds)</span>`;
        }
    }

    document.querySelectorAll(`#pills-${grupoId} .topping-pill`).forEach(pill => {
        pill.classList.toggle('active-pill', pill.dataset.varianteId === varianteId);
    });
}

// Agrega al carrito la variante seleccionada de la tarjeta
function agregarVarianteSeleccionada(grupoId, boton) {
    const varianteId = seleccionVariante[grupoId];
    if (!varianteId) return;
    agregarAlCarrito(varianteId, boton, grupoId);
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

// Avisa el estado del umbral mayor de Pan de Jamón (y si falta para alcanzarlo)
function notificarUmbralPanJamon(alAgregar) {
    if (!carritoArray.some(item => item.categoria === CATEGORIA_PAN_JAMON)) return;

    const unidades = totalUnidadesPanJamon();

    if (unidades >= UMBRAL_MAYOR_PAN_JAMON) {
        mostrarNotificacion(`🥐 ¡Precio al mayor activado! ${unidades} unidades de Pan de Jamón`);
    } else if (alAgregar) {
        const faltan = UMBRAL_MAYOR_PAN_JAMON - unidades;
        mostrarNotificacion(`Te faltan ${faltan} unds. de Pan de Jamón para el precio al mayor`);
    }
}

// 1. Función para agregar (con validación de ID)
function agregarAlCarrito(id, boton, inputId) {
    const producto = productosData.find(p => p.id === id);
    // Buscamos el input de cantidad específico para este producto
    // En tarjetas agrupadas, el input usa el id del grupo (inputId)
    const inputCantidad = document.getElementById(`cant-${inputId || id}`);
    const cantidad = parseInt(inputCantidad.value);

    if (producto && cantidad > 0) {
        // Buscamos si el producto ya está en el carrito para sumar la cantidad
        const itemExistente = carritoArray.find(item => item.id === id);
        // Disparar la animación si el botón existe
        if (boton) {animarVueloCarrito(boton);}

        const esPanJamon = producto.categoria === CATEGORIA_PAN_JAMON;
        const unidadPanJamon = esPanJamon ? ' und(s)' : ' pqte(s)';
        mostrarNotificacion(`${cantidad} ${unidadPanJamon} de ${producto.producto} agregados`);

        

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
                unidades_por_paquete: parseInt(producto.unidades_pqte),
                precio_mayor: producto.precio_mayor ? parseFloat(producto.precio_mayor) : null
            });
        }
        
        actualizarCarritoUI();
        // Si es Pan de Jamón, avisamos cuánto falta (o se activó) para el precio al mayor
        if (esPanJamon) notificarUmbralPanJamon(true);
        // Opcional: resetear el input a 0 después de agregar
        inputCantidad.value = 1;
    }
}

// Selector interactivo de cantidad en las tarjetas
function cambiarCantidadProducto(id, delta) {
    const input = document.getElementById(`cant-${id}`);
    if (!input) return;
    let nueva = (parseInt(input.value) || 1) + delta;
    if (nueva < 1) nueva = 1;
    input.value = nueva;
}

// Barra flotante de carrito en móviles
function abrirCarritoFlotante() {
    document.getElementById('ver-carrito').click();
}

function actualizarCarritoUI() {
    guardarCarrito();
    const listaCarrito = document.getElementById('carrito-items');
    const totalPrecioElemento = document.getElementById('total-precio');
    const cartCountElement = document.getElementById('cart-count');

    listaCarrito.innerHTML = '';
    let totalAcumulado = 0;
    let itemsTotales = 0;

    carritoArray.forEach((item, index) => {
    const esPanJamon = item.categoria === CATEGORIA_PAN_JAMON;
    const precioUnitario = precioUnitarioEfectivo(item);
    const usaPrecioMayor = esPanJamon && item.precio_mayor && precioUnitario < parseFloat(item.precio);
    const subtotal = precioUnitario * item.cantidad;
    const totalUnidades = item.cantidad * item.unidades_por_paquete;
    
    totalAcumulado += subtotal;
    itemsTotales += item.cantidad;

    const divItem = document.createElement('div');
    divItem.className = 'bg-white rounded-xl border border-gray-200 shadow-sm p-3';
    divItem.innerHTML = `
        <div class="flex gap-3">
            <div class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-crema border border-gray-100 cursor-zoom-in" onclick="expandirImagen('imagenes/${item.id}.webp')">
                <img src="imagenes/${item.id}.webp" alt="${item.producto}" onerror="this.src='imagenes/placeholder-pan.jpg'" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                    <p class="text-xs font-bold text-gray-800 leading-tight">${item.producto} (${item.medida_cm} cm)</p>
                    <button onclick="eliminarDelCarrito(${index})" title="Eliminar" class="text-gray-400 hover:text-red-500 transition-colors">
                        <i class="fas fa-trash-alt text-sm"></i>
                    </button>
                </div>
                <p class="text-[11px] text-gray-500 font-medium mt-0.5">${item.topping} <span class="text-gray-400">•</span> ${item.especificacion}</p>
                ${usaPrecioMayor ? `<p class="text-[10px] font-bold text-green-600 mt-1">✓ Precio al mayor: $${precioUnitario.toFixed(2)} c/u <span class="text-gray-400 font-medium line-through">$${parseFloat(item.precio).toFixed(2)}</span></p>` : ''}
                
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center bg-gray-100 rounded-lg p-0.5">
                        <button onclick="restarCantidad(${index})" class="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-marron-claro hover:text-white transition-colors text-xs font-bold">-</button>
                        <span class="px-2.5 text-xs font-bold text-marron-oscuro">${item.cantidad}</span>
                        <button onclick="sumarCantidad(${index})" class="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-marron-claro hover:text-white transition-colors text-xs font-bold">+</button>
                        <span class="text-[10px] text-gray-500 font-medium ml-1.5 pr-1">${esPanJamon ? 'Unds' : 'Pqtes'}</span>
                    </div>
                    
                    <div class="text-right">
                        <p class="text-sm font-extrabold text-miel">$${subtotal.toFixed(2)}</p>
                        <p class="text-[10px] text-gray-500 font-medium">$${precioUnitario.toFixed(2)} c/u • ${totalUnidades} unds.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    listaCarrito.appendChild(divItem);
    
});

    // Aviso de progreso hacia el precio al mayor de Pan de Jamón
    const avisoMayor = document.getElementById('aviso-pan-jamon-mayor');
    if (avisoMayor) {
        const unidadesJamon = totalUnidadesPanJamon();
        if (unidadesJamon <= 0) {
            avisoMayor.className = 'hidden';
        } else if (panJamonTieneMayor()) {
            avisoMayor.className = 'mb-3 rounded-xl border-l-4 border-green-500 bg-green-50 p-3';
            avisoMayor.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-2"></i> <strong class="text-green-800">Precio al mayor activado</strong> <span class="text-green-800">— llevas ${unidadesJamon} unidades de Pan de Jamón.</span>`;
        } else {
            const faltan = UMBRAL_MAYOR_PAN_JAMON - unidadesJamon;
            avisoMayor.className = 'mb-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-3';
            avisoMayor.innerHTML = `<i class="fas fa-info-circle text-amber-500 mr-2"></i> <strong class="text-amber-800">Agrega ${faltan} unidad(es) más</strong> <span class="text-amber-800">de Pan de Jamón (cualquier modelo) para activar el precio al mayor. Llevas ${unidadesJamon}/${UMBRAL_MAYOR_PAN_JAMON}.</span>`;
        }
    }

    const bolsas = obtenerCostoBolsas();
    const totalConExtras = totalAcumulado + bolsas;

    // Desglose del footer
    const subtotalElemento = document.getElementById('subtotal-precio');
    const deliveryElemento = document.getElementById('delivery-precio');
    if (subtotalElemento) subtotalElemento.innerText = `$${totalAcumulado.toFixed(2)}`;
    if (deliveryElemento) {
        const deliveryActivo = document.getElementById('check-delivery') && document.getElementById('check-delivery').checked;
        deliveryElemento.innerText = deliveryActivo ? 'Por acordar' : '$0.00';
    }

    totalPrecioElemento.innerText = `$${totalConExtras.toFixed(2)}`;
    cartCountElement.innerText = itemsTotales;

    // Actualizar barra flotante móvil
    const contadorFlotante = document.getElementById('cart-count-flotante');
    const totalFlotante = document.getElementById('cart-total-flotante');
    if (contadorFlotante) contadorFlotante.innerText = itemsTotales;
    if (totalFlotante) totalFlotante.innerText = `$${totalConExtras.toFixed(2)}`;
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

// Devuelve los productos de la categoría seleccionada (o todos si es 'todos')
function filtrarPorCategoria(catSeleccionada) {
    if (catSeleccionada === 'todos') return productosData;
    return productosData.filter(p => {
        if (catSeleccionada === 'hamb-con-molde') return p.categoria === 'Hamburguesa' && p.especificacion === 'Con Molde';
        if (catSeleccionada === 'hamb-sin-molde') return p.categoria === 'Hamburguesa' && p.especificacion === 'Sin Molde';
        if (catSeleccionada === 'perros') return p.categoria === 'Perro';
        if (catSeleccionada === 'delis') return p.categoria === 'Deli (Pepito)';
        if (catSeleccionada === 'sandwich') return p.categoria === 'Sándwich';
        if (catSeleccionada === 'pan-de-papa') return p.categoria === 'Pan de Papa';
        if (catSeleccionada === 'pan-dulce') return p.categoria === 'Pan Dulce';
        if (catSeleccionada === 'pan-de-jamon') return p.categoria === CATEGORIA_PAN_JAMON;
        return false;
    });
}

// Filtrar por categorías
function aplicarFiltro(catSeleccionada) {
    categoriaActiva = catSeleccionada;

    mostrarProductos(filtrarPorCategoria(catSeleccionada));

    // Scroll suave hacia el catálogo y aplicar fondo si es Pan Dulce
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Aplicar estilo de fondo si es Pan Dulce
    const container = document.getElementById('catalogo');
    if (catSeleccionada === 'pan-dulce') {
        container.classList.add('bg-orange-50', 'rounded-3xl', 'p-6');
    } else {
        container.classList.remove('bg-orange-50', 'rounded-3xl', 'p-6');
    }
}

document.querySelectorAll('.btn-cat').forEach(boton => {
    boton.addEventListener('click', () => {
        document.querySelectorAll('.btn-cat').forEach(b => b.classList.remove('active'));
        boton.classList.add('active');
        const cat = boton.getAttribute('data-cat');
        aplicarFiltro(cat);
    });
});

// Filtrar desde las tarjetas destacadas
function filtrarDestacado(card) {
    document.querySelectorAll('.btn-cat').forEach(b => b.classList.remove('active'));
    const cat = card.getAttribute('data-cat');
    aplicarFiltro(cat);
}

// ==========================================================================
// CARRUSEL HERO (Stacked 3D Cards)
// ==========================================================================
let slideActual = 0;
let intervaloCarrusel = null;
let inicioTouchX = null;

// Estados del apilado 3D según el offset circular relativo al slide activo
// Coverflow: actual al centro, vecinas asomando mitad visible a los lados
function estiloStack(offset) {
    switch (offset) {
        case 0:
            return { transform: 'translate3d(0, 0, 0) scale(1) rotateY(0deg)', opacity: 1, z: 5 };
        case 1:
            return { transform: 'translate3d(48%, 0, -60px) scale(0.85) rotateY(8deg)', opacity: 0.95, z: 4 };
        case -1:
            return { transform: 'translate3d(-48%, 0, -60px) scale(0.85) rotateY(-8deg)', opacity: 0.95, z: 4 };
        case 2:
            return { transform: 'translate3d(96%, 0, -120px) scale(0.75)', opacity: 0, z: 3 };
        case -2:
            return { transform: 'translate3d(-96%, 0, -120px) scale(0.75)', opacity: 0, z: 3 };
        default:
            return { transform: 'translate3d(0, 0, -180px) scale(0.6)', opacity: 0, z: 2 };
    }
}

function offsetCircular(i, total) {
    let d = i - slideActual;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
}

function mostrarSlide(indice) {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;
    slideActual = (indice + slides.length) % slides.length;

    slides.forEach((s, i) => {
        const offset = offsetCircular(i, slides.length);
        const estilo = estiloStack(offset);
        s.style.transform = estilo.transform;
        s.style.opacity = estilo.opacity;
        s.style.zIndex = estilo.z;
        s.style.webkitTransform = estilo.transform;
    });

    const dots = document.querySelectorAll('#hero-dots .hero-dot');
    dots.forEach((d, i) => {
        d.classList.toggle('bg-white', i === slideActual);
        d.classList.toggle('bg-white/40', i !== slideActual);
    });
}

function moverSlide(direccion) {
    mostrarSlide(slideActual + direccion);
    reiniciarIntervalo();
}

function reiniciarIntervalo() {
    if (intervaloCarrusel) clearInterval(intervaloCarrusel);
    intervaloCarrusel = setInterval(() => mostrarSlide(slideActual + 1), 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.hero-slide');
    const dotsContenedor = document.getElementById('hero-dots');
    if (slides.length === 0 || !dotsContenedor) return;

    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'hero-dot w-2.5 h-2.5 rounded-full transition-all ' + (i === 0 ? 'bg-white' : 'bg-white/40');
        dot.onclick = () => { mostrarSlide(i); reiniciarIntervalo(); };
        dotsContenedor.appendChild(dot);
    });

    mostrarSlide(0);
    intervaloCarrusel = setInterval(() => mostrarSlide(slideActual + 1), 5000);

    // Swipe táctil (móviles)
    const carrusel = document.getElementById('hero-carrusel');
    if (carrusel) {
        carrusel.addEventListener('touchstart', (e) => {
            inicioTouchX = e.touches[0].clientX;
        }, { passive: true });
        carrusel.addEventListener('touchend', (e) => {
            if (inicioTouchX === null) return;
            const deltaX = e.changedTouches[0].clientX - inicioTouchX;
            inicioTouchX = null;
            if (Math.abs(deltaX) > 45) {
                moverSlide(deltaX < 0 ? 1 : -1);
            }
        }, { passive: true });
    }
});

// Abrir carrito
document.getElementById('ver-carrito').addEventListener('click', () => {
    sidebarCarrito.classList.remove('translate-x-full'); // Tailwind slide in
    document.getElementById('cart-overlay').classList.remove('hidden');
    const flotante = document.getElementById('carrito-flotante');
    if (flotante) flotante.style.display = 'none';
});

// Cerrar carrito
function cerrarCarrito() {
    sidebarCarrito.classList.add('translate-x-full'); // Tailwind slide out
    document.getElementById('cart-overlay').classList.add('hidden');
    const flotante = document.getElementById('carrito-flotante');
    if (flotante) flotante.style.display = '';
}
document.getElementById('close-cart').addEventListener('click', cerrarCarrito);
document.getElementById('cart-overlay').addEventListener('click', cerrarCarrito);

// Control sheets

async function guardarPedidoEnExcel() {
    const totalGlobal = totalPrecioElemento.innerText.replace('$', '');
    const ahora = new Date();
    const fechaActual = `${String(ahora.getDate()).padStart(2,'0')}/${String(ahora.getMonth()+1).padStart(2,'0')}/${ahora.getFullYear()}, ${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}:${String(ahora.getSeconds()).padStart(2,'0')}`;
    const telefono = document.getElementById('cliente-telefono').value.trim();

    const pedidosParaEnviar = carritoArray.map(p => ({
        "Cliente": document.getElementById('cliente-nombre').value || "Cliente Anónimo",
        "Numero_Telefono": telefono ? "+58" + telefono : "No proporcionado",
        "Producto": p.producto,
        "Especificacion": p.especificacion,
        "Peso": p.peso,
        "Topping": p.topping,
        "Cantidad": p.cantidad,
        "Precio_Unitario": precioUnitarioEfectivo(p).toFixed(2),
        "Precio_Mayor_Aplicado": (p.categoria === CATEGORIA_PAN_JAMON && panJamonTieneMayor() && p.precio_mayor) ? "Sí" : "No",
        "Subtotal": subtotalItem(p).toFixed(2),
        "Total_Pedido": totalGlobal,
        "Fecha": fechaActual,
        "Fecha_Entrega": (() => {
            const fechaElegida = document.getElementById('fecha-entrega').value;
            if (!fechaElegida) return "No especificada";
            const horaActual = new Date().toTimeString().split(' ')[0];
            return `${fechaElegida} ${horaActual}`;
        })(),
        "Delivery": document.getElementById('check-delivery').checked ? 'Sí - ' + document.getElementById('direccion-texto').value : 'No, retiro en local',
        "Bolsas": (() => {
            const check = document.getElementById('check-bolsa');
            if (!check.checked) return "No";
            const cant = parseInt(document.getElementById('cantidad-bolsa').value) || 1;
            return cant + " bolsa(s) - $" + (cant * PRECIO_BOLSA).toFixed(2);
        })()
    }));

    const jsonData = JSON.stringify(pedidosParaEnviar);
    console.log('📤 Datos:', jsonData);

    try {
        const params = new URLSearchParams();
        params.append('data', jsonData);
        await fetch(SHEETDB_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: params
        });
        console.log('✅ Enviado a Excel');
        return true;
    } catch (e) {
        console.error('❌ Error al enviar a Excel:', e);
        return false;
    }
}

document.querySelector('.btn-pagar').addEventListener('click', async () => {
    if (carritoArray.length === 0) return alert("El carrito está vacío");
    if (!document.getElementById('cliente-nombre').value) return alert("Por favor, ingresa el nombre del cliente");
    if (!document.getElementById('cliente-telefono').value) return alert("Por favor, ingresa el número de teléfono del cliente");

    const btn = document.querySelector('.btn-pagar');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;

    const totalFinal = totalPrecioElemento.innerText.replace('$', '');
    const ordenFinal = [...carritoArray];

    mostrarResumenPedido(totalFinal, ordenFinal);

    actualizarCarritoUI();
    cerrarCarrito();

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
    document.getElementById('badge-orden').innerText = `Orden #${nroOrden}`;
    
    // Cabecera del ticket
    let htmlProductos = `
        <div class="p-4 border-b border-dashed border-marron-claro bg-white">
            <p class="text-xs font-bold text-gray-700 flex items-center gap-2 mb-1">
                <i class="far fa-calendar-check text-marron-oscuro"></i> Fecha de entrega
            </p>
            <p class="text-sm font-extrabold text-marron-oscuro">${fechaEntrega}</p>
        </div>
    `;
    
    // Filas del ticket (producto + subtotal)
    let totalItems = 0;
    let totalUnidadesTicket = 0;
    productos.forEach(p => {
        const esPanJamon = p.categoria === CATEGORIA_PAN_JAMON;
        const precioUnitario = precioUnitarioEfectivo(p);
        const usaPrecioMayor = esPanJamon && p.precio_mayor && precioUnitario < parseFloat(p.precio);
        const subtotal = (precioUnitario * p.cantidad).toFixed(2);
        totalItems += p.cantidad;
        totalUnidadesTicket += p.cantidad * p.unidades_por_paquete;
        htmlProductos += `
            <div class="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-dashed border-marron-claro/60">
                <div class="min-w-0">
                    <p class="text-xs font-bold text-gray-800 leading-snug">
                        <span class="text-terracota font-black">${p.cantidad}x</span> ${p.producto} (${p.medida_cm} cm)
                    </p>
                    <p class="text-[10px] text-gray-500 font-medium mt-0.5 truncate">${p.topping} • ${p.especificacion}</p>
                    ${usaPrecioMayor ? `<p class="text-[10px] font-bold text-green-600 mt-0.5">✓ Al mayor: $${precioUnitario.toFixed(2)} c/u</p>` : ''}
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-xs font-extrabold text-miel">$${subtotal}</p>
                    <p class="text-[9px] text-gray-400">${p.cantidad * p.unidades_por_paquete} unds.</p>
                </div>
            </div>
        `;
    });

    // Aviso del precio al mayor de Pan de Jamón en el ticket
    if (totalUnidadesPanJamon() > 0 && panJamonTieneMayor()) {
        htmlProductos += `
            <div class="px-4 py-2 bg-green-50 border-b border-dashed border-green-200 flex items-center gap-2">
                <i class="fas fa-check-circle text-green-600 text-xs"></i>
                <p class="text-[10px] font-bold text-green-700">
                    Precio al mayor aplicado por ${totalUnidadesPanJamon()} unidades de Pan de Jamón (mínimo ${UMBRAL_MAYOR_PAN_JAMON}).
                </p>
            </div>
        `;
    }

    // Bolsas si fueron solicitadas
    const bolsaCheck = document.getElementById('check-bolsa');
    const bolsasActivas = bolsaCheck && bolsaCheck.checked;
    if (bolsasActivas) {
        const cantBolsa = parseInt(document.getElementById('cantidad-bolsa').value) || 1;
        const costoBolsa = (cantBolsa * PRECIO_BOLSA).toFixed(2);
        htmlProductos += `
            <div class="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-dashed border-marron-claro/60">
                <div class="min-w-0">
                    <p class="text-xs font-bold text-gray-800 leading-snug">
                        <span class="text-terracota font-black">${cantBolsa}x</span> Bolsas para el pedido
                    </p>
                    <p class="text-[10px] text-gray-500 font-medium mt-0.5">Cada bolsa $0.20</p>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-xs font-extrabold text-miel">$${costoBolsa}</p>
                </div>
            </div>
        `;
    }


    
    // Total destacado
    htmlProductos += `
        <div class="px-4 py-3 bg-gradient-to-r from-miel to-terracota flex items-center justify-between">
            <div>
                <p class="text-white/80 text-[10px] font-bold uppercase tracking-widest">Total del pedido</p>
                <p class="text-white/70 text-[10px] font-medium mt-0.5">${totalItems} ${totalUnidadesTicket !== totalItems ? 'unidad(es)' : 'paquete(s)'} + extras</p>
            </div>
            <p class="text-2xl font-black text-white">$${total}</p>
        </div>
    `;

    contenedorResumen.innerHTML = htmlProductos;
    
    // MANEJO DE CLASES TAILWIND (Sin usar .style.display)
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Función para cerrar el modal corregida
function cerrarResumen() {
    const modal = document.getElementById('modal-resumen');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}


async function enviarPedidoWhatsApp() {
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

        const esPanJamon = p.categoria === CATEGORIA_PAN_JAMON;
        const precioUnitario = precioUnitarioEfectivo(p);
        const usaPrecioMayor = esPanJamon && p.precio_mayor && precioUnitario < parseFloat(p.precio);

        // ✅ = Check verde (✅)
        mensaje += '\u2705 *' + p.cantidad + (esPanJamon ? ' und(s)' : ' pqte(s)') + '* - ' + p.producto + '\n';
        mensaje += '   • Topping: ' + p.topping + '\n';
        mensaje += '   • Unidades: ' + totalU + ' unds.\n';
        mensaje += '   • Precio: $' + precioUnitario.toFixed(2) + ' c/u';
        if (usaPrecioMayor) mensaje += ' _(precio al mayor)_';
        mensaje += '\n\n';

        
    });

    if (totalUnidadesPanJamon() >= UMBRAL_MAYOR_PAN_JAMON) {
        mensaje += '\uD83E\uDD55 *PRECIO AL MAYOR:* ' + totalUnidadesPanJamon() + ' unidades de Pan de Jamón (' + UMBRAL_MAYOR_PAN_JAMON + '+)\n\n';
    }



    const bolsaCheck = document.getElementById('check-bolsa').checked;
    if (bolsaCheck) {
        const cantBolsa = parseInt(document.getElementById('cantidad-bolsa').value) || 1;
        mensaje += '\uD83D\uDCE6 *Bolsas:* ' + cantBolsa + ' x $0.20 = $' + (cantBolsa * PRECIO_BOLSA).toFixed(2) + '\n\n';
    }

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

    // Esperar a que se guarde el pedido antes de limpiar el carrito
    const exito = await guardarPedidoEnExcel();
    
    if (exito) {
        // Limpiar solo si se guardó correctamente
        carritoArray = []; 
        actualizarCarritoUI();
    } else {
        alert('Hubo un problema al guardar el pedido. Por favor intenta de nuevo.');
    }

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

const PRECIO_BOLSA = 0.20;

function toggleBolsa() {
    const campo = document.getElementById('campo-bolsa');
    campo.classList.toggle('hidden');
    actualizarCarritoUI();
}

function cambiarCantidadBolsa(delta) {
    const input = document.getElementById('cantidad-bolsa');
    const actual = parseInt(input.value) || 1;
    const nueva = actual + delta;
    if (nueva >= 1) {
        input.value = nueva;
        actualizarCarritoUI();
    }
}

function obtenerCostoBolsas() {
    const check = document.getElementById('check-bolsa');
    if (!check || !check.checked) return 0;
    const cantidad = parseInt(document.getElementById('cantidad-bolsa').value);
    return (isNaN(cantidad) || cantidad < 1 ? 1 : cantidad) * PRECIO_BOLSA;
}

document.addEventListener('DOMContentLoaded', () => {
    const inputBolsa = document.getElementById('cantidad-bolsa');
    if (inputBolsa) {
        inputBolsa.addEventListener('input', actualizarCarritoUI);
    }
});

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
    actualizarCarritoUI();
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
        mostrarProductos(filtrarPorCategoria(categoriaActiva));
    }
    previoHorarioPanPapa = disponible;
}, 30000);

cargarProductos(); // Carga inicial de productos al abrir la página

// ==========================================================================
// HEADER AUTO-OCULTABLE (se oculta al hacer scroll hacia abajo)
// ==========================================================================
(function () {
    const header = document.getElementById('app-header');
    const cuerpo = document.body;
    if (!header) return;

    function medirHeader() {
        const alto = header.offsetHeight;
        if (alto > 0) header.style.setProperty('--header-alt', alto + 'px');
    }
    medirHeader();
    window.addEventListener('resize', medirHeader);

    let ultimoScroll = window.scrollY || 0;
    const umbral = 60; // píxeles de scroll antes de ocultarlo

    function alScroll() {
        const y = window.scrollY || 0;
        const bajando = y > ultimoScroll;

        if (bajando && y > umbral) {
            cuerpo.classList.add('header-oculto');
        } else if (!bajando) {
            cuerpo.classList.remove('header-oculto');
        }
        ultimoScroll = y;
    }

    window.addEventListener('scroll', alScroll, { passive: true });
    alScroll();
})();








