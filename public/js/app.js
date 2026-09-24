// Variable para rastrear la pestaña activa
let currentTab = 'dashboard';

// Navegación entre secciones (Tabs)
function navigate(tabId) {
  currentTab = tabId;

  // Ocultar todas las secciones
  document.querySelectorAll('.tab-content').forEach(section => {
    section.style.display = 'none';
  });

  // Remover clase activa de todos los botones
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Mostrar la sección seleccionada
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }

  // Activar el botón correspondiente
  const selectedBtn = document.getElementById(`btn-${tabId}`);
  if (selectedBtn) {
    selectedBtn.classList.add('active');
  }

  // Cargar datos según la pestaña activa
  if (tabId === 'dashboard') {
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof cargarEstadisticas === 'function') cargarEstadisticas();
  } else if (tabId === 'inventario') {
    if (typeof loadInventario === 'function') loadInventario();
    if (typeof cargarObjetos === 'function') cargarObjetos();
  } else if (tabId === 'prestamo') {
    if (typeof loadSelectObjetos === 'function') loadSelectObjetos();
  } else if (tabId === 'historial') {
    if (typeof loadHistorial === 'function') loadHistorial();
  }
}

// Mostrar avisos/alertas en pantalla
function showAlert(message, isError = false) {
  const alertBox = document.getElementById('alert-box');
  if (!alertBox) {
    alert(message);
    return;
  }
  alertBox.textContent = message;
  alertBox.className = isError ? 'alert alert-error' : 'alert alert-success';
  alertBox.style.display = 'block';

  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 4000);
}

// Control del Modal para Agregar Objeto
function toggleModal(show) {
  const modal = document.getElementById('modal-objeto');
  if (modal) {
    modal.style.display = show ? 'flex' : 'none';
  }
}

// -------------------------------------------------------------
// GESTIÓN DE OBJETOS (INVENTARIO)
// -------------------------------------------------------------

// Guardar Objeto en el Inventario (Protegido por Clave - Pide clave 1 SOLA VEZ)
async function guardarObjeto(event) {
  event.preventDefault();

  // 1. Pedir clave de administrador una sola vez
  const adminPassword = prompt("Ingrese la clave de administrador para registrar un objeto:");

  if (!adminPassword) {
    showAlert("Acceso denegado. Se requiere clave de administrador.", true);
    return;
  }

  // 2. Extraer los datos del formulario
  const objetoData = {
    codigo: document.getElementById('o-codigo')?.value || '',
    nombre: document.getElementById('o-nombre')?.value || '',
    categoria: document.getElementById('o-categoria')?.value || '',
    cantidad_total: parseInt(document.getElementById('o-cantidad')?.value || '1'),
    ubicacion: document.getElementById('o-ubicacion')?.value || ''
  };

  try {
    // 3. Enviar la petición a la API enviando la clave en el header x-admin-password
    const response = await fetch('/api/objetos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify(objetoData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al guardar el objeto');
    }

    // 4. Éxito: Limpiar formulario, cerrar modal y refrescar la tabla/dashboard
    showAlert("Objeto registrado exitosamente.");
    document.getElementById('form-objeto').reset();
    toggleModal(false);

    // Refrescar vistas
    if (typeof loadInventario === 'function') loadInventario();
    if (typeof cargarObjetos === 'function') cargarObjetos();
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof cargarEstadisticas === 'function') cargarEstadisticas();

  } catch (error) {
    console.error("Error en guardarObjeto:", error);
    showAlert(error.message, true);
  }
}

// Cargar tabla de Inventario
async function loadInventario() {
  try {
    const res = await fetch('/api/objetos');
    const data = await res.json();
    const tbody = document.getElementById('tabla-inventario');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay objetos registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(o => `
      <tr>
        <td><strong>${o.codigo}</strong></td>
        <td>${o.nombre}</td>
        <td><span class="badge">${o.categoria}</span></td>
        <td>${o.cantidad_disponible} / ${o.cantidad_total}</td>
        <td>${o.ubicacion}</td>
        <td>
          <button class="btn btn-sm" onclick="eliminarObjeto(${o.id})" style="background: #ef4444;">Eliminar</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Error al cargar inventario:", err);
  }
}

// Función alias para compatibilidad
async function cargarObjetos() {
  await loadInventario();
}

// Eliminar un objeto del inventario
async function eliminarObjeto(id) {
  const adminPassword = prompt("Ingrese la clave de administrador para eliminar:");
  if (!adminPassword) return;

  try {
    const res = await fetch(`/api/objetos/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
    const data = await res.json();

    if (res.ok) {
      showAlert('Objeto eliminado con éxito');
      loadInventario();
      loadDashboard();
    } else {
      showAlert(data.error || 'Error al eliminar', true);
    }
  } catch (err) {
    showAlert('Error de conexión', true);
  }
}

// -------------------------------------------------------------
// GESTIÓN DE PRÉSTAMOS
// -------------------------------------------------------------

// Cargar Selección de Objetos Disponibles en el Formulario de Préstamo
async function loadSelectObjetos() {
  try {
    const res = await fetch('/api/objetos');
    const data = await res.json();
    const select = document.getElementById('p-objeto');

    if (!select) return;

    const disponibles = Array.isArray(data) ? data.filter(o => o.cantidad_disponible > 0) : [];

    if (disponibles.length === 0) {
      select.innerHTML = '<option value="">-- No hay objetos disponibles --</option>';
    } else {
      select.innerHTML = disponibles
        .map(o => `<option value="${o.id}">${o.nombre} (Disponibles: ${o.cantidad_disponible})</option>`)
        .join('');
    }
  } catch (err) {
    console.error("Error al cargar objetos en select:", err);
  }
}

// Registrar un Préstamo
async function registrarPrestamo(event) {
  event.preventDefault();

  const prestamoData = {
    objeto_id: document.getElementById('p-objeto')?.value,
    solicitante: document.getElementById('p-solicitante')?.value,
    rol: document.getElementById('p-rol')?.value,
    fecha_prestamo: document.getElementById('p-fecha')?.value || new Date().toISOString().split('T')[0]
  };

  try {
    const res = await fetch('/api/prestamos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prestamoData)
    });

    const data = await res.json();

    if (res.ok) {
      showAlert('Préstamo registrado exitosamente');
      document.getElementById('form-prestamo').reset();
      navigate('historial');
    } else {
      showAlert(data.error || 'Error al registrar préstamo', true);
    }
  } catch (err) {
    showAlert('Error de conexión al registrar préstamo', true);
  }
}

// Registrar Devolución
async function registrarDevolucion(id) {
  try {
    const res = await fetch(`/api/prestamos/${id}/devolucion`, {
      method: 'PUT'
    });
    const data = await res.json();

    if (res.ok) {
      showAlert('Devolución registrada exitosamente');
      loadHistorial();
      loadDashboard();
    } else {
      showAlert(data.error || 'Error al procesar devolución', true);
    }
  } catch (err) {
    showAlert('Error de conexión con el servidor', true);
  }
}

// Cargar Historial de Préstamos
async function loadHistorial() {
  try {
    const res = await fetch('/api/prestamos');
    const data = await res.json();
    const tbody = document.getElementById('tabla-historial');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay préstamos registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(p => `
      <tr>
        <td>${p.objeto_nombre || 'N/A'}</td>
        <td>${p.solicitante} (${p.rol})</td>
        <td>${p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleDateString() : 'N/A'}</td>
        <td>${p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleDateString() : 'Pendiente'}</td>
        <td>
          <span class="badge ${p.estado === 'Devuelto' ? 'badge-success' : 'badge-warning'}">
            ${p.estado}
          </span>
        </td>
        <td>
          ${p.estado === 'Activo' 
            ? `<button class="btn btn-sm" onclick="registrarDevolucion(${p.id})">Devolver</button>` 
            : '-'
          }
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Error al cargar historial:", err);
  }
}

// -------------------------------------------------------------
// DASHBOARD / ESTADÍSTICAS
// -------------------------------------------------------------

// Cargar Métricas en el Dashboard
async function loadDashboard() {
  try {
    const resObj = await fetch('/api/objetos');
    const objetos = await resObj.json();

    const resPres = await fetch('/api/prestamos');
    const prestamos = await resPres.json();

    if (Array.isArray(objetos)) {
      const total = objetos.reduce((acc, o) => acc + (parseInt(o.cantidad_total) || 0), 0);
      const disp = objetos.reduce((acc, o) => acc + (parseInt(o.cantidad_disponible) || 0), 0);
      
      const elTotal = document.getElementById('stat-total');
      const elDisp = document.getElementById('stat-disponibles');
      if (elTotal) elTotal.textContent = total;
      if (elDisp) elDisp.textContent = disp;
    }

    if (Array.isArray(prestamos)) {
      const activos = prestamos.filter(p => p.estado === 'Activo').length;
      const elActivos = document.getElementById('stat-activos');
      if (elActivos) elActivos.textContent = activos;
    }
  } catch (err) {
    console.error("Error al cargar dashboard:", err);
  }
}

// Alias de compatibilidad
async function cargarEstadisticas() {
  await loadDashboard();
}

// -------------------------------------------------------------
// INICIALIZACIÓN
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');
});