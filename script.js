


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
        card.className = 'producto-card';
        card.innerHTML = `
            <div class="producto-info">
                <h3>${p.producto} </h3>
                <p class="specs">${p.especificacion} - ${p.peso_gr}gr</p>
                <p class="topping">Topping: <strong>${p.topping}</strong></p>
                <p class="pack">Paquete: ${p.unidades_pqte} unid.</p>
            </div>
            <div class="producto-footer">
                <span class="precio">$${parseFloat(p.precio).toFixed(2)}</span>
                
                <div class="cantidad-control">
                    <input type="number" id="cant-${p.id}" value="1" min="1" max="99">
                    <button class="btn-add" onclick="agregarAlCarrito('${p.id}')">
                        <i class="fas fa-plus"></i> Agregar
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
                cantidad: cantidad // Guardamos la cantidad elegida
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
        totalAcumulado += subtotal;
        itemsTotales += item.cantidad;

        const divItem = document.createElement('div');
        divItem.className = 'carrito-item-render';
        divItem.innerHTML = `
            <div class="item-carrito-flex">
                <div class="item-detalles">
                    <p><strong>${item.cantidad}x</strong> ${item.producto} ${item.categoria}</p>
                    <small>${item.topping} - $${subtotal.toFixed(2)}</small>
                </div>
                <button onclick="eliminarDelCarrito(${index})" class="btn-eliminar">
                    <i class="fas fa-times"></i> X
                </button>
            </div>
        `;
        listaCarrito.appendChild(divItem);
    });

    totalPrecioElemento.innerText = `$${totalAcumulado.toFixed(2)}`;
    cartCountElement.innerText = itemsTotales;
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
                return false;
            });
            mostrarProductos(filtrados);
        }
    });
});

// Control del Sidebar
document.getElementById('ver-carrito').addEventListener('click', () => {
    sidebarCarrito.classList.remove('carrito-hidden');
});

document.getElementById('close-cart').addEventListener('click', () => {
    sidebarCarrito.classList.add('carrito-hidden');
});

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
                "Numero_Telefono": "58" + document.getElementById('cliente-telefono').value || "No proporcionado",
                "Producto": p.producto,
                "Especificacion": p.especificacion,
                "Peso": p.peso,
                "Topping": p.topping,
                "Cantidad": p.cantidad,
                "Subtotal": (p.precio * p.cantidad).toFixed(2),
                "Total_Pedido": totalGlobal,
                "Fecha": fechaActual
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

        carritoArray = []; 
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

// Función para mostrar el modal con los datos
function mostrarResumenPedido(total, productos) {
    
    const contenedorResumen = document.getElementById('detalle-orden');
    const modal = document.getElementById('modal-resumen');
    
    const nroOrden = Math.floor(Math.random() * 900) + 100; // Un número un poco más serio
    
    let htmlProductos = `<h3>Orden #${nroOrden}</h3>`;
    
    // Usamos el parámetro 'productos' en lugar de la variable global 'carritoArray'
    productos.forEach(p => {
        htmlProductos += `
            <p><strong>${p.cantidad}x</strong> ${p.producto} (${p.topping})</p>
            
        `;
    });
    
    htmlProductos += `<hr><p style="font-size:1.2rem"><strong>Total: $${total}</strong></p>
        <button class="btn-descargar" onclick="descargarPDF()">Descargar PDF</button>
        <button class="btn-cerrar" onclick="cerrarResumen()">Cerrar</button>
    `;

    
    contenedorResumen.innerHTML = htmlProductos;
    modal.style.display = 'flex';
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

// Función para cerrar el modal
function cerrarResumen() {
    document.getElementById('modal-resumen').style.display = 'none';
}




cargarProductos(); // Carga inicial de productos al abrir la página



cargarProductos(); // Carga inicial de productos al abrir la página


