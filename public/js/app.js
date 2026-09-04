document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

// Navegación Tab Single Page Application
function navigate(viewName) {
  const views = ['dashboard', 'inventario', 'prestamos', 'historial'];
  views.forEach(v => {
    document.getElementById(`view-${v}`).classList.add('hidden');
  });
  document.getElementById(`view-${viewName}`).classList.remove('hidden');

  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'inventario') loadInventario();
  if (viewName === 'prestamos') loadSelectObjetos();
  if (viewName === 'historial') loadHistorial();
}

// Mostrar Alertas del Sistema
function showAlert(message, isError = false) {
  const box = document.getElementById('alert-box');
  box.className = `bg-${isError ? 'red' : 'green'}`;
  box.style.backgroundColor = isError ? '#dc2626' : '#16a34a';
  box.textContent = message;
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 4000);
}

// Abrir / Cerrar Modal de Registro
function toggleModal(show) {
  const modal = document.getElementById('modal-objeto');
  if (show) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
    document.getElementById('form-objeto').reset();
  }
}

// Cargar Métricas Dashboard
async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();

    document.getElementById('dash-total').textContent = data.totalObjetos;
    document.getElementById('dash-disponibles').textContent = data.disponibles;
    document.getElementById('dash-prestados').textContent = data.prestados;
  } catch (err) {
    console.error("Error al cargar dashboard", err);
  }
}

// Cargar Inventario
async function loadInventario() {
  const res = await fetch('/api/objetos');
  const data = await res.json();
  const tbody = document.getElementById('table-inventario');
  
  tbody.innerHTML = data.map(item => `
    <tr>
      <td style="font-family: monospace; font-weight: bold;">${item.codigo}</td>
      <td style="font-weight: 600;">${item.nombre}</td>
      <td>${item.categoria}</td>
      <td style="text-align: center;">${item.cantidad_disponible} / ${item.cantidad_total}</td>
      <td>
        <span style="padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; background: ${item.cantidad_disponible > 0 ? '#dcfce7' : '#fee2e2'}; color: ${item.cantidad_disponible > 0 ? '#166534' : '#991b1b'};">
          ${item.estado}
        </span>
      </td>
      <td style="color: #64748b;">${item.ubicacion}</td>
    </tr>
  `).join('');
}

// Guardar Objeto en el Inventario (Protegido por Clave de Administrador)
async function guardarObjeto(event) {
  event.preventDefault();

  // 1. Pedir clave mediante prompt
  const adminPassword = prompt("Ingrese la clave de administrador para registrar un objeto:");

  if (!adminPassword) {
    showAlert("Acceso denegado. Se requiere clave de administrador.", true);
    return;
  }

  // 2. Preparar payload
  const payload = {
    codigo: document.getElementById('o-codigo').value,
    nombre: document.getElementById('o-nombre').value,
    categoria: document.getElementById('o-categoria').value,
    cantidad_total: parseInt(document.getElementById('o-cantidad').value),
    ubicacion: document.getElementById('o-ubicacion').value,
    descripcion: '',
    observaciones: ''
  };

  // 3. Enviar petición con la clave en las cabeceras
  try {
    const res = await fetch('/api/objetos', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (res.ok) {
      showAlert('Objeto registrado en el inventario con éxito');
      toggleModal(false);
      loadInventario();
    } else {
      showAlert(result.error || 'Clave de administrador incorrecta', true);
    }
  } catch (err) {
    showAlert('Error de conexión con el servidor', true);
  }
}

// Cargar Selección de Objetos Disponibles
async function loadSelectObjetos() {
  const res = await fetch('/api/objetos');
  const data = await res.json();
  const select = document.getElementById('p-objeto');
  
  const disponibles = data.filter(o => o.cantidad_disponible > 0);

  if (disponibles.length === 0) {
    select.innerHTML = '<option value="">-- No hay objetos disponibles --</option>';
  } else {
    select.innerHTML = disponibles
      .map(o => `<option value="${o.id}">${o.nombre} (Disponibles: ${o.cantidad_disponible})</option>`)
      .join('');
  }
}

// Registrar un Préstamo
async function registrarPrestamo(event) {
  event.preventDefault();
  const objetoId = document.getElementById('p-objeto').value;

  if (!objetoId) {
    showAlert('Por favor selecciona un objeto válido', true);
    return;
  }

  const payload = {
    estudiante: document.getElementById('p-estudiante').value,
    documento: document.getElementById('p-documento').value,
    curso: document.getElementById('p-curso').value,
    docente_responsable: document.getElementById('p-docente').value,
    objeto_id: objetoId,
    cantidad: parseInt(document.getElementById('p-cantidad').value)
  };

  const res = await fetch('/api/prestamos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await res.json();

  if (res.ok) {
    showAlert('Préstamo registrado exitosamente');
    document.getElementById('form-prestamo').reset();
    navigate('historial');
  } else {
    showAlert(result.error, true);
  }
}

// Cargar Historial y Botón Devolver
async function loadHistorial() {
  const res = await fetch('/api/prestamos');
  const data = await res.json();
  const tbody = document.getElementById('table-historial');

  tbody.innerHTML = data.map(p => `
    <tr>
      <td><b>${p.estudiante}</b><br><small style="color:#64748b">${p.curso}</small></td>
      <td>${p.objeto_nombre}</td>
      <td style="text-align: center;">${p.cantidad}</td>
      <td style="font-size: 0.85rem;">${p.fecha_prestamo} ${p.hora_prestamo}</td>
      <td style="font-size: 0.85rem;">${p.fecha_devolucion ? `${p.fecha_devolucion} ${p.hora_devolucion}` : '—'}</td>
      <td style="text-align: center;">
        <span style="padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; background: ${p.estado === 'Devuelto' ? '#e2e8f0' : '#fef3c7'}; color: ${p.estado === 'Devuelto' ? '#475569' : '#92400e'};">
          ${p.estado}
        </span>
      </td>
      <td style="text-align: center;">
        ${p.estado === 'Prestado' ? `
          <button onclick="devolverObjeto(${p.id})" class="btn btn-sm">
            Devolver
          </button>
        ` : '—'}
      </td>
    </tr>
  `).join('');
}

// Procesar Devolución de Objeto
async function devolverObjeto(prestamoId) {
  const res = await fetch(`/api/prestamos/${prestamoId}/devolver`, { method: 'POST' });
  const result = await res.json();

  if (res.ok) {
    showAlert('Devolución procesada correctamente');
    loadHistorial();
  } else {
    showAlert(result.error, true);
  }
}