// Formateador seguro de Fecha y Hora
function formatearFechaHora(fechaRaw, horaRaw) {
  if (!fechaRaw) return '—';
  
  const fecha = String(fechaRaw).split('T')[0];
  if (!horaRaw) return fecha;
  
  const hora = String(horaRaw).substring(0, 5);
  return `${fecha} | ${hora}`;
}

// Navegación segura entre pestañas
window.mostrarSeccion = function(seccionId) {
  document.querySelectorAll('.seccion').forEach(sec => sec.style.display = 'none');
  
  const seccionActiva = document.getElementById(seccionId);
  if (seccionActiva) {
    seccionActiva.style.display = 'block';
  }

  if (seccionId === 'dashboard') cargarDashboard();
  if (seccionId === 'inventario') cargarInventario();
  if (seccionId === 'prestamo') cargarOpcionesPrestamo();
  if (seccionId === 'historial') cargarHistorial();
};

// 1. DASHBOARD
async function cargarDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    
    if (document.getElementById('dash-total')) document.getElementById('dash-total').innerText = data.totalObjetos || 0;
    if (document.getElementById('dash-disponibles')) document.getElementById('dash-disponibles').innerText = data.disponibles || 0;
    if (document.getElementById('dash-prestados')) document.getElementById('dash-prestados').innerText = data.prestados || 0;
  } catch (err) {
    console.error('Error al cargar dashboard:', err);
  }
}

// 2. INVENTARIO
async function cargarInventario() {
  try {
    const res = await fetch('/api/objetos');
    const objetos = await res.json();
    
    const tbody = document.getElementById('tabla-inventario');
    if (!tbody) return;
    
    tbody.innerHTML = objetos.map(obj => `
      <tr>
        <td><b>${obj.codigo}</b></td>
        <td>${obj.nombre}</td>
        <td>${obj.categoria}</td>
        <td>${obj.cantidad_disponible} / ${obj.cantidad_total}</td>
        <td><span class="badge ${obj.estado === 'Disponible' ? 'bg-success' : 'bg-danger'}">${obj.estado}</span></td>
        <td>${obj.ubicacion}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error al cargar inventario:', err);
  }
}

// Formulario Guardar Objeto
document.addEventListener('DOMContentLoaded', () => {
  const formObjeto = document.getElementById('form-objeto');
  if (formObjeto) {
    formObjeto.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        nombre: document.getElementById('obj-nombre').value,
        categoria: document.getElementById('obj-categoria').value,
        codigo: document.getElementById('obj-codigo').value,
        descripcion: document.getElementById('obj-descripcion').value,
        cantidad_total: parseInt(document.getElementById('obj-cantidad').value),
        ubicacion: document.getElementById('obj-ubicacion').value,
        observaciones: ''
      };

      const res = await fetch('/api/objetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert('Objeto guardado.');
        formObjeto.reset();
        cargarInventario();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    });
  }

  const formPrestamo = document.getElementById('form-prestamo');
  if (formPrestamo) {
    formPrestamo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        estudiante: document.getElementById('prestamo-estudiante').value,
        documento: document.getElementById('prestamo-documento').value,
        curso: document.getElementById('prestamo-curso').value,
        docente_responsable: document.getElementById('prestamo-docente').value,
        objeto_id: parseInt(document.getElementById('prestamo-objeto').value),
        cantidad: parseInt(document.getElementById('prestamo-cantidad').value),
        observaciones: ''
      };

      const res = await fetch('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert('Préstamo registrado.');
        formPrestamo.reset();
        mostrarSeccion('historial');
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    });
  }

  // Cargar sección por defecto
  mostrarSeccion('dashboard');
});

// 3. OPCIONES PRÉSTAMO
async function cargarOpcionesPrestamo() {
  try {
    const res = await fetch('/api/objetos');
    const objetos = await res.json();
    const select = document.getElementById('prestamo-objeto');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione un objeto...</option>' + 
      objetos
        .filter(o => o.cantidad_disponible > 0)
        .map(o => `<option value="${o.id}">${o.nombre} (${o.codigo}) - Disp: ${o.cantidad_disponible}</option>`)
        .join('');
  } catch (err) {
    console.error('Error al cargar opciones:', err);
  }
}

// 4. HISTORIAL Y DEVOLUCIONES
async function cargarHistorial() {
  try {
    const res = await fetch('/api/prestamos');
    const prestamos = await res.json();
    const tbody = document.getElementById('tabla-historial');
    if (!tbody) return;

    tbody.innerHTML = prestamos.map(p => `
      <tr>
        <td><b>${p.estudiante}</b><br><small class="text-muted">${p.curso}</small></td>
        <td>${p.objeto_nombre}</td>
        <td>${p.cantidad}</td>
        <td>${formatearFechaHora(p.fecha_prestamo, p.hora_prestamo)}</td>
        <td>${formatearFechaHora(p.fecha_devolucion, p.hora_devolucion)}</td>
        <td><span class="badge ${p.estado === 'Prestado' ? 'bg-warning text-dark' : 'bg-secondary'}">${p.estado}</span></td>
        <td>
          ${p.estado === 'Prestado' 
            ? `<button class="btn btn-sm btn-success" onclick="devolverObjeto(${p.id})">Devolver</button>` 
            : '—'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error al cargar historial:', err);
  }
}

window.devolverObjeto = async function(id) {
  if (!confirm('¿Confirmar devolución?')) return;

  const res = await fetch(`/api/prestamos/${id}/devolver`, { method: 'POST' });
  if (res.ok) {
    alert('Devolución registrada.');
    cargarHistorial();
  } else {
    const err = await res.json();
    alert(`Error: ${err.error}`);
  }
};