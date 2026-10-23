async function cargarMontajesOperacionSilencioso(operacionId, modelo) {
    const container = document.getElementById('montajesList');
    if (!container) return;

    const [montajes, estaciones, historial, cronosData] = await Promise.all([
        cargarFirebase('montajes'),
        cargarFirebase('estaciones'),
        cargarFirebase('historial_montajes'),
        cargarFirebase('cronos_operacion', true)
    ]);

    if (!window.APP.cronosOperacion) window.APP.cronosOperacion = {};
    window.APP.cronosOperacion[operacionId] = cronosData[operacionId] || { montajesActivos: {} };

    await cargarMontajesOperacion(operacionId, modelo, true);
}

async function cargarMontajesOperacion(operacionId, modelo, silencioso = false) {
    const container = document.getElementById('montajesList');
    if (!container) return;

    if (!silencioso) {
        container.innerHTML = '<div class="empty-state">⏳ Cargando montajes...</div>';
    }

    const [montajes, estaciones, historial, cronosData, resistenciasGuardadas, materialesCatalogo, escaneosGuardados] = await Promise.all([
    cargarFirebase('montajes'),
    cargarFirebase('estaciones'),
    cargarFirebase('historial_montajes'),
    cargarFirebase('cronos_operacion', true),
    cargarFirebase('resistencias_montajes'),
    cargarFirebase('materiales_catalogo', true),
    cargarFirebase('componentes_escaneados', true)
]);

if (!window.APP._componentesEscaneados) window.APP._componentesEscaneados = {};
Object.entries(escaneosGuardados).forEach(([clave, data]) => {
    if (data.montajeId) {
        window.APP._componentesEscaneados[data.montajeId] = data;
    }
});

Object.keys(montajes).forEach(mid => {
    const clave = operacionId + '_' + mid;
    montajes[mid]._resistenciasGuardadas = !!resistenciasGuardadas[clave];
});

    if (!window.APP.cronosOperacion) window.APP.cronosOperacion = {};
    window.APP.cronosOperacion[operacionId] = cronosData[operacionId] || { montajesActivos: {} };

    if (montajesActivosEnOperacion(operacionId)) {
        iniciarTickCronos(operacionId);
    }

    const estFiltradas = Object.entries(estaciones)
        .filter(([id, e]) => e.modelo === modelo)
        .sort((a, b) => {
            const numA = parseInt((a[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            const numB = parseInt((b[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            return numA - numB;
        });

    if (!estFiltradas.length) {
        container.innerHTML = '<div class="empty-state">⚠️ No hay estaciones para este modelo</div>';
        return;
    }

    const completadosIds = new Set(
        Object.values(historial || {})
            .filter(h => h.completado && h.operacionId === operacionId)
            .map(h => h.montajeId)
    );

    const paleta = [
        { bg: '#eef2ff', border: '#c7d2fe', text: '#4338ca', dot: '#6366f1' },
        { bg: '#ecfeff', border: '#a5f3fc', text: '#0e7490', dot: '#06b6d4' },
        { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' },
        { bg: '#fefce8', border: '#fde68a', text: '#a16207', dot: '#eab308' },
        { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', dot: '#f97316' },
        { bg: '#fdf2f8', border: '#fbcfe8', text: '#be185d', dot: '#ec4899' },
        { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', dot: '#8b5cf6' },
        { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#ef4444' }
    ];

    let totalMontajes = 0;
    let totalSeg = 0;
    let html = '';

    html += `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.2rem;flex-wrap:wrap;">
            <span style="font-weight:600;font-size:0.8rem;color:var(--gray-600);">Filtrar:</span>
            <button class="btn btn-sm ${!window.APP.filtroOperario ? 'btn-primary' : 'btn-outline'}" onclick="filtrarPorOperario(null)">Todos</button>
            <button class="btn btn-sm ${window.APP.filtroOperario === 'operario1' ? 'btn-primary' : 'btn-outline'}" onclick="filtrarPorOperario('operario1')">Operario 1</button>
            <button class="btn btn-sm ${window.APP.filtroOperario === 'operario2' ? 'btn-primary' : 'btn-outline'}" onclick="filtrarPorOperario('operario2')">Operario 2</button>
        </div>
    `;

    let colorIdx = 0;

    for (const [estId, est] of estFiltradas) {
        const montajesEst = Object.entries(montajes)
            .filter(([mid, m]) => m.puntoId === estId && m.modelo === modelo)
            .filter(([mid, m]) => !window.APP.filtroOperario || m.operarioAsignado === window.APP.filtroOperario)
            .sort((a, b) => (parseInt(a[1].orden) || 0) - (parseInt(b[1].orden) || 0));

        if (!montajesEst.length) continue;

        totalMontajes += montajesEst.length;
        const segEstacion = montajesEst.reduce((a, [mid, m]) => a + Math.round((parseFloat(m.tiempoHoras) || 0) * 3600), 0);
        totalSeg += segEstacion;
        const horasEstacion = (segEstacion / 3600).toFixed(2);

        const color = paleta[colorIdx % paleta.length];
        colorIdx++;

        html += `
            <div style="margin-bottom: 1.5rem;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:${color.bg};border-radius:10px;border-left:4px solid ${color.dot};margin-bottom:0.75rem;flex-wrap:wrap;gap:8px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${color.dot};flex-shrink:0;"></span>
                        <div>
                            <div style="font-weight:700;font-size:0.95rem;color:${color.text};line-height:1.2;">${est.nombre || 'Sin nombre'}</div>
                            <div style="font-size:0.72rem;color:${color.text};opacity:0.75;font-weight:500;margin-top:1px;">${est.modelo === 'MS3' ? 'MS3' : 'DC3'} · ${montajesEst.length} montaje${montajesEst.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <span style="font-size:0.85rem;font-weight:700;color:${color.text};font-variant-numeric:tabular-nums;background:white;padding:3px 10px;border-radius:99px;border:1px solid ${color.border};">${horasEstacion}h</span>
                </div>

                <div style="display:flex;flex-direction:column;gap:0.75rem;">
        `;

        html += montajesEst.map(([mid, m]) => renderTarjetaMontaje(mid, m, color, completadosIds, historial, operacionId)).join('');

        html += `
                </div>
            </div>
        `;
    }

    document.getElementById('infoOpMontajes').textContent = totalMontajes;
    document.getElementById('infoOpTiempo').textContent = (totalSeg / 3600).toFixed(2) + 'h';

    container.innerHTML = html || '<div class="empty-state">No hay estaciones con montajes para esta operación</div>';

    setTimeout(() => {
        if (typeof actualizarBadgeCrono === 'function') actualizarBadgeCrono();
        if (typeof iniciarBadgeTick === 'function') iniciarBadgeTick();
    }, 300);
}

function renderTarjetaMontaje(mid, m, color, completadosIds, historial, operacionId) {
    const estaCompletado = completadosIds.has(mid);
    const horas = parseFloat(m.tiempoHoras) || 0;

    const historialMontaje = Object.values(historial).find(h =>
        h.montajeId === mid && h.operacionId === operacionId && h.completado
    );
    const tiempoRealSeg = historialMontaje?.tiempoRealSeg || 0;
    const tiempoRealHoras = (tiempoRealSeg / 3600).toFixed(2);
    const operarioReal = historialMontaje?.operario || '—';

    const borde = estaCompletado ? '1px solid #bbf7d0' : `1px solid ${color.border}`;
    const fondo = estaCompletado ? '#f0fdf4' : '#ffffff';
    const opacidad = estaCompletado ? '0.85' : '1';

    let estadoHtml = '';
    if (estaCompletado) {
        estadoHtml = `
            <div style="font-size:0.75rem;color:#15803d;font-weight:600;margin-top:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span>✓ Completado</span>
                <span style="color:#94a3b8;">·</span>
                <span style="background:#dcfce7;color:#166534;padding:1px 8px;border-radius:99px;font-weight:700;">⏱️ ${tiempoRealHoras}h</span>
                <span style="color:#94a3b8;">·</span>
                <span style="color:#166534;font-weight:600;">👤 ${operarioReal}</span>
            </div>
        `;
    } else {
        const cronoOp = window.APP.cronosOperacion?.[operacionId];
        const mActivo = cronoOp?.montajesActivos?.[mid];
        const activo = mActivo && mActivo.operariosActivos && mActivo.operariosActivos.length > 0;
        const tiempoConsumido = mActivo?.tiempoConsumidoSeg || 0;
        const pausado = !activo && mActivo && tiempoConsumido > 0;

        if (activo) {
            estadoHtml = renderCronometroActivo(mid, m, mActivo);
        } else if (pausado) {
            estadoHtml = renderCronometroPausado(mid, m, tiempoConsumido);
        } else {
            estadoHtml = '<div style="font-size:0.75rem;color:#64748b;font-weight:500;margin-top:2px;">Pendiente</div>';
        }
    }

    return `
        <div id="card_${mid}"
            style="background:${fondo};border:${borde};border-left:3px solid ${estaCompletado ? '#22c55e' : color.dot};border-radius:10px;padding:0.9rem 1rem;transition:all 0.15s ease;opacity:${opacidad};">
            <!-- ZONA PULSABLE -->
            <div ${estaCompletado ? '' : `onclick="iniciarMontaje('${mid}')"`}
                style="cursor:${estaCompletado ? 'default' : 'pointer'};margin:-0.9rem -1rem 0 -1rem;padding:0.9rem 1rem;border-radius:10px 10px 0 0;"
                onmouseover="if(!${estaCompletado}) { this.style.background='#f8fafc'; }"
                onmouseout="if(!${estaCompletado}) { this.style.background=''; }">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${m.orden || ''}. ${m.nombre || 'Sin nombre'}
                            ${m.descripcion ? `<span style="font-weight:400;color:#64748b;"> - ${m.descripcion}</span>` : ''}
                        </div>
                        ${estadoHtml}
                    </div>
                    <div style="font-size:0.85rem;font-weight:700;color:${estaCompletado ? '#15803d' : color.text};font-variant-numeric:tabular-nums;flex-shrink:0;">${horas.toFixed(2)}h</div>
                    ${estaCompletado ? `<span style="background:#dcfce7;color:#166534;padding:3px 9px;border-radius:99px;font-size:0.7rem;font-weight:700;flex-shrink:0;">✓</span>` : ''}
                </div>
            </div>

<!-- CONTADOR DE PASOS (si tiene) -->
${m.pasos && m.pasos.length > 0 && !estaCompletado ? `
    <div style="
        margin-top:0.7rem;
        padding:8px 12px;
        background:#eef2ff;
        border-radius:8px;
        display:flex;
        align-items:center;
        gap:8px;
        font-size:0.78rem;
        font-weight:700;
        color:#4338ca;
        border:1px solid #c7d2fe;
    ">
        <span style="font-size:1rem;">📋</span>
        <span>${m.pasos.length} paso${m.pasos.length !== 1 ? 's' : ''} a confirmar antes de terminar</span>
    </div>
` : ''}

<!-- 🆕 AVISO DE PIEZA KANBAN CON MENSAJE DEL ADMIN -->
${!estaCompletado ? (() => {
    if (!m.piezasKanban) return '';
    const piezasCat = window.APP.fbCache['piezas_kanban']?.data || {};
    const avisos = [];
    m.piezasKanban.split(',').forEach(item => {
        const codigo = item.trim().split('=')[0];
        if (!codigo) return;
        const pieza = Object.values(piezasCat).find(p => p.codigo === codigo || p.id === codigo);
        if (pieza && pieza.mensajeAdmin) {
            avisos.push({ nombre: pieza.nombre || codigo, mensaje: pieza.mensajeAdmin });
        }
    });
    if (!avisos.length) return '';
    return avisos.map(a => `
        <div style="
            margin-top:0.7rem;
            padding:8px 12px;
            background:#fffbeb;
            border-radius:8px;
            display:flex;
            align-items:flex-start;
            gap:8px;
            font-size:0.78rem;
            border:1px solid #fde68a;
        ">
            <span style="font-size:1rem;flex-shrink:0;">💬</span>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;color:#92400e;margin-bottom:2px;">${a.nombre}</div>
                <div style="color:#78350f;line-height:1.4;">${a.mensaje}</div>
            </div>
        </div>
    `).join('');
})() : ''}

<!-- BOTONES -->
<div style="display:flex;gap:6px;margin-top:0.7rem;padding-top:0.7rem;border-top:1px dashed ${estaCompletado ? '#bbf7d0' : color.border};flex-wrap:wrap;">
${tieneResistencias(m) ? (() => {
    const guardadas = m._resistenciasGuardadas === true;
    const rechazado = historialMontaje?.qcEstado === 'rechazado';
    const bloqueado = guardadas && !rechazado;

    if (bloqueado) {
        const motivo = historialMontaje?.qcEstado === 'aprobado'
            ? 'Aprobado por QC · Bloqueado'
            : 'Ya guardado · Bloqueado hasta revisión de QC';
        return `
            <span title="${motivo}"
                style="
                    background:#f0fdf4;
                    border:1px solid #a7f3d0;
                    border-radius:6px;
                    padding:6px 12px;
                    font-size:0.72rem;
                    color:#047857;
                    display:inline-flex;
                    align-items:center;
                    gap:5px;
                    font-weight:700;
                    cursor:not-allowed;
                ">
                🔒 ⚡ Resistencias
                <span style="background:#10b981;color:white;padding:1px 6px;border-radius:99px;font-size:0.62rem;font-weight:700;">✓</span>
            </span>
        `;
    }

    const esRechazo = guardadas && rechazado;
    const bgColor = esRechazo ? '#fef2f2' : '#eef2ff';
    const borderColor = esRechazo ? '#fecaca' : '#c7d2fe';
    const textColor = esRechazo ? '#b91c1c' : '#4338ca';
    const hoverBg = esRechazo ? '#fee2e2' : '#e0e7ff';

    return `
        <button onclick="abrirModalResistencias('${mid}')"
            style="
                background:${bgColor};
                border:1px solid ${borderColor};
                border-radius:6px;
                padding:6px 12px;
                font-size:0.72rem;
                color:${textColor};
                cursor:pointer;
                display:inline-flex;
                align-items:center;
                gap:5px;
                font-weight:600;
                transition:all 0.15s ease;
                font-family:inherit;
            "
            onmouseover="this.style.background='${hoverBg}'"
            onmouseout="this.style.background='${bgColor}'">
            ${esRechazo ? '🔧 Corregir ⚡' : '⚡'} Resistencias
            ${guardadas ? ` <span style="background:#10b981;color:white;padding:1px 6px;border-radius:99px;font-size:0.62rem;font-weight:700;">✓</span>` : ''}
        </button>
    `;
})() : ''}
    <button onclick="mostrarDetalleMontaje('${mid}')"
                    style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 12px;font-size:0.72rem;color:#1d4ed8;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-weight:600;transition:all 0.15s ease;font-family:inherit;"
                    onmouseover="this.style.background='#dbeafe';this.style.borderColor='#60a5fa'"
                    onmouseout="this.style.background='#eff6ff';this.style.borderColor='#bfdbfe'">📋 Ver detalles</button>

                <button onclick="mostrarInstruccionesMontaje('${mid}')"
                    style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:6px 12px;font-size:0.72rem;color:#c2410c;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-weight:600;transition:all 0.15s ease;font-family:inherit;"
                    onmouseover="this.style.background='#ffedd5';this.style.borderColor='#fb923c'"
                    onmouseout="this.style.background='#fff7ed';this.style.borderColor='#fed7aa'">📖 Instrucciones</button>
                    
                ${!estaCompletado && tieneComponentesAEscanear(m) ? `
    <button onclick="abrirModalEscaner('${mid}')"
        style="
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 0.72rem;
            color: #1d4ed8;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-weight: 600;
            transition: all 0.15s ease;
            font-family: inherit;
        "
        onmouseover="this.style.background='#dbeafe';this.style.borderColor='#60a5fa'"
        onmouseout="this.style.background='#eff6ff';this.style.borderColor='#bfdbfe'">
        📷 Escanear
        ${(() => {
            const esc = window.APP._componentesEscaneados?.[mid];
            const total = contarComponentesAEscanear(m);
            const hechos = esc?.componentes?.filter(c => c.codigoEscaneado).length || 0;
            if (total > 0) {
                return `<span style="background:${hechos === total ? '#10b981' : '#3b82f6'};color:white;padding:1px 6px;border-radius:99px;font-size:0.62rem;font-weight:700;margin-left:4px;">${hechos}/${total}</span>`;
            }
            return '';
        })()}
    </button>
` : ''}

                ${!estaCompletado && m.piezasKanban ? `
                    <button onclick="mostrarUbicacionesKanban('${mid}')"
                        style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:6px 12px;font-size:0.72rem;color:#047857;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-weight:600;transition:all 0.15s ease;font-family:inherit;"
                        onmouseover="this.style.background='#d1fae5';this.style.borderColor='#34d399'"
                        onmouseout="this.style.background='#ecfdf5';this.style.borderColor='#a7f3d0'">📍 Kanban</button>
                ` : ''}
            </div>
        </div>
    `;
}

async function mostrarDetalleMontaje(montajeId) {
    const montajes = await cargarFirebase('montajes');
    const m = montajes[montajeId];
    if (!m) return;

    const [piezasKanban, catalogoMateriales, catalogoTornilleria] = await Promise.all([
    cargarFirebase('piezas_kanban'),
    cargarFirebase('materiales_catalogo'),
    cargarFirebase('tornilleria_catalogo')
]);

    const esMS3 = (m.modelo || 'MS3') === 'MS3';
    const colorModelo = {
        bg: esMS3 ? '#ecfdf5' : '#eff6ff',
        border: esMS3 ? '#a7f3d0' : '#bfdbfe',
        text: esMS3 ? '#047857' : '#1d4ed8',
        dot: esMS3 ? '#10b981' : '#3b82f6'
    };

    const modal = document.createElement('div');
    modal.id = 'modalDetalleMontaje';
    modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

    modal.innerHTML = `
        <div style="background:white;border-bottom:1px solid #e5e7eb;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                <div style="width:48px;height:48px;background:${colorModelo.bg};border:1px solid ${colorModelo.border};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">${m.icono || '📦'}</div>
                <div style="min-width:0;">
                    <h2 style="margin:0;color:#1e293b;font-size:1.15rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.nombre || 'Sin nombre'}</h2>
                    <div style="font-size:0.78rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span>Orden ${m.orden || '—'}</span>
                        <span style="color:#cbd5e1;">·</span>
                        <span style="color:${colorModelo.text};font-weight:700;background:${colorModelo.bg};padding:1px 8px;border-radius:99px;font-size:0.72rem;">${m.modelo || 'MS3'}</span>
                    </div>
                </div>
            </div>
            <button onclick="cerrarModal('modalDetalleMontaje')"
                style="background:#f1f5f9;border:none;border-radius:10px;width:44px;height:44px;font-size:1.3rem;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;transition:all 0.15s ease;flex-shrink:0;"
                onmouseover="this.style.background='#e2e8f0';this.style.color='#1e293b'"
                onmouseout="this.style.background='#f1f5f9';this.style.color='#475569'">✕</button>
        </div>

        <div style="flex:1;overflow-y:auto;padding:1.5rem;background:#fafafa;">
            <div style="max-width:900px;margin:0 auto;">

                ${m.descripcion ? `
                    <div style="background:white;border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:1rem;border:1px solid #e5e7eb;border-left:4px solid ${colorModelo.dot};">
                        <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;margin-bottom:6px;">Descripción</div>
                        <div style="font-size:0.92rem;color:#1e293b;line-height:1.6;">${m.descripcion}</div>
                    </div>
                ` : ''}

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.75rem;margin-bottom:1rem;">
                    <div style="background:linear-gradient(135deg,${colorModelo.bg},white);border:1px solid ${colorModelo.border};border-radius:14px;padding:1.2rem;text-align:center;">
                        <div style="font-size:1.6rem;margin-bottom:6px;">⏱️</div>
                        <div style="font-size:2rem;font-weight:800;color:${colorModelo.text};line-height:1;">${m.tiempoHoras || 0}<span style="font-size:1rem;">h</span></div>
                        <div style="font-size:0.72rem;color:${colorModelo.text};font-weight:600;margin-top:6px;opacity:0.8;">Tiempo estimado</div>
                    </div>
                    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:1.2rem;text-align:center;">
                        <div style="font-size:1.6rem;margin-bottom:6px;">🔢</div>
                        <div style="font-size:2rem;font-weight:800;color:#1e293b;line-height:1;">${m.orden || '—'}</div>
                        <div style="font-size:0.72rem;color:#64748b;font-weight:600;margin-top:6px;">Orden</div>
                    </div>
                    ${m.requiereEscaneo ? `
                        <div style="background:linear-gradient(135deg,#fff7ed,white);border:1px solid #fed7aa;border-radius:14px;padding:1.2rem;text-align:center;">
                            <div style="font-size:1.6rem;margin-bottom:6px;">📷</div>
                            <div style="font-size:1rem;font-weight:700;color:#c2410c;line-height:1.2;padding-top:6px;">Requiere</div>
                            <div style="font-size:0.72rem;color:#c2410c;font-weight:600;margin-top:4px;">Escaneo componentes</div>
                        </div>
                    ` : ''}
                </div>

     ${m.piezasKanban ? renderSeccionPiezas(m.piezasKanban, piezasKanban) : ''}
${m.materialesNecesarios ? renderSeccionMateriales(m.materialesNecesarios, catalogoMateriales) : ''}
${m.tornilleria ? renderSeccionTornilleria(m.tornilleria, catalogoTornilleria) : ''}

                <div style="height:2rem;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function renderSeccionPiezas(piezasStr, catalogo) {
    const items = piezasStr.split(',').filter(p => p.trim());
    if (!items.length) return '';

    return `
        <div style="background:white;border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:1rem;border:1px solid #e5e7eb;border-left:4px solid #10b981;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <span style="font-size:1.1rem;">🔗</span>
                <span style="font-weight:700;font-size:0.95rem;color:#047857;">Piezas Kanban necesarias</span>
                <span style="background:#ecfdf5;color:#047857;padding:2px 10px;border-radius:99px;font-size:0.7rem;font-weight:700;margin-left:auto;">${items.length}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                ${items.map(item => {
                    const [codigo, cantidad] = item.trim().split('=');
                    const pieza = Object.values(catalogo).find(p => p.codigo === codigo);
                    const nombre = pieza ? pieza.nombre : codigo;
                    const ubicacion = pieza ? (pieza.ubicacion || '') : '';
                    const stock = pieza ? (pieza.stockActual ?? '—') : '—';
                    const critico = pieza ? ((pieza.stockActual || 0) <= (pieza.stockCritico || 5)) : false;

                    return `
                        <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;border-left:3px solid ${critico ? '#ef4444' : '#10b981'};">
                            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:600;font-size:0.85rem;color:#1e293b;">
                                        ${nombre}
                                        <span style="font-family:'SF Mono', Monaco, monospace;font-size:0.75rem;color:#64748b;font-weight:400;">(${codigo})</span>
                                    </div>
                                    <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">📍 ${ubicacion || 'Sin ubicación'} · 📦 Stock: ${stock}</div>
                                </div>
                                <div style="background:#ecfdf5;color:#047857;padding:3px 10px;border-radius:99px;font-size:0.75rem;font-weight:700;flex-shrink:0;">×${cantidad || 1}</div>
                                ${critico ? `<span style="background:#fef2f2;color:#b91c1c;padding:2px 8px;border-radius:99px;font-size:0.68rem;font-weight:700;">⚠️ Bajo</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderSeccionMateriales(materialesStr, catalogo) {
    const items = materialesStr.split('||').filter(p => p.trim());
    if (!items.length) return '';

    const normales = [];
    const escaneo = [];

    items.forEach(item => {
        const partes = item.split('=');
        const matId = partes[0];
        const cantidad = partes[1];
        const nombreEmb = partes[2] ? decodeURIComponent(partes[2]) : '';
        const codigoEmb = partes[3] ? decodeURIComponent(partes[3]) : '';

        let cat = catalogo[matId];
        if (!cat) {
            cat = Object.values(catalogo).find(m =>
                m.codigo === matId || m.nombre === matId
            );
        }

        const nombre = cat?.nombre || nombreEmb || 'Material';
        const codigo = cat?.codigo || codigoEmb || '';
        const ubicacion = cat?.ubicacion || '';
        const requiereEscaneo = cat?.requiereEscaneo === true;

        const itemRender = {
            nombre,
            codigo,
            ubicacion,
            cantidad: cantidad || '1'
        };

        if (requiereEscaneo) {
            escaneo.push(itemRender);
        } else {
            normales.push(itemRender);
        }
    });

    const totalItems = normales.length + escaneo.length;

    const renderItem = (item, esEscaneo) => {
        const color = esEscaneo ? '#1d4ed8' : '#c2410c';
        const bg = esEscaneo ? '#eff6ff' : '#fffbf5';
        const border = esEscaneo ? '#bfdbfe' : '#fed7aa';
        const icono = esEscaneo ? '📷' : '🧪';

        return `
            <div style="
                background: ${bg};
                border: 1px solid ${border};
                border-radius: 8px;
                padding: 10px 12px;
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                font-size: 0.82rem;
            ">
                <span style="font-size:1rem;">${icono}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;color:#1e293b;">
                        ${item.nombre}
                        ${item.codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#64748b;font-weight:400;">(${item.codigo})</span>` : ''}
                    </div>
                    ${item.ubicacion ? `<div style="font-size:0.7rem;color:#64748b;margin-top:2px;">📍 ${item.ubicacion}</div>` : ''}
                </div>
                <div style="
                    background: ${color}18;
                    color: ${color};
                    padding: 3px 10px;
                    border-radius: 99px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    flex-shrink: 0;
                ">×${item.cantidad}</div>
            </div>
        `;
    };

    let contenido = '';

    if (normales.length) {
        contenido += `
            <div style="
                font-size: 0.72rem;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin: 0 0 6px 2px;
            ">📦 Materiales normales (${normales.length})</div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
                ${normales.map(i => renderItem(i, false)).join('')}
            </div>
        `;
    }

    if (escaneo.length) {
        contenido += `
            <div style="
                font-size: 0.72rem;
                font-weight: 700;
                color: #1d4ed8;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin: 0 0 6px 2px;
            ">📷 Requieren escaneo (${escaneo.length})</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                ${escaneo.map(i => renderItem(i, true)).join('')}
            </div>
        `;
    }

    return `
        <div style="background:white;border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:1rem;border:1px solid #e5e7eb;border-left:4px solid #f97316;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <span style="font-size:1.1rem;">🧪</span>
                <span style="font-weight:700;font-size:0.95rem;color:#c2410c;">Materiales y componentes</span>
                <span style="
                    background: #fff7ed;
                    color: #c2410c;
                    padding: 2px 10px;
                    border-radius: 99px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    margin-left: auto;
                ">${totalItems} tipos</span>
            </div>
            ${contenido}
        </div>
    `;
}

function renderSeccionTornilleria(tornilleriaStr, catalogo) {
    const items = tornilleriaStr.split('||').filter(p => p.trim());
    if (!items.length) return '';

    const porTipo = {};
    items.forEach(item => {
        const partes = item.split('=');
        const tId = partes[0];
        const cantidad = parseInt(partes[1]) || 1;
        const t = catalogo[tId];
        const tipo = t ? t.tipo : 'Otro';
        const nombre = t ? t.nombre : tId;
        const ubicacion = t ? t.ubicacion : '';
        if (!porTipo[tipo]) porTipo[tipo] = [];
        porTipo[tipo].push({ nombre, cantidad, ubicacion });
    });

    const ordenTipo = ['Arandela', 'Tornillo', 'Tuerca', 'Otro'];
    Object.keys(porTipo).forEach(tipo => {
        porTipo[tipo].sort((a, b) => compararTornilleriaNatural(a.nombre, b.nombre));
    });

    const iconos = { 'Tornillo': '🔩', 'Tuerca': '⚙️', 'Arandela': '🔘', 'Otro': '📦' };

    let contenido = '';
    ordenTipo.forEach(tipo => {
        if (porTipo[tipo]) {
            contenido += `
                <div style="margin-bottom: 10px;">
                    <div style="font-size:0.75rem;font-weight:700;color:#6d28d9;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                        <span>${iconos[tipo]}</span>
                        <span>${tipo}s (${porTipo[tipo].length})</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        ${porTipo[tipo].map(item => `
                            <div style="background:#faf5ff;border-radius:6px;padding:8px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.82rem;">
                                <span style="flex:1;color:#1e293b;font-weight:500;">${item.nombre}</span>
                                ${item.ubicacion ? `<span style="font-size:0.72rem;color:#7c3aed;">📍 ${item.ubicacion}</span>` : ''}
                                <span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:99px;font-size:0.72rem;font-weight:700;">×${item.cantidad}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });

    return `
        <div style="background:white;border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:1rem;border:1px solid #e5e7eb;border-left:4px solid #8b5cf6;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <span style="font-size:1.1rem;">🔩</span>
                <span style="font-weight:700;font-size:0.95rem;color:#6d28d9;">Tornillería necesaria</span>
                <span style="background:#f5f3ff;color:#6d28d9;padding:2px 10px;border-radius:99px;font-size:0.7rem;font-weight:700;margin-left:auto;">${items.length}</span>
            </div>
            ${contenido}
        </div>
    `;
}

async function mostrarUbicacionesKanban(montajeId) {
    const montajes = await cargarFirebase('montajes');
    const m = montajes[montajeId];
    if (!m || !m.piezasKanban) {
        alertar('Este montaje no tiene piezas Kanban asignadas', { tipo: 'info' });
        return;
    }

    const piezas = await cargarFirebase('piezas_kanban');
    const items = m.piezasKanban.split(',').filter(p => p.trim());

    const modal = document.createElement('div');
    modal.id = 'modalUbicacionesKanban';
    modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

    modal.innerHTML = `
        <div style="background:white;border-bottom:1px solid #e5e7eb;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                <div style="width:48px;height:48px;background:#eff6ff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">📍</div>
                <div style="min-width:0;">
                    <h2 style="margin:0;color:#1e293b;font-size:1.15rem;font-weight:700;">Ubicaciones Kanban</h2>
                    <div style="font-size:0.78rem;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.nombre || 'Montaje'}</div>
                </div>
            </div>
            <button onclick="cerrarModal('modalUbicacionesKanban')"
                style="background:#f1f5f9;border:none;border-radius:10px;width:44px;height:44px;font-size:1.3rem;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
        </div>

        <div style="flex:1;overflow-y:auto;padding:1.5rem;background:#fafafa;">
            <div style="max-width:900px;margin:0 auto;">
                <div style="display:flex;flex-direction:column;gap:0.75rem;">
                    ${items.map(item => {
                        const [codigo, cantidad] = item.trim().split('=');
                        const pieza = Object.values(piezas).find(p => p.codigo === codigo);
                        const nombre = pieza ? pieza.nombre : codigo;
                        const ubicacion = pieza ? (pieza.ubicacion || '') : '';
                        const stock = pieza ? (pieza.stockActual ?? '—') : '—';
                        const critico = pieza ? ((pieza.stockActual || 0) <= (pieza.stockCritico || 5)) : false;
                        const ubicEscapada = ubicacion.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                        return `
                            <div style="background:white;border:1px solid ${critico ? '#fecaca' : ubicacion ? '#bbf7d0' : '#e5e7eb'};border-left:4px solid ${critico ? '#ef4444' : ubicacion ? '#22c55e' : '#94a3b8'};border-radius:12px;padding:1rem 1.2rem;">
                                <div style="display:flex;align-items:flex-start;gap:12px;">
                                    <div style="width:40px;height:40px;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">📦</div>
                                    <div style="flex:1;min-width:0;">
                                        <div style="font-weight:700;font-size:0.95rem;color:#1e293b;">${nombre}</div>
                                        <div style="font-size:0.75rem;color:#64748b;margin-top:3px;font-family:'SF Mono', Monaco, monospace;">${codigo} · Necesario: ${cantidad || 1} uds · Stock: ${stock}</div>
                                        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                                            <span style="font-size:0.85rem;color:${ubicacion ? '#15803d' : '#94a3b8'};font-weight:${ubicacion ? '700' : '400'};">📍 ${ubicacion || 'Sin ubicación asignada'}</span>
                                            ${ubicacion ? `
                                                <button onclick="event.stopPropagation();navigator.clipboard.writeText('${ubicEscapada}').then(()=>toast('📋 Ubicación copiada'))"
                                                    style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:2px 10px;font-size:0.7rem;color:#1d4ed8;cursor:pointer;font-weight:600;">📋 Copiar</button>
                                            ` : ''}
                                        </div>
                                    </div>
                                    ${critico ? `<span style="background:#fef2f2;color:#b91c1c;padding:4px 10px;border-radius:99px;font-size:0.7rem;font-weight:700;flex-shrink:0;">⚠️ Crítico</span>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="height:2rem;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

async function mostrarInstruccionesMontaje(montajeId) {
    try {
        const montajes = await cargarFirebase('montajes');
        const m = montajes[montajeId];
        if (!m) {
            toast('❌ Montaje no encontrado', '#ef4444');
            return;
        }

        const tieneTexto = !!(m.instrucciones && m.instrucciones.trim());
        const tienePdfs = !!(m.instruccionesPdfs && m.instruccionesPdfs.length > 0);
        const tieneVideo = !!(m.videoInstrucciones && m.videoInstrucciones.trim());

        const modal = document.createElement('div');
        modal.id = 'modalInstruccionesMontaje';
        modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

        modal.innerHTML = `
            <div style="background:white;border-bottom:1px solid #e5e7eb;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                    <div style="width:48px;height:48px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">📖</div>
                    <div style="min-width:0;">
                        <h2 style="margin:0;color:#1e293b;font-size:1.15rem;font-weight:700;">Instrucciones de montaje</h2>
                        <div style="font-size:0.78rem;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.nombre || 'Montaje'} · Orden ${m.orden || '—'}</div>
                    </div>
                </div>
                <button onclick="cerrarModal('modalInstruccionesMontaje')"
                    style="background:#f1f5f9;border:none;border-radius:10px;width:44px;height:44px;font-size:1.3rem;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
            </div>

            <div style="flex:1;overflow-y:auto;padding:1.5rem;background:#fafafa;">
                <div style="max-width:900px;margin:0 auto;">

                    ${!tieneTexto && !tienePdfs && !tieneVideo ? `
                        <div style="background:white;border-radius:12px;padding:3rem 1.5rem;border:1px dashed #cbd5e1;text-align:center;">
                            <div style="font-size:3rem;margin-bottom:12px;">📖</div>
                            <div style="font-size:1rem;color:#1e293b;font-weight:600;margin-bottom:6px;">Sin instrucciones todavía</div>
                            <div style="font-size:0.85rem;color:#64748b;">Este montaje todavía no tiene instrucciones registradas.</div>
                        </div>
                    ` : `
                        ${tieneTexto ? `
                            <div style="background:white;border-radius:12px;padding:1.4rem 1.6rem;margin-bottom:1rem;border:1px solid #e5e7eb;border-left:4px solid #6366f1;">
                                <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                                    <span style="font-size:1rem;">📋</span>
                                    <span>Pasos de montaje</span>
                                </div>
                                <div style="font-size:0.95rem;color:#1e293b;line-height:1.8;white-space:pre-wrap;">${m.instrucciones.split('\n').map((linea, i) => {
                                    const limpia = linea.trim();
                                    if (!limpia) return '';
                                    if (/^\d+[\.\)]\s/.test(limpia)) return limpia;
                                    return `<span style="display:inline-block;background:#eef2ff;color:#4338ca;font-weight:700;border-radius:6px;padding:1px 8px;margin-right:6px;font-size:0.8rem;">${i+1}</span>${limpia}`;
                                }).filter(l => l).join('<br><br>')}</div>
                            </div>
                        ` : ''}

                        ${tienePdfs ? `
                            <div style="background:white;border-radius:12px;padding:1.4rem 1.6rem;margin-bottom:1rem;border:1px solid #e5e7eb;border-left:4px solid #f97316;">
                                <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                                    <span style="font-size:1rem;">📎</span>
                                    <span>Documentos adjuntos</span>
                                </div>
                                <div style="display:flex;flex-direction:column;gap:8px;">
                                    ${(Array.isArray(m.instruccionesPdfs) ? m.instruccionesPdfs : [m.instruccionesPdfs]).map(pdf => {
                                        const url = typeof pdf === 'string' ? pdf : pdf.url;
                                        const nombre = typeof pdf === 'string' ? 'Documento.pdf' : (pdf.nombre || 'Documento.pdf');
                                        const tamaño = typeof pdf === 'string' ? null : pdf.tamaño;
                                        return `
                                            <button onclick="verPdfGrande('${url}', '${nombre.replace(/'/g, "\\'")}')"
                                                style="display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;cursor:pointer;text-align:left;font-family:inherit;">
                                                <div style="width:44px;height:44px;background:white;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">📄</div>
                                                <div style="flex:1;min-width:0;">
                                                    <div style="font-weight:700;font-size:0.92rem;color:#991b1b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nombre}</div>
                                                    <div style="font-size:0.75rem;color:#b91c1c;">${tamaño ? (tamaño / 1024).toFixed(0) + ' KB · ' : ''}Ver documento →</div>
                                                </div>
                                            </button>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${tieneVideo ? `
                            <div style="background:white;border-radius:12px;padding:1.4rem 1.6rem;margin-bottom:1rem;border:1px solid #e5e7eb;border-left:4px solid #3b82f6;">
                                <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                                    <span style="font-size:1rem;">▶️</span>
                                    <span>Video</span>
                                </div>
                                <div style="position:relative;width:100%;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:#000;">
                                    ${renderVideoEmbed(m.videoInstrucciones)}
                                </div>
                            </div>
                        ` : ''}
                    `}

                    <div style="height:2rem;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    } catch (e) {
        console.error('❌ Error:', e);
        toast('❌ Error: ' + e.message, '#ef4444');
    }
}

async function iniciarMontaje(montajeId) {
    try {
        const operacionId = window.APP.operacionActiva;
        if (!operacionId) {
            toast('❌ No hay operación activa', '#ef4444');
            return;
        }

        const crono = await cargarCronoOperacion(operacionId);
        const miNombre = window.APP.operario?.nombre || 'Operario';

        const montajeYaActivo = crono.montajesActivos?.[montajeId];
        const otrosOperarios = montajeYaActivo?.operariosActivos?.filter(n => n !== miNombre) || [];

        if (otrosOperarios.length > 0) {
            const montajesData = await cargarFirebase('montajes');
            const nombreMont = montajesData[montajeId]?.nombre || 'Sin nombre';
            const resp = await mostrarModalMontajeOcupado(nombreMont, otrosOperarios);

            if (resp === 'cancelar' || resp === 'esperar') return;
        }

        const montajeActivoMio = obtenerMiMontajeActivo();

    if (montajeActivoMio && montajeActivoMio.montajeId !== montajeId) {
    const montajesData = await cargarFirebase('montajes');
    const nombreActual = montajesData[montajeActivoMio.montajeId]?.nombre || 'Sin nombre';

    mostrarLoading('Comprobando montaje...');
    const validacion = await validarParaTerminar(montajeActivoMio.montajeId, operacionId);
    ocultarLoading();

    const resp = await mostrarModalCambioMontaje(
        nombreActual,
        'cambiar',
        validacion.ok,
        validacion.motivo || ''
    );

    if (resp === 'cancelar') return;

    if (resp === 'terminar') {
        const terminado = await terminarMontaje(montajeActivoMio.montajeId);

        if (!terminado) {
            return;
        }

        await new Promise(r => setTimeout(r, 800));
    } else if (resp === 'pausar') {
        await detenerCronoMontaje(operacionId, montajeActivoMio.montajeId);
        toast('⏸️ Montaje anterior pausado', '#f59e0b');
    }
}

        if (montajeActivoMio && montajeActivoMio.montajeId === montajeId) {
            toast('⏱️ Este montaje ya está en curso', '#f59e0b');
            return;
        }

        const montajes = await cargarFirebase('montajes');
        const m = montajes[montajeId];
        if (!m) {
            toast('❌ Montaje no encontrado', '#ef4444');
            return;
        }

const historial = await cargarFirebase('historial_montajes');

const registrosMontaje = Object.entries(historial)
    .filter(([hid, h]) => 
        h.montajeId === montajeId && 
        h.operacionId === operacionId && 
        h.completado
    )
    .sort((a, b) => new Date(b[1].fecha) - new Date(a[1].fecha));

const registroActual = registrosMontaje[0];
const yaCompletado = !!registroActual;

if (yaCompletado) {
    const qcEstado = registroActual[1].qcEstado;

    if (qcEstado === 'aprobado') {
        toast('✅ Este montaje ya está aprobado por QC', '#10b981');
        return;
    }

    if (qcEstado === 'rechazado') {
        const ok = await confirmar(
            `⚠️ Este montaje fue RECHAZADO por QC.\n\n📝 Motivo: "${registroActual[1].qcComentario || 'Sin especificar'}"\n\n¿Quieres reabrirlo y corregirlo?`,
            { 
                titulo: '🔧 Reabrir montaje rechazado', 
                tipo: 'warning', 
                okTexto: '🔧 Sí, reabrir' 
            }
        );
        if (!ok) return;

        await guardarFirebase('historial_montajes', registroActual[0], {
            completado: false,
            reabierto: true,
            fechaReapertura: new Date().toISOString(),
            notificacionVista: true
        });

        setTimeout(actualizarBadgeNotificaciones, 500);
    }
}

if (m.materialesNecesarios) {
    const catalogo = await cargarFirebase('materiales_catalogo');
    const verificaciones = await cargarFirebase('materiales_verificados', true);
    const estId = m.puntoId;
    const opKey = operacionId + '_' + estId;
    const verifEstacion = verificaciones[opKey] || { materiales: {} };

    const noEntregados = [];
    const sinVerificar = [];
    const parciales = [];
    const faltantes = [];

    for (const item of m.materialesNecesarios.split('||').filter(p => p)) {
        const partes = item.split('=');
        const matId = partes[0];
        const cantidad = partes[1] || '1';
        const mCat = catalogo[matId];
        const nombreMat = mCat ? mCat.nombre : decodeURIComponent(partes[2] || 'Material');
        const codigo = mCat ? mCat.codigo : (partes[3] ? decodeURIComponent(partes[3]) : '');

        const claveItem = montajeId + '__' + matId;
        const itemGuardado = verifEstacion.materiales?.[claveItem];
        const estado = itemGuardado?.estado || 'pendiente';

        const nombreCompleto = `${nombreMat}${codigo ? ' (' + codigo + ')' : ''}`;

        if (estado === 'pendiente') {
            noEntregados.push(`⏳ ${nombreCompleto}: ${cantidad} uds`);
        } else if (estado === 'entregado') {
            sinVerificar.push(`📥 ${nombreCompleto}: ${cantidad} uds`);
        } else if (estado === 'entregado_parcial') {
            const entregado = itemGuardado.cantidadEntregada || 0;
            parciales.push(`🔵 ${nombreCompleto}: ${entregado}/${cantidad} uds`);
        } else if (estado === 'falta') {
            const falta = itemGuardado.cantidadFaltante || '?';
            const motivo = itemGuardado.comentario ? ` · "${itemGuardado.comentario}"` : '';
            faltantes.push(`🚫 ${nombreCompleto}: faltan ${falta} de ${cantidad}${motivo}`);
        }
    }

    const hayProblemas = noEntregados.length > 0 || sinVerificar.length > 0 ||
                         parciales.length > 0 || faltantes.length > 0;

    if (hayProblemas) {
        let mensaje = '';
        if (faltantes.length > 0) {
            mensaje += `🚫 CON FALTA REPORTADA (${faltantes.length}):\n${faltantes.join('\n')}\n\n`;
        }
        if (noEntregados.length > 0) {
            mensaje += `❌ SIN ENTREGAR (${noEntregados.length}):\n${noEntregados.join('\n')}\n\n`;
        }
        if (parciales.length > 0) {
            mensaje += `🔵 ENTREGADOS PARCIALMENTE (${parciales.length}):\n${parciales.join('\n')}\n\n`;
        }
        if (sinVerificar.length > 0) {
            mensaje += `⚠️ ENTREGADOS SIN VERIFICAR (${sinVerificar.length}):\n${sinVerificar.join('\n')}\n\n`;
        }
        mensaje += `¿Quieres iniciar igual?`;

        const ok = await dialogo(
            mensaje,
            { titulo: '⚠️ Revisa los materiales', tipo: 'warning', okTexto: '▶️ Iniciar igual' }
        );
        if (!ok) return;
    }
}

if (m.paresRequeridos) {
    const pares = m.paresRequeridos.split(',').map(p => parseFloat(p.trim())).filter(p => p > 0);
    if (pares.length > 0) {
        const herramientas = await cargarFirebase('herramientas');
        const disponibles = Object.entries(herramientas).filter(([hid, h]) =>
            h.tipo === 'Llave Dinamométrica' &&
            pares.some(p => parseFloat(h.par) === p) &&
            (h.estado === 'disponible' || !h.estado)
        );

        if (disponibles.length === 0) {
            const ok = await dialogo(
                `No hay herramientas disponibles para los pares: ${pares.join(', ')} Nm\n\n¿Quieres iniciar igual?`,
                { titulo: '⚠️ Sin herramientas', tipo: 'warning', okTexto: '▶️ Iniciar igual' }
            );
            if (!ok) return;
        }
    }
}

        mostrarLoading('Iniciando montaje...');
        await arrancarCronoMontaje(operacionId, montajeId);
        ocultarLoading();

        toast('▶️ Montaje iniciado', '#10b981');

        const modelo = window.APP.modeloActivo || 'MS3';
        cargarMontajesOperacion(operacionId, modelo);

    } catch (e) {
        ocultarLoading();
        console.error('❌ Error iniciar montaje:', e);
        toast('❌ Error: ' + e.message, '#ef4444');
    }
}
