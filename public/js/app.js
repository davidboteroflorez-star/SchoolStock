// Navegación entre pestañas
function navigate(tabId) {
  // Ocultar todas las secciones
  const sections = document.querySelectorAll('.tab-content');
  sections.forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });

  // Quitar estado activo a todos los botones
  const buttons = document.querySelectorAll('.nav-btn');
  buttons.forEach(btn => btn.classList.remove('active'));

  // Mostrar la sección elegida
  const targetSection = document.getElementById(tabId);
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
  }

  // Activar el botón correspondiente
  const targetBtn = document.getElementById(`btn-${tabId}`);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }

  // Cargar los datos del backend según la pestaña
  if (tabId === 'dashboard') {
    loadDashboard();
  } else if (tabId === 'inventario') {
    loadInventario();
  } else if (tabId === 'prestamo') {
    loadSelectObjetos();
    // Establecer fecha de hoy por defecto
    const fechaInput = document.getElementById('p-fecha');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];
  } else if (tabId === 'historial') {
    loadHistorial();
  }
}

// Ventana flotante de alertas
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

// Modal para nuevo objeto
function toggleModal(show) {
  const modal = document.getElementById('modal-objeto');
  if (modal) {
    modal.style.display = show ? 'flex' : 'none';
  }
}

// Guardar objeto (Solicita clave de admin 1 sola vez)
async function guardarObjeto(event) {
  event.preventDefault();

  const adminPassword = prompt("Ingrese la clave de administrador para registrar el objeto:");
  if (!adminPassword) {
    showAlert("Operación cancelada. Se requiere clave de administrador.", true);
    return;
  }

  const objetoData = {
    codigo: document.getElementById('o-codigo')?.value || '',
    nombre: document.getElementById('o-nombre')?.value || '',
    categoria: document.getElementById('o-categoria')?.value || '',
    cantidad_total: parseInt(document.getElementById('o-cantidad')?.value || '1'),
    ubicacion: document.getElementById('o-ubicacion')?.value || ''
  };

  try {
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

    showAlert("Objeto registrado exitosamente.");
    document.getElementById('form-objeto').reset();
    toggleModal(false);
    loadInventario();
    loadDashboard();

  } catch (error) {
    console.error("Error en guardarObjeto:", error);
    showAlert(error.message, true);
  }
}

// Cargar Inventario
async function loadInventario() {
  try {
    const res = await fetch('/api/objetos');
    if (!res.ok) return;
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
        <td><span class="badge badge-success">${o.categoria}</span></td>
        <td>${o.cantidad_disponible} / ${o.cantidad_total}</td>
        <td>${o.ubicacion}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="eliminarObjeto(${o.id})">Eliminar</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Error al cargar inventario:", err);
  }
}

// Eliminar objeto
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

// Cargar objetos en el selector de préstamo
async function loadSelectObjetos() {
  try {
    const res = await fetch('/api/objetos');
    if (!res.ok) return;
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

// Registrar Préstamo
async function registrarPrestamo(event) {
  event.preventDefault();

  const inputFecha = document.getElementById('p-fecha')?.value;
  // Convertir a YYYY-MM-DD independientemente del formato del navegador
  const fechaFormateada = inputFecha ? new Date(inputFecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const prestamoData = {
    objeto_id: parseInt(document.getElementById('p-objeto')?.value, 10),
    solicitante: document.getElementById('p-solicitante')?.value,
    rol: document.getElementById('p-rol')?.value,
    fecha_prestamo: fechaFormateada
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

// Cargar Historial
async function loadHistorial() {
  try {
    const res = await fetch('/api/prestamos');
    if (!res.ok) return;
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

// Cargar métricas del Dashboard
async function loadDashboard() {
  try {
    const resObj = await fetch('/api/objetos');
    const resPres = await fetch('/api/prestamos');

    if (resObj.ok) {
      const objetos = await resObj.json();
      if (Array.isArray(objetos)) {
        const total = objetos.reduce((acc, o) => acc + (parseInt(o.cantidad_total) || 0), 0);
        const disp = objetos.reduce((acc, o) => acc + (parseInt(o.cantidad_disponible) || 0), 0);
        
        const elTotal = document.getElementById('stat-total');
        const elDisp = document.getElementById('stat-disponibles');
        if (elTotal) elTotal.textContent = total;
        if (elDisp) elDisp.textContent = disp;
      }
    }

    if (resPres.ok) {
      const prestamos = await resPres.json();
      if (Array.isArray(prestamos)) {
        const activos = prestamos.filter(p => p.estado === 'Activo').length;
        const elActivos = document.getElementById('stat-activos');
        if (elActivos) elActivos.textContent = activos;
      }
    }
  } catch (err) {
    console.error("Error al cargar dashboard:", err);
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');
});