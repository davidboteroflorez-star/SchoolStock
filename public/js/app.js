// Formateador de Fecha y Hora (Colombia)
function formatearFechaHora(fechaRaw, horaRaw) {
  if (!fechaRaw) return '—';
  const fecha = String(fechaRaw).split('T')[0];
  if (!horaRaw) return fecha;
  const hora = String(horaRaw).substring(0, 5);
  return `${fecha} | ${hora}`;
}

// Función principal para cambiar de pestaña
window.mostrarSeccion = function(seccionId) {
  // Buscar todas las secciones (por clase .seccion o por contenedores principales)
  const secciones = document.querySelectorAll('.seccion, main > div, #content > div');
  secciones.forEach(sec => {
    if (sec.id) sec.style.display = 'none';
  });

  // Intentar mostrar la sección seleccionada
  const activa = document.getElementById(seccionId);
  if (activa) {
    activa.style.display = 'block';
  } else {
    // Si el ID varía (ej: 'sec-inventario'), buscar por coincidencia
    const alternat = Array.from(secciones).find(s => s.id && s.id.toLowerCase().includes(seccionId));
    if (alternat) alternat.style.display = 'block';
  }

  // Cargar datos según la pestaña activa
  if (seccionId.includes('dash')) cargarDashboard();
  if (seccionId.includes('inven')) cargarInventario();
  if (seccionId.includes('prest') || seccionId.includes('nuevo')) cargarOpcionesPrestamo();
  if (seccionId.includes('histor')) cargarHistorial();
};

// Vinculador automático de eventos en el Menú Lateral
document.addEventListener('DOMContentLoaded', () => {
  // Detectar clics en cualquier enlace o botón del menú
  const enlacesMenu = document.querySelectorAll('#sidebar a, .sidebar a, nav a, button');
  
  enlacesMenu.forEach(link => {
    link.addEventListener('click', (e) => {
      const texto = link.innerText.toLowerCase();
      
      if (texto.includes('dash') || texto.includes('panel')) {
        e.preventDefault();
        mostrarSeccion('dashboard');
      } else if (texto.includes('inven')) {
        e.preventDefault();
        mostrarSeccion('inventario');
      } else if (texto.includes('prest') || texto.includes('nuevo')) {
        e.preventDefault();
        mostrarSeccion('prestamo');
      } else if (texto.includes('histor')) {
        e.preventDefault();
        mostrarSeccion('historial');
      }
    });
  });

  // Cargar Dashboard al iniciar
  mostrarSeccion('dashboard');
});

// 1. DASHBOARD
async function cargarDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    
    const elemTotal = document.getElementById('dash-total') || document.querySelectorAll('h2, h3')[0];
    const elemDisp = document.getElementById('dash-disponibles') || document.querySelectorAll('h2, h3')[1];
    const elemPrest = document.getElementById('dash-prestados') || document.querySelectorAll('h2, h3')[2];

    if (elemTotal) elemTotal.innerText = data.totalObjetos || 0;
    if (elemDisp) elemDisp.innerText = data.disponibles || 0;
    if (elemPrest) elemPrest.innerText = data.prestados || 0;
  } catch (err) {
    console.error('Error al cargar dashboard:', err);
  }
}

// 2. INVENTARIO
async function cargarInventario() {
  try {
    const res = await fetch('/api/objetos');
    const objetos = await res.json();
    const tbody = document.querySelector('#tabla-inventario, #inventario table tbody, table tbody');
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
    console.error('Error inventario:', err);
  }
}

// 3. OPCIONES DE PRÉSTAMO
async function cargarOpcionesPrestamo() {
  try {
    const res = await fetch('/api/objetos');
    const objetos = await res.json();
    const select = document.querySelector('#prestamo-objeto, select[name="objeto"]');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione un objeto...</option>' + 
      objetos
        .filter(o => o.cantidad_disponible > 0)
        .map(o => `<option value="${o.id}">${o.nombre} (${o.codigo}) - Disp: ${o.cantidad_disponible}</option>`)
        .join('');
  } catch (err) {
    console.error('Error opciones:', err);
  }
}

// 4. HISTORIAL
async function cargarHistorial() {
  try {
    const res = await fetch('/api/prestamos');
    const prestamos = await res.json();
    const tbody = document.querySelectorAll('table tbody')[1] || document.querySelector('#tabla-historial');
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
    console.error('Error historial:', err);
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