window.APP.adminHerramientaTipoSeleccionado = 'Llave Dinamométrica';

const ICONOS_HERRAMIENTA = {
    'Llave Dinamométrica': '🔧',
    'Llave Fija': '🔩',
    'Destornillador': '🪛',
    'Otro': '📦'
};

const COLORES_HERRAMIENTA = {
    'Llave Dinamométrica': '#8b5cf6',
    'Llave Fija': '#0ea5e9',
    'Destornillador': '#f59e0b',
    'Otro': '#64748b'
};

const ESTADOS_HERRAMIENTA = {
    'disponible': { color: '#10b981', texto: 'Disponible', icono: '🟢' },
    'reservada': { color: '#3b82f6', texto: 'Reservada', icono: '🔵' },
    'en_uso': { color: '#f59e0b', texto: 'En uso', icono: '🟡' },
    'en_calibracion': { color: '#f97316', texto: 'En calibración', icono: '🟠' },
};

const ORDEN_TIPOS_HERRAMIENTA = {
    'Llave Dinamométrica': 1,
    'Llave Fija': 2,
    'Destornillador': 3,
    'Otro': 4
};

async function generarNumeroHerramienta(tipo) {
    const herramientas = await cargarFirebase('herramientas', true);

    let maxNum = 0;
    Object.values(herramientas).forEach(h => {
        if (h.tipo !== tipo) return;
        const num = parseInt(h.numero);
        if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    return maxNum + 1;
}

async function cargarAdminHerramientas() {
    const container = document.getElementById('adminHerramientasList');
    const contador = document.getElementById('adminHerramientasContador');
    if (!container) return;

    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">⏳ Cargando...</div>';

    const herramientas = await cargarFirebase('herramientas', true);
    const busqueda = (document.getElementById('adminHerramientasBusqueda')?.value || '').toLowerCase().trim();
    const filtroTipo = document.getElementById('filtroTipoAdminHerramientas')?.value || 'todos';
    const filtroEstado = document.getElementById('filtroEstadoAdminHerramientas')?.value || 'todos';

    let arr = Object.entries(herramientas);

    if (filtroTipo !== 'todos') arr = arr.filter(([id, h]) => h.tipo === filtroTipo);
    if (filtroEstado !== 'todos') arr = arr.filter(([id, h]) => (h.estado || 'disponible') === filtroEstado);

    if (busqueda) {
        arr = arr.filter(([id, h]) =>
            (h.nombre || '').toLowerCase().includes(busqueda) ||
            (h.codigo || '').toLowerCase().includes(busqueda) ||
            (h.ubicacion || '').toLowerCase().includes(busqueda)
        );
    }

    arr.sort((a, b) => {
        const ta = ORDEN_TIPOS_HERRAMIENTA[a[1].tipo] || 5;
        const tb = ORDEN_TIPOS_HERRAMIENTA[b[1].tipo] || 5;
        if (ta !== tb) return ta - tb;
        const numA = parseInt(a[1].numero) || 999;
        const numB = parseInt(b[1].numero) || 999;
        return numA - numB;
    });

    if (contador) contador.textContent = `${arr.length} herramienta${arr.length !== 1 ? 's' : ''}`;

    if (!arr.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                ${busqueda ? '🔍 Sin resultados para "' + busqueda + '"' : '📭 No hay herramientas. Crea la primera.'}
            </div>
        `;
        return;
    }

    let htmlFinal = '';

    arr.forEach(([id, h]) => {
        const tipo = h.tipo || 'Otro';
        const colorTipo = COLORES_HERRAMIENTA[tipo] || '#64748b';
        const colorTipoBg = colorTipo + '10';
        const colorTipoBorder = colorTipo + '50';
        const iconoTipo = ICONOS_HERRAMIENTA[tipo] || '📦';

        const estado = h.estado || 'disponible';
        const estadoInfo = ESTADOS_HERRAMIENTA[estado] || ESTADOS_HERRAMIENTA.disponible;
        const colorEstado = estadoInfo.color;
        const iconoEstado = estadoInfo.icono;
        const textoEstado = estadoInfo.texto;

        let bloqueCalib = '';
        if (h.fechaProxCalib) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const venc = new Date(h.fechaProxCalib + 'T00:00:00');
            const dias = Math.floor((venc - hoy) / (1000 * 60 * 60 * 24));

            let colorCal, iconoCal, textoCal;
            if (dias < 0) {
                colorCal = '#b91c1c'; iconoCal = '🔴';
                textoCal = 'Vencida hace ' + Math.abs(dias) + ' días';
            } else if (dias <= 30) {
                colorCal = '#92400e'; iconoCal = '🟡';
                textoCal = 'Vence en ' + dias + ' días';
            } else {
                colorCal = '#047857'; iconoCal = '🟢';
                textoCal = 'Vence ' + new Date(h.fechaProxCalib).toLocaleDateString('es-ES');
            }

            bloqueCalib = '<div style="font-size:0.7rem;color:' + colorCal + ';font-weight:600;margin-top:6px;">' + iconoCal + ' ' + textoCal + '</div>';
        }

        let bloqueReserva = '';
        if (h.reservadaPor) {
            bloqueReserva = '<div style="font-size:0.7rem;color:#3b82f6;font-weight:600;margin-top:6px;">👤 Reservada por ' + h.reservadaPor + '</div>';
        }

        let botonCalib = '';
        if (estado === 'en_calibracion') {
            botonCalib = '<div style="display:flex;gap:6px;margin-top:10px;"><button onclick="event.stopPropagation();event.preventDefault();marcarComoCalibrada(\'' + id + '\')" style="flex:1;padding:7px 10px;border:none;border-radius:6px;background:#10b981;color:white;font-size:0.72rem;font-weight:700;cursor:pointer;font-family:inherit;">✅ Calibrada</button></div>';
        } else {
            botonCalib = '<div style="display:flex;gap:6px;margin-top:10px;"><button onclick="event.stopPropagation();event.preventDefault();enviarACalibrar(\'' + id + '\')" style="flex:1;padding:7px 10px;border:1px solid #fed7aa;border-radius:6px;background:#fff7ed;color:#c2410c;font-size:0.72rem;font-weight:700;cursor:pointer;font-family:inherit;">📅 Calibrar</button></div>';
        }

        let bloqueCodigo = '';
        if (h.codigo) {
            bloqueCodigo = '<div style="font-size:0.75rem;color:' + colorTipo + ';font-family:\'SF Mono\',Monaco,monospace;font-weight:600;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + h.codigo + '</div>';
        } else {
            bloqueCodigo = '<div style="font-size:0.75rem;color:#cbd5e1;font-style:italic;margin-bottom:8px;">Sin código</div>';
        }

        let bloquePar = '';
        if (h.par) {
            bloquePar = '<div style="background:' + colorTipoBg + ';display:inline-block;padding:3px 10px;border-radius:8px;font-size:0.72rem;font-weight:700;color:' + colorTipo + ';margin-bottom:8px;">💪 ' + h.par + ' Nm</div>';
        }

        let bloqueNumero = '';
        if (h.numero) {
            bloqueNumero = '<span style="background:#1e293b;color:white;padding:4px 10px;border-radius:8px;font-size:0.75rem;font-weight:800;font-family:\'SF Mono\',Monaco,monospace;">#' + h.numero + '</span>';
        }

        htmlFinal += '<div data-herr-id="' + id + '" '
            + 'onclick="editarHerramientaAdmin(\'' + id + '\')" '
            + 'style="background:white;border:1px solid ' + colorTipoBorder + ';border-left:4px solid ' + colorTipo + ';border-radius:14px;padding:14px 16px;cursor:pointer;transition:all 0.2s ease;position:relative;overflow:hidden;" '
            + 'onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 8px 20px ' + colorTipo + '22\';" '
            + 'onmouseout="this.style.transform=\'translateY(0)\';this.style.boxShadow=\'\';">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
            + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
            + '<span style="background:' + colorTipoBg + ';color:' + colorTipo + ';padding:4px 8px;border-radius:8px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;gap:4px;border:1px solid ' + colorTipoBorder + ';">'
            + iconoTipo + ' ' + tipo + '</span>'
            + bloqueNumero
            + '</div>'
            + '<button onclick="event.stopPropagation();event.preventDefault();duplicarHerramientaAdmin(\'' + id + '\')" '
            + 'style="background:white;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.7rem;color:#64748b;cursor:pointer;font-family:inherit;font-weight:600;">📋 Copiar</button>'
            + '</div>'
            + '<div style="font-weight:700;font-size:0.95rem;color:#1e293b;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (h.nombre || 'Sin nombre') + '</div>'
            + bloqueCodigo
            + bloquePar
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid #f1f5f9;">'
            + '<span style="font-size:0.72rem;color:#64748b;font-weight:600;">📍 ' + (h.ubicacion || 'Sin ubicación') + '</span>'
            + '<span style="background:' + colorEstado + '18;color:' + colorEstado + ';padding:3px 10px;border-radius:99px;font-size:0.7rem;font-weight:700;white-space:nowrap;">'
            + iconoEstado + ' ' + textoEstado + '</span>'
            + '</div>'
            + bloqueReserva
            + bloqueCalib
            + botonCalib
            + '</div>';
    });

    container.innerHTML = htmlFinal;
}

function seleccionarTipoHerramienta(tipo) {
    window.APP.adminHerramientaTipoSeleccionado = tipo;

    document.querySelectorAll('.tipo-radio-herr').forEach(el => {
        const esSeleccionado = el.dataset.tipo === tipo;
        const color = COLORES_HERRAMIENTA[tipo] || '#64748b';
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

    const parGroup = document.getElementById('adminHerramientaParGroup');
    if (parGroup) {
        parGroup.style.display = tipo === 'Llave Dinamométrica' ? 'block' : 'none';
    }

    actualizarPreviewHerramienta();
}

function mostrarFormNuevaHerramienta() {
    document.getElementById('adminHerramientasForm').style.display = 'block';
    document.getElementById('adminHerramientaFormTitulo').textContent = 'Nueva Herramienta';

    document.getElementById('adminHerramientaId').value = '';
    document.getElementById('adminHerramientaNumero').value = '';
    document.getElementById('adminHerramientaCodigo').value = '';
    document.getElementById('adminHerramientaNombre').value = '';
    document.getElementById('adminHerramientaPar').value = '';
    document.getElementById('adminHerramientaUbicacion').value = '';
    document.getElementById('adminHerramientaEstado').value = 'disponible';
    document.getElementById('adminHerramientaNotas').value = '';
    document.getElementById('adminHerramientaFechaUltimaCalib').value = '';
    document.getElementById('adminHerramientaFechaProxCalib').value = '';
    document.getElementById('adminHerramientaFechaEnvioCalib').value = '';

    document.getElementById('adminHerramientaFechaEnvioGroup').style.display = 'none';
    document.getElementById('btnEliminarHerramienta').style.display = 'none';

    seleccionarTipoHerramienta('Llave Dinamométrica');

    document.getElementById('adminHerramientasForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('adminHerramientaCodigo').focus(), 300);
}

function editarHerramientaAdmin(id) {
    cargarFirebase('herramientas').then(herramientas => {
        const h = herramientas[id];
        if (!h) {
            toast('❌ Herramienta no encontrada', '#ef4444');
            return;
        }

        document.getElementById('adminHerramientasForm').style.display = 'block';
        document.getElementById('adminHerramientaFormTitulo').textContent = 'Editar Herramienta';

        document.getElementById('adminHerramientaId').value = id;
        document.getElementById('adminHerramientaNumero').value = h.numero || '';
        document.getElementById('adminHerramientaCodigo').value = h.codigo || '';
        document.getElementById('adminHerramientaNombre').value = h.nombre || '';
        document.getElementById('adminHerramientaPar').value = h.par || '';
        document.getElementById('adminHerramientaUbicacion').value = h.ubicacion || '';
        document.getElementById('adminHerramientaEstado').value = h.estado || 'disponible';
        document.getElementById('adminHerramientaNotas').value = h.notas || '';

        document.getElementById('adminHerramientaFechaUltimaCalib').value = h.fechaUltimaCalib || '';
        document.getElementById('adminHerramientaFechaProxCalib').value = h.fechaProxCalib || '';
        document.getElementById('adminHerramientaFechaEnvioCalib').value = h.fechaEnvioCalib || '';

        const envioGroup = document.getElementById('adminHerramientaFechaEnvioGroup');
        if (envioGroup) {
            envioGroup.style.display = (h.estado === 'en_calibracion') ? 'block' : 'none';
        }

        document.getElementById('btnEliminarHerramienta').style.display = 'inline-flex';

        seleccionarTipoHerramienta(h.tipo || 'Otro');

        setTimeout(actualizarBadgeCalibracion, 100);

        document.getElementById('adminHerramientasForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(err => {
        console.error('❌ Error:', err);
        toast('❌ Error al abrir', '#ef4444');
    });
}

function cerrarFormHerramienta() {
    document.getElementById('adminHerramientasForm').style.display = 'none';
    document.getElementById('adminHerramientaId').value = '';
    document.getElementById('adminHerramientaNumero').value = '';
    document.getElementById('adminHerramientaCodigo').value = '';
    document.getElementById('adminHerramientaNombre').value = '';
    document.getElementById('adminHerramientaPar').value = '';
    document.getElementById('adminHerramientaUbicacion').value = '';
    document.getElementById('adminHerramientaEstado').value = 'disponible';
    document.getElementById('adminHerramientaNotas').value = '';
    document.getElementById('adminHerramientaFechaUltimaCalib').value = '';
    document.getElementById('adminHerramientaFechaProxCalib').value = '';
    document.getElementById('adminHerramientaFechaEnvioCalib').value = '';
       document.getElementById('adminHerramientaFechaEnvioGroup').style.display = 'none';
    document.getElementById('btnEliminarHerramienta').style.display = 'none';
}

function actualizarPreviewHerramienta() {
    const preview = document.getElementById('adminHerramientaPreview');
    if (!preview) return;

    const codigo = document.getElementById('adminHerramientaCodigo')?.value || '';
    const nombre = document.getElementById('adminHerramientaNombre')?.value || 'Sin nombre';
    const ubicacion = document.getElementById('adminHerramientaUbicacion')?.value || '';
    const par = document.getElementById('adminHerramientaPar')?.value || '';
    const estado = document.getElementById('adminHerramientaEstado')?.value || 'disponible';
    const tipo = window.APP.adminHerramientaTipoSeleccionado || 'Otro';

    const idActual = document.getElementById('adminHerramientaId')?.value;
    const numeroActual = document.getElementById('adminHerramientaNumero')?.value || '';
    const numeroMostrar = idActual ? numeroActual : '⏳';

    const colorTipo = COLORES_HERRAMIENTA[tipo] || '#64748b';
    const iconoTipo = ICONOS_HERRAMIENTA[tipo] || '📦';
    const estadoInfo = ESTADOS_HERRAMIENTA[estado] || ESTADOS_HERRAMIENTA.disponible;

    preview.innerHTML = `
        <div style="width:40px;height:40px;background:${colorTipo}15;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${iconoTipo}</div>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                ${numeroMostrar ? `<span style="background:#1e293b;color:white;padding:2px 8px;border-radius:6px;font-size:0.72rem;font-weight:800;font-family:'SF Mono',Monaco,monospace;">#${numeroMostrar}</span>` : ''}
                <span>${nombre}</span>
                ${codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#64748b;font-weight:400;">(${codigo})</span>` : ''}
            </div>
            <div style="font-size:0.75rem;color:${colorTipo};font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap;">
                <span>${iconoTipo} ${tipo}</span>
                ${par ? `<span style="background:${colorTipo}18;padding:1px 8px;border-radius:99px;">💪 ${par} Nm</span>` : ''}
                <span style="color:${estadoInfo.color};font-weight:700;">${estadoInfo.icono} ${estadoInfo.texto}</span>
                ${ubicacion ? `<span style="color:#cbd5e1;">·</span><span style="color:#64748b;font-weight:400;">📍 ${ubicacion}</span>` : ''}
            </div>
        </div>
    `;
}

function onCambioEstadoHerramienta() {
    const estado = document.getElementById('adminHerramientaEstado')?.value;
    const envioGroup = document.getElementById('adminHerramientaFechaEnvioGroup');

    if (envioGroup) {
        if (estado === 'en_calibracion') {
            envioGroup.style.display = 'block';
            const fechaEnvio = document.getElementById('adminHerramientaFechaEnvioCalib');
            if (fechaEnvio && !fechaEnvio.value) {
                fechaEnvio.value = new Date().toISOString().split('T')[0];
            }
        } else {
            envioGroup.style.display = 'none';
        }
    }

    actualizarBadgeCalibracion();
    actualizarPreviewHerramienta();
}

function actualizarBadgeCalibracion() {
    const badge = document.getElementById('adminHerramientaCalibEstado');
    if (!badge) return;

    const fechaProx = document.getElementById('adminHerramientaFechaProxCalib')?.value || '';
    const estado = document.getElementById('adminHerramientaEstado')?.value || '';

    if (estado === 'en_calibracion') {
        badge.style.background = '#fed7aa';
        badge.style.color = '#c2410c';
        badge.textContent = '🟠 En calibración';
        return;
    }

    if (!fechaProx) {
        badge.style.background = '#e5e7eb';
        badge.style.color = '#64748b';
        badge.textContent = 'Sin fecha';
        return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaProx + 'T00:00:00');
    const diasRestantes = Math.floor((venc - hoy) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
        badge.style.background = '#fecaca';
        badge.style.color = '#b91c1c';
        badge.textContent = `🔴 Vencida hace ${Math.abs(diasRestantes)} días`;
    } else if (diasRestantes <= 30) {
        badge.style.background = '#fef3c7';
        badge.style.color = '#92400e';
        badge.textContent = `🟡 Vence en ${diasRestantes} días`;
    } else {
        badge.style.background = '#a7f3d0';
        badge.style.color = '#047857';
        badge.textContent = `🟢 Válida (${diasRestantes} días)`;
    }
}

async function guardarHerramientaAdmin() {
    const id = document.getElementById('adminHerramientaId').value || 'herr_' + Date.now();
    const esNueva = !document.getElementById('adminHerramientaId').value;
    const codigo = document.getElementById('adminHerramientaCodigo').value.trim();
    const nombre = document.getElementById('adminHerramientaNombre').value.trim();
    const par = parseFloat(document.getElementById('adminHerramientaPar').value) || 0;
    const ubicacion = document.getElementById('adminHerramientaUbicacion').value.trim();
    const estado = document.getElementById('adminHerramientaEstado').value;
    const notas = document.getElementById('adminHerramientaNotas').value.trim();
    const tipo = window.APP.adminHerramientaTipoSeleccionado || 'Otro';

    if (!nombre) { alertar('El nombre es obligatorio', { tipo: 'warning' }); return; }
    if (nombre.length < 2) { alertar('El nombre es demasiado corto', { tipo: 'warning' }); return; }
    if (!codigo) { alertar('El código es obligatorio', { tipo: 'warning' }); document.getElementById('adminHerramientaCodigo').focus(); return; }
    if (tipo === 'Llave Dinamométrica' && !par) {
        alertar('Las llaves dinamométricas deben tener un par', { tipo: 'warning' });
        document.getElementById('adminHerramientaPar').focus();
        return;
    }

    const herramientas = await cargarFirebase('herramientas');

const duplicadoCod = Object.entries(herramientas).find(([oid, h]) =>
    oid !== id && (h.codigo || '').toLowerCase() === codigo.toLowerCase()
);
if (duplicadoCod) {
    alertar(`Ya existe una herramienta con el código "${codigo}"`, { tipo: 'warning' });
    return;
}

    let numero = document.getElementById('adminHerramientaNumero').value;

    if (esNueva || !numero) {
        mostrarLoading('Generando número...');
        numero = await generarNumeroHerramienta(tipo);
        document.getElementById('adminHerramientaNumero').value = numero;
        ocultarLoading();
    }

    const anterior = herramientas[id] || {};

    const fechaUltimaCalib = document.getElementById('adminHerramientaFechaUltimaCalib')?.value || '';
const fechaProxCalib = document.getElementById('adminHerramientaFechaProxCalib')?.value || '';
const fechaEnvioCalib = document.getElementById('adminHerramientaFechaEnvioCalib')?.value || '';

    const data = {
        nombre: nombre,
        tipo: tipo,
        numero: parseInt(numero) || 0,
        codigo: codigo,
        par: tipo === 'Llave Dinamométrica' ? par : 0,
        ubicacion: ubicacion,
        estado: estado,
        notas: notas,
        reservadaPor: estado === 'reservada' ? (anterior.reservadaPor || '') : '',
        fechaReserva: estado === 'reservada' ? (anterior.fechaReserva || new Date().toISOString()) : null,
        fechaUltimaCalib: fechaUltimaCalib || (anterior.fechaUltimaCalib || ''),
        fechaProxCalib: fechaProxCalib || (anterior.fechaProxCalib || ''),
            fechaEnvioCalib: estado === 'en_calibracion' ? fechaEnvioCalib : (anterior.fechaEnvioCalib || ''),
    empresaCalib: anterior.empresaCalib || '',
    notasCalib: anterior.notasCalib || ''
};

    mostrarLoading('Guardando...');
    const ok = await guardarFirebase('herramientas', id, data);
    ocultarLoading();

    if (ok) {
        toast(`✅ Herramienta #${numero} guardada`, '#10b981');
        cerrarFormHerramienta();
        cargarAdminHerramientas();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function duplicarHerramientaAdmin(id) {
    const herramientas = await cargarFirebase('herramientas');
    const h = herramientas[id];
    if (!h) return;

    const nombreOriginal = h.nombre || 'Sin nombre';
    const nuevoNombre = await preguntar(
        `Duplicar "${nombreOriginal}"\n\nEscribe el nombre:`,
        `${nombreOriginal} (copia)`
    );
    if (!nuevoNombre) return;

    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) { alertar('El nombre no puede estar vacío', { tipo: 'warning' }); return; }

    const nuevoId = 'herr_' + Date.now();

    mostrarLoading('Duplicando...');
    const nuevoNumero = await generarNumeroHerramienta(h.tipo || 'Otro');

    const ok = await guardarFirebase('herramientas', nuevoId, {
        nombre: nombreLimpio,
        tipo: h.tipo || 'Otro',
        numero: nuevoNumero,
        codigo: (h.codigo || '') + ' (copia)',
        par: h.par || 0,
        ubicacion: h.ubicacion || '',
        estado: 'disponible',
        notas: h.notas || '',
        reservadaPor: '',
        fechaReserva: null
    });
    ocultarLoading();

    if (ok) {
        toast(`✅ Duplicada: #${nuevoNumero} · ${nombreLimpio}`, '#10b981');
        cargarAdminHerramientas();
    } else {
        toast('❌ Error al duplicar', '#ef4444');
    }
}

async function eliminarHerramientaAdmin() {
    const id = document.getElementById('adminHerramientaId').value;
    if (!id) return;

    const nombre = document.getElementById('adminHerramientaNombre').value || 'esta herramienta';

    const ok = await confirmar(
        `¿Eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`,
        { titulo: '🗑️ Eliminar herramienta', tipo: 'danger', okTexto: '🗑️ Eliminar' }
    );
    if (!ok) return;

    mostrarLoading('Eliminando...');
    const eliminado = await eliminarFirebase('herramientas', id);
    ocultarLoading();

    if (eliminado) {
        toast('🗑️ Herramienta eliminada', '#10b981');
        cerrarFormHerramienta();
        cargarAdminHerramientas();
    } else {
        toast('❌ Error al eliminar', '#ef4444');
    }
}

async function enviarACalibrar(id) {
    const data = await cargarFirebase('herramientas', true);
    const h = data[id];
    if (!h) return;

    const confirmado = await confirmar(
        `¿Enviar "${h.nombre}" a calibrar?\n\nQuedará fuera de servicio hasta marcarla como calibrada.`,
        { titulo: '📅 Enviar a calibrar', tipo: 'warning', okTexto: '📅 Sí, enviar' }
    );
    if (!confirmado) return;

    mostrarLoading('Enviando...');
    await guardarFirebase('herramientas', id, {
        estado: 'en_calibracion',
        fechaEnvioCalib: new Date().toISOString().split('T')[0],
        reservadaPor: '',
        fechaReserva: null
    });
    ocultarLoading();

    toast(`📅 ${h.nombre} enviada a calibrar`, '#f97316');
    cargarAdminHerramientas();
}

async function marcarComoCalibrada(id) {
    const data = await cargarFirebase('herramientas', true);
    const h = data[id];
    if (!h) return;

    const notas = await preguntar(
        `✅ Marcar "${h.nombre}" como calibrada\n\n¿Añadir nota? (opcional)`,
        'Ej: Calibrada correctamente'
    );
    if (notas === null) return;

    const proxima = await preguntar(
        '📅 ¿Próxima calibración? (opcional, AAAA-MM-DD)',
        'Ej: 2027-04-04'
    );

    mostrarLoading('Marcando...');
    await guardarFirebase('herramientas', id, {
        estado: 'disponible',
        fechaUltimaCalib: new Date().toISOString().split('T')[0],
        fechaProxCalib: proxima || h.fechaProxCalib || '',
        notasCalib: notas || h.notasCalib || '',
        fechaEnvioCalib: ''
    });
    ocultarLoading();

    toast(`✅ ${h.nombre} calibrada`, '#10b981');
    cargarAdminHerramientas();
}
