window.APP.adminTornilleriaTipoSeleccionado = 'Tornillo';

const ICONOS_TORNILLERIA = {
    'Tornillo': '🔩',
    'Tuerca': '⚙️',
    'Arandela': '🔘',
    'Otro': '📦'
};

const COLORES_TORNILLERIA = {
    'Tornillo': '#8b5cf6',
    'Tuerca': '#0ea5e9',
    'Arandela': '#f59e0b',
    'Otro': '#64748b'
};

function compararTornilleriaNatural(nombreA, nombreB) {
    const strA = String(nombreA || '').trim().toLowerCase();
    const strB = String(nombreB || '').trim().toLowerCase();

    if (strA === strB) return 0;

    const tokenize = (s) => s.match(/(\d+|[^\d]+)/g) || [];
    const tokA = tokenize(strA);
    const tokB = tokenize(strB);

    const maxLen = Math.max(tokA.length, tokB.length);

    for (let i = 0; i < maxLen; i++) {
        const ta = tokA[i] || '';
        const tb = tokB[i] || '';

        const esNumA = /^\d+$/.test(ta);
        const esNumB = /^\d+$/.test(tb);

        if (esNumA && esNumB) {
            const nA = parseInt(ta, 10);
            const nB = parseInt(tb, 10);
            if (nA !== nB) return nB - nA;
        } else {
            const cmp = tb.localeCompare(ta);
            if (cmp !== 0) return cmp;
        }
    }
    return 0;
}

async function cargarAdminTornilleria() {
    const container = document.getElementById('adminTornilleriaList');
    const contador = document.getElementById('adminTornilleriaContador');
    if (!container) return;

    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">⏳ Cargando...</div>';

    const tornilleria = await cargarFirebase('tornilleria_catalogo', true);
    const busqueda = (document.getElementById('adminTornilleriaBusqueda')?.value || '').toLowerCase().trim();
    const filtroTipo = document.getElementById('filtroTipoAdminTornilleria')?.value || 'todos';

    let arr = Object.entries(tornilleria);

    if (filtroTipo !== 'todos') {
        arr = arr.filter(([id, t]) => t.tipo === filtroTipo);
    }

    if (busqueda) {
        arr = arr.filter(([id, t]) =>
            (t.nombre || '').toLowerCase().includes(busqueda) ||
            (t.codigo || '').toLowerCase().includes(busqueda) ||
            (t.ubicacion || '').toLowerCase().includes(busqueda)
        );
    }

const ordenTipo = { 'Arandela': 1, 'Tornillo': 2, 'Tuerca': 3, 'Otro': 4 };
arr.sort((a, b) => {
    const ta = ordenTipo[a[1].tipo] || 5;
    const tb = ordenTipo[b[1].tipo] || 5;
    if (ta !== tb) return ta - tb;
    return compararTornilleriaNatural(a[1].nombre, b[1].nombre);
});

      if (contador) contador.textContent = `${arr.length} item${arr.length !== 1 ? 's' : ''}`;

    if (!arr.length) {
        container.innerHTML = `
            <div class="empty-state">
                ${busqueda ? '🔍 Sin resultados para "' + busqueda + '"' : '📭 No hay tornillería. Crea el primero.'}
            </div>
        `;
        return;
    }

    const ordenSecciones = ['Arandela', 'Tornillo', 'Tuerca', 'Otro'];
    const grupos = {};
    arr.forEach(([id, t]) => {
        const tipo = t.tipo || 'Otro';
        if (!grupos[tipo]) grupos[tipo] = [];
        grupos[tipo].push([id, t]);
    });

    let htmlFinal = '';

    ordenSecciones.forEach(tipo => {
        const items = grupos[tipo];
        if (!items || !items.length) return;

        const color = COLORES_TORNILLERIA[tipo] || '#64748b';
        const icono = ICONOS_TORNILLERIA[tipo] || '📦';
        const colorBg = color + '12';
        const colorBorder = color + '40';

        htmlFinal += `
            <div>
                <!-- CABECERA DE SECCIÓN -->
                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    padding:10px 14px;
                    background:${colorBg};
                    border-left:4px solid ${color};
                    border-radius:10px;
                    margin-bottom:12px;
                ">
                    <span style="font-size:1.3rem;">${icono}</span>
                    <span style="font-weight:800;color:${color};font-size:0.95rem;letter-spacing:0.02em;">
                        ${tipo.toUpperCase()}S
                    </span>
                    <span style="
                        background:white;
                        color:${color};
                        padding:2px 10px;
                        border-radius:99px;
                        font-size:0.72rem;
                        font-weight:800;
                        border:1px solid ${colorBorder};
                        margin-left:auto;
                    ">${items.length}</span>
                </div>

                <!-- GRID DE TARJETAS -->
                <div style="
                    display:grid;
                    grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
                    gap:12px;
                ">
                    ${items.map(([id, t]) => renderTarjetaTornilleriaAdmin(id, t)).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = htmlFinal;
}

function renderTarjetaTornilleriaAdmin(id, t) {
    const tipo = t.tipo || 'Otro';
    const color = COLORES_TORNILLERIA[tipo] || '#64748b';
    const colorBg = color + '10';
    const colorBorder = color + '50';
    const icono = ICONOS_TORNILLERIA[tipo] || '📦';

    return `
        <div onclick="editarTornilleriaAdmin('${id}')"
            style="background:white;border:1px solid ${colorBorder};border-left:4px solid ${color};border-radius:14px;padding:14px 16px;cursor:pointer;transition:all 0.2s ease;position:relative;overflow:hidden;"
            onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px ${color}22';"
            onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='';">

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <span style="background:${colorBg};color:${color};padding:4px 8px;border-radius:8px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;gap:4px;border:1px solid ${colorBorder};">
                    ${icono} ${tipo}
                </span>
                <button onclick="event.stopPropagation();duplicarTornilleriaAdmin('${id}')"
                    style="background:white;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.7rem;color:#64748b;cursor:pointer;font-family:inherit;font-weight:600;"
                    onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">📋 Copiar</button>
            </div>

            <div style="font-weight:700;font-size:0.95rem;color:#1e293b;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.nombre || 'Sin nombre'}</div>

            ${t.codigo ? `
                <div style="font-size:0.75rem;color:${color};font-family:'SF Mono',Monaco,monospace;font-weight:600;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.codigo}</div>
            ` : `
                <div style="font-size:0.75rem;color:#cbd5e1;font-style:italic;margin-bottom:8px;">Sin código</div>
            `}

            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid #f1f5f9;">
                <span style="font-size:0.72rem;color:${t.ubicacion ? '#64748b' : '#94a3b8'};font-weight:600;display:flex;align-items:center;gap:4px;">📍 ${t.ubicacion || 'Sin ubicación'}</span>
                <span style="font-size:1rem;color:${color};opacity:0.6;">→</span>
            </div>
        </div>
    `;
}

function seleccionarTipoTornilleria(tipo) {
    window.APP.adminTornilleriaTipoSeleccionado = tipo;

    document.querySelectorAll('.tipo-radio-torn').forEach(el => {
        const esSeleccionado = el.dataset.tipo === tipo;
        const color = COLORES_TORNILLERIA[tipo] || '#64748b';
        if (esSeleccionado) {
            el.style.borderColor = color;
            el.style.background = color + '10';
            el.style.color = color;
        } else {
            el.style.borderColor = '#cbd5e1';
            el.style.background = 'white';
            el.style.color = '#64748b';
        }
    });

    actualizarPreviewTornilleria();
}

function mostrarFormNuevaTornilleria() {
    document.getElementById('adminTornilleriaForm').style.display = 'block';
    document.getElementById('adminTornilleriaFormTitulo').textContent = 'Nueva Tornillería';

    document.getElementById('adminTornilleriaId').value = '';
    document.getElementById('adminTornilleriaNombre').value = '';
    document.getElementById('adminTornilleriaCodigo').value = '';
    document.getElementById('adminTornilleriaUbicacion').value = '';
    document.getElementById('btnEliminarTornilleria').style.display = 'none';

    seleccionarTipoTornilleria('Tornillo');

    document.getElementById('adminTornilleriaForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('adminTornilleriaNombre').focus(), 300);
}

function editarTornilleriaAdmin(id) {
    cargarFirebase('tornilleria_catalogo').then(tornilleria => {
        const t = tornilleria[id];
        if (!t) return;

        document.getElementById('adminTornilleriaForm').style.display = 'block';
        document.getElementById('adminTornilleriaFormTitulo').textContent = 'Editar Tornillería';

        document.getElementById('adminTornilleriaId').value = id;
        document.getElementById('adminTornilleriaNombre').value = t.nombre || '';
        document.getElementById('adminTornilleriaCodigo').value = t.codigo || '';
        document.getElementById('adminTornilleriaUbicacion').value = t.ubicacion || '';

        document.getElementById('btnEliminarTornilleria').style.display = 'inline-flex';

        seleccionarTipoTornilleria(t.tipo || 'Otro');

        document.getElementById('adminTornilleriaForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function cerrarFormTornilleria() {
    document.getElementById('adminTornilleriaForm').style.display = 'none';
    document.getElementById('adminTornilleriaId').value = '';
    document.getElementById('adminTornilleriaNombre').value = '';
    document.getElementById('adminTornilleriaCodigo').value = '';
    document.getElementById('adminTornilleriaUbicacion').value = '';
    document.getElementById('btnEliminarTornilleria').style.display = 'none';
}

function actualizarPreviewTornilleria() {
    const preview = document.getElementById('adminTornilleriaPreview');
    if (!preview) return;

    const nombre = document.getElementById('adminTornilleriaNombre')?.value || 'Sin nombre';
    const codigo = document.getElementById('adminTornilleriaCodigo')?.value || '';
    const ubicacion = document.getElementById('adminTornilleriaUbicacion')?.value || '';
    const tipo = window.APP.adminTornilleriaTipoSeleccionado || 'Tornillo';

    const color = COLORES_TORNILLERIA[tipo] || '#64748b';
    const colorBg = color + '15';
    const icono = ICONOS_TORNILLERIA[tipo] || '📦';

    preview.innerHTML = `
        <div style="width:40px;height:40px;background:${colorBg};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${icono}</div>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${nombre}
                ${codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#64748b;font-weight:400;">(${codigo})</span>` : ''}
            </div>
            <div style="font-size:0.75rem;color:${color};font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;">
                <span>${icono} ${tipo}</span>
                ${ubicacion ? `<span style="color:#cbd5e1;">·</span><span style="color:#64748b;font-weight:400;">📍 ${ubicacion}</span>` : ''}
            </div>
        </div>
    `;
}

async function guardarTornilleriaAdmin() {
    const id = document.getElementById('adminTornilleriaId').value || 'torn_' + Date.now();
    const nombre = document.getElementById('adminTornilleriaNombre').value.trim();
    const codigo = document.getElementById('adminTornilleriaCodigo').value.trim();
    const ubicacion = document.getElementById('adminTornilleriaUbicacion').value.trim();
    const tipo = window.APP.adminTornilleriaTipoSeleccionado || 'Tornillo';

    if (!nombre) {
        alertar('El nombre es obligatorio', { tipo: 'warning' });
        document.getElementById('adminTornilleriaNombre').focus();
        return;
    }
    if (nombre.length < 2) {
        alertar('El nombre es demasiado corto', { tipo: 'warning' });
        return;
    }

    const tornilleria = await cargarFirebase('tornilleria_catalogo');
    const duplicado = Object.entries(tornilleria).find(([oid, t]) =>
        oid !== id && (t.nombre || '').toLowerCase() === nombre.toLowerCase()
    );
    if (duplicado) {
        alertar(`Ya existe una tornillería llamada "${nombre}"`, { tipo: 'warning' });
        return;
    }

    if (codigo) {
        const duplicadoCod = Object.entries(tornilleria).find(([oid, t]) =>
            oid !== id && (t.codigo || '').toLowerCase() === codigo.toLowerCase()
        );
        if (duplicadoCod) {
            alertar(`Ya existe una tornillería con el código "${codigo}"`, { tipo: 'warning' });
            return;
        }
    }

    const data = {
        nombre: nombre,
        tipo: tipo,
        codigo: codigo,
        ubicacion: ubicacion
    };

    mostrarLoading('Guardando...');
    const ok = await guardarFirebase('tornilleria_catalogo', id, data);
    ocultarLoading();

    if (ok) {
        toast('✅ Tornillería guardada', '#10b981');
        cerrarFormTornilleria();
        cargarAdminTornilleria();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function duplicarTornilleriaAdmin(id) {
    const tornilleria = await cargarFirebase('tornilleria_catalogo');
    const t = tornilleria[id];
    if (!t) return;

    const nombreOriginal = t.nombre || 'Sin nombre';
    const nuevoNombre = await preguntar(
        `Duplicar "${nombreOriginal}"\n\nEscribe el nombre del nuevo item:`,
        `${nombreOriginal} (copia)`
    );
    if (!nuevoNombre) return;

    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) {
        alertar('El nombre no puede estar vacío', { tipo: 'warning' });
        return;
    }

    const duplicado = Object.values(tornilleria).find(x =>
        (x.nombre || '').toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (duplicado) {
        alertar(`Ya existe una tornillería "${nombreLimpio}"`, { tipo: 'warning' });
        return;
    }

    const nuevoId = 'torn_' + Date.now();

    mostrarLoading('Duplicando...');
    const ok = await guardarFirebase('tornilleria_catalogo', nuevoId, {
        nombre: nombreLimpio,
        tipo: t.tipo || 'Otro',
        codigo: '',
        ubicacion: t.ubicacion || ''
    });
    ocultarLoading();

    if (ok) {
        toast(`✅ Duplicada: ${nombreLimpio}`, '#10b981');
        cargarAdminTornilleria();
    } else {
        toast('❌ Error al duplicar', '#ef4444');
    }
}

async function eliminarTornilleriaAdmin() {
    const id = document.getElementById('adminTornilleriaId').value;
    if (!id) return;

    const nombre = document.getElementById('adminTornilleriaNombre').value || 'este item';

    const montajes = await cargarFirebase('montajes');
    const montajesQueLaUsan = Object.values(montajes).filter(m => {
        if (!m.tornilleria) return false;
        return m.tornilleria.split('||').some(item => {
            const ref = item.trim().split('=')[0];
            return ref === id;
        });
    });

    if (montajesQueLaUsan.length > 0) {
        const ok = await confirmar(
            `⚠️ "${nombre}" está siendo usada en ${montajesQueLaUsan.length} montaje(s).\n\nSi la eliminas, esos montajes quedarán sin nombre para esa tornillería.\n\n¿Estás seguro?`,
            { titulo: '⚠️ Eliminar tornillería usada', tipo: 'danger', okTexto: '🗑️ Eliminar de todas formas' }
        );
        if (!ok) return;
    } else {
        const ok = await confirmar(
            `¿Eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`,
            { titulo: '🗑️ Eliminar', tipo: 'danger', okTexto: '🗑️ Eliminar' }
        );
        if (!ok) return;
    }

    mostrarLoading('Eliminando...');
    const eliminado = await eliminarFirebase('tornilleria_catalogo', id);
    ocultarLoading();

    if (eliminado) {
        toast('🗑️ Eliminada', '#10b981');
        cerrarFormTornilleria();
        cargarAdminTornilleria();
    } else {
        toast('❌ Error al eliminar', '#ef4444');
    }
}
