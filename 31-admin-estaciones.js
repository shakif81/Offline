const COLORES_ESTACION = [
    { valor: '#10b981', nombre: 'Verde esmeralda' },
    { valor: '#3b82f6', nombre: 'Azul' },
    { valor: '#8b5cf6', nombre: 'Morado' },
    { valor: '#f59e0b', nombre: 'Naranja' },
    { valor: '#ef4444', nombre: 'Rojo' },
    { valor: '#ec4899', nombre: 'Rosa' },
    { valor: '#14b8a6', nombre: 'Turquesa' },
    { valor: '#6366f1', nombre: 'Índigo' },
    { valor: '#64748b', nombre: 'Gris pizarra' },
    { valor: '#1e293b', nombre: 'Negro' }
];

window.APP.adminEstacionColorSeleccionado = '#10b981';

async function cargarAdminEstaciones() {
    const container = document.getElementById('adminEstacionesList');
    const contador = document.getElementById('adminEstacionesContador');
    if (!container) return;

    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">⏳ Cargando...</div>';

    const [estaciones, montajes] = await Promise.all([
        cargarFirebase('estaciones', true),
        cargarFirebase('montajes')
    ]);

    const busqueda = (document.getElementById('adminEstacionesBusqueda')?.value || '').toLowerCase().trim();
    const filtro = document.getElementById('filtroModeloAdminEstaciones')?.value || 'todos';

    let arr = Object.entries(estaciones);

    if (filtro !== 'todos') arr = arr.filter(([id, e]) => e.modelo === filtro);
    if (busqueda) {
        arr = arr.filter(([id, e]) =>
            (e.nombre || '').toLowerCase().includes(busqueda) ||
            (e.descripcion || '').toLowerCase().includes(busqueda)
        );
    }

    arr.sort((a, b) => {
        if (a[1].modelo !== b[1].modelo) return a[1].modelo === 'MS3' ? -1 : 1;
        const numA = parseInt((a[1].nombre || '').match(/(\d+)/)?.[0] || '99');
        const numB = parseInt((b[1].nombre || '').match(/(\d+)/)?.[0] || '99');
        return numA - numB;
    });

    if (contador) contador.textContent = `${arr.length} estación${arr.length !== 1 ? 'es' : ''}`;

    if (!arr.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                ${busqueda ? '🔍 Sin resultados para "' + busqueda + '"' : '📭 No hay estaciones. Crea la primera.'}
            </div>
        `;
        return;
    }

    const colores = {
        MS3: { bg: '#ecfdf5', border: '#a7f3d0', accent: '#10b981', text: '#047857', icono: '🔷' },
        DC3: { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', icono: '🔶' }
    };

    container.innerHTML = arr.map(([id, est]) => {
        const p = colores[est.modelo] || colores.MS3;
        const numMontajes = Object.values(montajes).filter(m => m.puntoId === id).length;
        const tieneMontajes = numMontajes > 0;

        return `
            <div onclick="editarEstacionAdmin('${id}')"
                style="background:white;border:1px solid ${p.border};border-left:4px solid ${p.accent};border-radius:14px;padding:14px 16px;cursor:pointer;transition:all 0.2s ease;position:relative;overflow:hidden;"
                onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px ${p.accent}22';"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='';">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <span style="background:${p.bg};color:${p.text};padding:4px 8px;border-radius:8px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;gap:4px;">${p.icono} ${est.modelo || 'MS3'}</span>
                    <button onclick="event.stopPropagation();duplicarEstacionAdmin('${id}')"
                        style="background:white;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.7rem;color:#64748b;cursor:pointer;font-family:inherit;font-weight:600;"
                        onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">📋 Copiar</button>
                </div>

                <div style="font-weight:700;font-size:0.95rem;color:#1e293b;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📍 ${est.nombre || 'Sin nombre'}</div>

                ${est.descripcion ? `
                    <div style="font-size:0.78rem;color:#64748b;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${est.descripcion}</div>
                ` : `
                    <div style="font-size:0.78rem;color:#cbd5e1;font-style:italic;margin-bottom:8px;">Sin descripción</div>
                `}

                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid #f1f5f9;">
                    <span style="font-size:0.72rem;color:${tieneMontajes ? '#64748b' : '#94a3b8'};font-weight:600;display:flex;align-items:center;gap:4px;">📦 ${numMontajes} montaje${numMontajes !== 1 ? 's' : ''}</span>
                    <span style="font-size:1rem;color:${p.accent};opacity:0.6;">→</span>
                </div>
            </div>
        `;
    }).join('');
}

function mostrarFormNuevaEstacion() {
    document.getElementById('adminEstacionesForm').style.display = 'block';
    document.getElementById('adminEstacionFormTitulo').textContent = 'Nueva Estación';

    document.getElementById('adminEstacionId').value = '';
    document.getElementById('adminEstacionNombre').value = '';
    document.getElementById('adminEstacionDescripcion').value = '';
    document.getElementById('radioModeloMS3').checked = true;
    document.getElementById('btnEliminarEstacion').style.display = 'none';

    window.APP.adminEstacionColorSeleccionado = '#10b981';
    rellenarSelectorColoresEstacion('#10b981');

    actualizarEstilosRadios();
    actualizarPreviewEstacion();

    document.getElementById('adminEstacionesForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('adminEstacionNombre').focus(), 300);
}

function editarEstacionAdmin(id) {
    cargarFirebase('estaciones').then(estaciones => {
        const est = estaciones[id];
        if (!est) return;

        document.getElementById('adminEstacionesForm').style.display = 'block';
        document.getElementById('adminEstacionFormTitulo').textContent = 'Editar Estación';

        document.getElementById('adminEstacionId').value = id;
        document.getElementById('adminEstacionNombre').value = est.nombre || '';
        document.getElementById('adminEstacionDescripcion').value = est.descripcion || '';

        if (est.modelo === 'DC3') document.getElementById('radioModeloDC3').checked = true;
        else document.getElementById('radioModeloMS3').checked = true;

        document.getElementById('btnEliminarEstacion').style.display = 'inline-flex';

        const colorGuardado = est.color || '#10b981';
        window.APP.adminEstacionColorSeleccionado = colorGuardado;
        rellenarSelectorColoresEstacion(colorGuardado);

        actualizarEstilosRadios();
        actualizarPreviewEstacion();

        document.getElementById('adminEstacionesForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function cerrarFormEstacion() {
    document.getElementById('adminEstacionesForm').style.display = 'none';
    document.getElementById('adminEstacionId').value = '';
    document.getElementById('adminEstacionNombre').value = '';
    document.getElementById('adminEstacionDescripcion').value = '';
    document.getElementById('radioModeloMS3').checked = true;
    document.getElementById('btnEliminarEstacion').style.display = 'none';
}

function actualizarEstilosRadios() {
    const ms3Checked = document.getElementById('radioModeloMS3')?.checked;
    const dc3Checked = document.getElementById('radioModeloDC3')?.checked;

    const labelMS3 = document.getElementById('radioModeloMS3Label');
    const labelDC3 = document.getElementById('radioModeloDC3Label');

    if (labelMS3) {
        if (ms3Checked) {
            labelMS3.style.borderColor = '#10b981';
            labelMS3.style.background = '#ecfdf5';
            labelMS3.style.color = '#047857';
        } else {
            labelMS3.style.borderColor = '#cbd5e1';
            labelMS3.style.background = 'white';
            labelMS3.style.color = '#64748b';
        }
    }

    if (labelDC3) {
        if (dc3Checked) {
            labelDC3.style.borderColor = '#3b82f6';
            labelDC3.style.background = '#eff6ff';
            labelDC3.style.color = '#1d4ed8';
        } else {
            labelDC3.style.borderColor = '#cbd5e1';
            labelDC3.style.background = 'white';
            labelDC3.style.color = '#64748b';
        }
    }
}

function actualizarPreviewEstacion() {
    actualizarEstilosRadios();

    const preview = document.getElementById('adminEstacionPreview');
    if (!preview) return;

    const nombre = document.getElementById('adminEstacionNombre')?.value || 'Sin nombre';
    const descripcion = document.getElementById('adminEstacionDescripcion')?.value || '';
    const modelo = document.getElementById('radioModeloDC3')?.checked ? 'DC3' : 'MS3';
    const colorCustom = window.APP.adminEstacionColorSeleccionado || '#10b981';

    const p = {
        bg: colorCustom + '20',
        border: colorCustom + '60',
        accent: colorCustom,
        text: colorCustom,
        icono: modelo === 'MS3' ? '🔷' : '🔶'
    };

    preview.innerHTML = `
        <div style="width:40px;height:40px;background:${p.bg};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">📍</div>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nombre}</div>
            <div style="font-size:0.75rem;color:${p.text};font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;">
                <span>${p.icono} ${modelo}</span>
                ${descripcion ? `<span style="color:#cbd5e1;">·</span><span style="color:#64748b;font-weight:400;">${descripcion}</span>` : ''}
            </div>
        </div>
    `;
}

function rellenarSelectorColoresEstacion(colorSeleccionado) {
    const container = document.getElementById('adminEstacionColorPicker');
    if (!container) return;

    container.innerHTML = COLORES_ESTACION.map(c => `
        <div onclick="seleccionarColorEstacion('${c.valor}')"
            title="${c.nombre}"
            style="
                width: 36px;
                height: 36px;
                border-radius: 10px;
                background: ${c.valor};
                cursor: pointer;
                border: 3px solid ${c.valor === colorSeleccionado ? 'white' : 'transparent'};
                box-shadow: ${c.valor === colorSeleccionado ? `0 0 0 2px ${c.valor}, 0 2px 8px rgba(0,0,0,0.15)` : '0 1px 3px rgba(0,0,0,0.1)'};
                transition: all 0.15s ease;
            "></div>
    `).join('');
}

function seleccionarColorEstacion(color) {
    window.APP.adminEstacionColorSeleccionado = color;
    rellenarSelectorColoresEstacion(color);
    actualizarPreviewEstacion();
}

async function guardarEstacionAdmin() {
    const id = document.getElementById('adminEstacionId').value || 'est_' + Date.now();
    const nombre = document.getElementById('adminEstacionNombre').value.trim();
    const descripcion = document.getElementById('adminEstacionDescripcion').value.trim();
    const modelo = document.getElementById('radioModeloDC3').checked ? 'DC3' : 'MS3';

    if (!nombre) {
        alertar('El nombre de la estación es obligatorio', { tipo: 'warning' });
        document.getElementById('adminEstacionNombre').focus();
        return;
    }
    if (nombre.length < 2) {
        alertar('El nombre es demasiado corto', { tipo: 'warning' });
        return;
    }

    const estaciones = await cargarFirebase('estaciones');
    const duplicado = Object.entries(estaciones).find(([oid, e]) =>
        oid !== id && e.modelo === modelo && (e.nombre || '').toLowerCase() === nombre.toLowerCase()
    );
    if (duplicado) {
        alertar(`Ya existe una estación llamada "${nombre}" en el modelo ${modelo}`, { tipo: 'warning' });
        return;
    }

    const color = window.APP.adminEstacionColorSeleccionado || '#10b981';

mostrarLoading('Guardando estación...');
const ok = await guardarFirebase('estaciones', id, { nombre, descripcion, modelo, color });
ocultarLoading();

    if (ok) {
        toast('✅ Estación guardada', '#10b981');
        cerrarFormEstacion();
        cargarAdminEstaciones();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function duplicarEstacionAdmin(id) {
    const estaciones = await cargarFirebase('estaciones');
    const est = estaciones[id];
    if (!est) return;

    const nombreOriginal = est.nombre || 'Sin nombre';
    const nuevoNombre = await preguntar(
        `Duplicar estación "${nombreOriginal}"\n\nEscribe el nombre de la nueva estación:`,
        `${nombreOriginal} (copia)`
    );
    if (!nuevoNombre) return;

    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) { alertar('El nombre no puede estar vacío', { tipo: 'warning' }); return; }

    const duplicado = Object.values(estaciones).find(e =>
        e.modelo === est.modelo && (e.nombre || '').toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (duplicado) { alertar(`Ya existe una estación "${nombreLimpio}" en ${est.modelo}`, { tipo: 'warning' }); return; }

    const nuevoId = 'est_' + Date.now();

    mostrarLoading('Duplicando estación...');
    const ok = await guardarFirebase('estaciones', nuevoId, {
    nombre: nombreLimpio,
    descripcion: est.descripcion || '',
    modelo: est.modelo || 'MS3',
    color: est.color || '#10b981'
});
    ocultarLoading();

    if (ok) {
        toast(`✅ Estación duplicada: ${nombreLimpio}`, '#10b981');
        cargarAdminEstaciones();
    } else {
        toast('❌ Error al duplicar', '#ef4444');
    }
}

async function eliminarEstacionAdmin() {
    const id = document.getElementById('adminEstacionId').value;
    if (!id) return;

    const nombre = document.getElementById('adminEstacionNombre').value || 'esta estación';

    const montajes = await cargarFirebase('montajes');
    const montajesEstacion = Object.values(montajes).filter(m => m.puntoId === id);

    if (montajesEstacion.length > 0) {
        const ok = await confirmar(
            `⚠️ La estación "${nombre}" tiene ${montajesEstacion.length} montaje(s) asignado(s).\n\nSi la eliminas, esos montajes quedarán huérfanos.\n\n¿Estás seguro?`,
            { titulo: '⚠️ Eliminar con montajes', tipo: 'danger', okTexto: '🗑️ Eliminar de todas formas' }
        );
        if (!ok) return;
    } else {
        const ok = await confirmar(
            `¿Eliminar la estación "${nombre}"?\n\nEsta acción no se puede deshacer.`,
            { titulo: '🗑️ Eliminar estación', tipo: 'danger', okTexto: '🗑️ Eliminar' }
        );
        if (!ok) return;
    }

    mostrarLoading('Eliminando...');
    const eliminado = await eliminarFirebase('estaciones', id);
    ocultarLoading();

    if (eliminado) {
        toast('🗑️ Estación eliminada', '#10b981');
        cerrarFormEstacion();
        cargarAdminEstaciones();
    } else {
        toast('❌ Error al eliminar', '#ef4444');
    }
}
