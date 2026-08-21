// Formateador limpio de Fecha y Hora en Colombia
function formatearFechaHora(fechaRaw, horaRaw) {
  if (!fechaRaw) return '—';
  const fecha = String(fechaRaw).split('T')[0];
  if (!horaRaw) return fecha;
  const hora = String(horaRaw).substring(0, 5);
  return `${fecha} | ${hora}`;
}

// 1. Cargar datos del Dashboard
async function cargarDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    
    // Asigna los valores buscando por IDs comunes o los primeros números
    const numeros = document.querySelectorAll('h2, h3, .card h2, .card div');
    if (numeros.length >= 3) {
      numeros[0].innerText = data.totalObjetos || 0;
      numeros[1].innerText = data.disponibles || 0;
      numeros[2].innerText = data.prestados || 0;
    }
  } catch (err) {
    console.error('Error al cargar dashboard:', err);
  }
}

// 2. Formatear automáticamente cualquier tabla de historial que exista
async function corregirFechasTabla() {
  try {
    const res = await fetch('/api/prestamos');
    const prestamos = await res.json();
    const tbodies = document.querySelectorAll('table tbody');
    
    // Si hay tablas en pantalla, actualizar la que tiene las fechas
    tbodies.forEach(tbody => {
      const filas = tbody.querySelectorAll('tr');
      filas.forEach((fila, index) => {
        const p = prestamos[index];
        if (p) {
          const celdas = fila.querySelectorAll('td');
          if (celdas.length >= 5) {
            celdas[3].innerText = formatearFechaHora(p.fecha_prestamo, p.hora_prestamo);
            if (p.fecha_devolucion) {
              celdas[4].innerText = formatearFechaHora(p.fecha_devolucion, p.hora_devolucion);
            }
          }
        }
      });
    });
  } catch (err) {
    console.error('Error al formatear fechas:', err);
  }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarDashboard();
  corregirFechasTabla();
});
