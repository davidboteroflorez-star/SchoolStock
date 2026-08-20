// Formateador de Fecha y Hora (Colombia)
function formatearFechaHora(fechaRaw, horaRaw) {
  if (!fechaRaw) return '—';
  const fecha = String(fechaRaw).split('T')[0];
  if (!horaRaw) return fecha;
  const hora = String(horaRaw).substring(0, 5);
  return `${fecha} | ${hora}`;
}

// Lista exacta de las 4 secciones del sistema
const SECCIONES = ['dashboard', 'inventario', 'prestamo', 'historial'];

window.mostrarSeccion = function(seccionId) {
  // Ocultar únicamente las 4 secciones conocidas sin tocar el contenedor principal
  SECCIONES.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Mostrar la sección solicitada
  const objetivo = document.getElementById(seccionId);
  if (objetivo) {
    objetivo.style.display = 'block';
  }

  // Cargar datos correspondientes
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
    
    const elemTotal = document.getElementById('dash-total');
    const elemDisp = document.getElementById('dash-disponibles');
    const elemPrest = document.getElementById('dash-prestados');

    if (elemTotal) elemTotal.innerText = data.totalObjetos || 0;
    if (elemDisp) elemDisp.innerText = data.disponibles || 0;
    if (elemPrest) elemPrest.innerText = data.prestados || 0;
  } catch (err) {
    console.error('Error en dashboard:', err);
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
    console.error('Error en inventario:', err);
  }
}

// 3. PRÉSTAMO
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
    console.error('Error en opciones de préstamo:', err);
  }
}

// 4. HISTORIAL
async function cargarHistorial() {
  try {
    const res = await fetch('/api/prestamos');
    const prestamos = await res.json();
    const tbody = document.getElementById('tabla-historial');
    if (!tbody) return;

    tbody.innerHTML = prestamos.map(p => `
      <tr>
        <td><b>${p.estudiante}</b><br><small>${p.curso}</small></td>
        <td>${p.objeto_nombre}</td>
        <td>${p.cantidad}</td>
        <td>${formatearFechaHora(p.fecha_prestamo, p.hora_prestamo)}</td>
        <td>${formatearFechaHora(p.fecha_devolucion, p.hora_devolucion)}</td>
        <td><span class="badge ${p.estado === 'Prestado' ? 'bg-warning' : 'bg-secondary'}">${p.estado}</span></td>
        <td>
          ${p.estado === 'Prestado' 
            ? `<button class="btn btn-sm btn-success" onclick="devolverObjeto(${p.id})">Devolver</button>` 
            : '—'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error en historial:', err);
  }
}

window.devolverObjeto = async function(id) {
  if (!confirm('¿Confirmar devolución?')) return;
  const res = await fetch(`/api/prestamos/${id}/devolver`, { method: 'POST' });
  if (res.ok) {
    alert('Devolución registrada.');
    cargarHistorial();
  }
};

// Cargar la pestaña inicial al entrar
document.addEventListener('DOMContentLoaded', () => {
  mostrarSeccion('dashboard');
});
