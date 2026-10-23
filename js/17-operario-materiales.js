window.APP.materialesVistaActual = {
    operacionId: null,
    estacionId: null
};

async function cargarMaterialesOperario() {
    const cont = document.getElementById('materialesContainer');
    if (!cont) return;

    cont.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const [operaciones, estaciones, montajes, catalogoMat, verificaciones] = await Promise.all([
        cargarFirebase('operaciones', true),
        cargarFirebase('estaciones'),
        cargarFirebase('montajes'),
        cargarFirebase('materiales_catalogo'),
        cargarFirebase('materiales_verificados', true)
    ]);

    if (!Object.keys(operaciones).length) {
        cont.innerHTML = '<div class="empty-state">📭 No hay operaciones creadas</div>';
        return;
    }

    const operacionIdActual = window.APP.materialesVistaActual.operacionId
        || window.APP.operacionActiva
        || Object.keys(operaciones)[0];

    const opActual = operaciones[operacionIdActual];
    if (!opActual) {
        cont.innerHTML = '<div class="empty-state">⚠️ Operación no encontrada</div>';
        return;
    }

    window.APP.materialesVistaActual.operacionId = operacionIdActual;

    const estFiltradas = Object.entries(estaciones)
        .filter(([id, e]) => e.modelo === (opActual.modelo || 'MS3'))
        .sort((a, b) => {
            const numA = parseInt((a[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            const numB = parseInt((b[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            return numA - numB;
        });

    let html = `
        <div style="background:white;border-radius:14px;padding:14px 16px;border:1px solid #e5e7eb;margin-bottom:1rem;">
            <div style="display:grid;grid-template-columns:1fr;gap:10px;">
                <div>
                    <label style="display:block;font-size:0.78rem;font-weight:700;color:#64748b;margin-bottom:4px;">📋 Operación</label>
                    <select id="matOpSelect" onchange="cambiarOperacionMateriales(this.value)" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.9rem;font-family:inherit;font-weight:600;">
                        ${Object.entries(operaciones)
                            .sort((a, b) => String(b[1].numero || '').localeCompare(String(a[1].numero || ''), undefined, { numeric: true }))
                            .map(([id, op]) => `
                                <option value="${id}" ${id === operacionIdActual ? 'selected' : ''}>
                                    ${op.modelo === 'MS3' ? '🔷' : '🔶'} Op. ${op.numero} (${op.modelo || 'MS3'})
                                </option>
                            `).join('')}
                    </select>
                </div>
            </div>
        </div>
    `;

    const esOperacionActiva = window.APP.operacionActiva === operacionIdActual;

    let totalMatGlobal = 0;
    let totalVerifGlobal = 0;

    html += '<div style="display:flex;flex-direction:column;gap:1rem;">';

    for (const [estId, est] of estFiltradas) {
        const montajesEst = Object.entries(montajes)
            .filter(([mid, m]) => m.puntoId === estId && m.modelo === opActual.modelo)
            .sort((a, b) => (parseInt(a[1].orden) || 0) - (parseInt(b[1].orden) || 0));

        const tieneMateriales = montajesEst.some(([mid, m]) => m.materialesNecesarios);
        if (!tieneMateriales) continue;

        const clave = operacionIdActual + '_' + estId;
        const verifActual = verificaciones[clave] || { materiales: {} };

        let totalMat = 0;
        let totalVerif = 0;
        let totalEntregados = 0;

        montajesEst.forEach(([mid, m]) => {
            if (!m.materialesNecesarios) return;
            m.materialesNecesarios.split('||').forEach(item => {
                const matId = item.trim().split('=')[0];
                if (!matId) return;
                totalMat++;
                const estado = verifActual.materiales?.[mid + '__' + matId]?.estado;
                if (estado === 'entregado') totalEntregados++;
                if (estado === 'verificado') totalVerif++;
            });
        });

        totalMatGlobal += totalMat;
        totalVerifGlobal += totalVerif;

        const pct = totalMat > 0 ? Math.round((totalVerif / totalMat) * 100) : 0;
        const colorEst = est.color || '#10b981';
        const todoVerif = totalVerif === totalMat && totalMat > 0;

        html += `
            <div style="background:white;border-radius:14px;padding:14px 16px;border:1px solid ${colorEst}40;border-left:4px solid ${colorEst};">

                <!-- CABECERA ESTACIÓN -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                        <span style="font-size:1.4rem;">🏭</span>
                        <div style="min-width:0;">
                            <div style="font-weight:700;font-size:0.95rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                ${est.nombre || 'Sin nombre'}
                            </div>
                            <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">
                                ${totalMat} material${totalMat !== 1 ? 'es' : ''} · ${totalEntregados} entregados · ${totalVerif} verificados
                            </div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1rem;font-weight:800;color:${todoVerif ? '#047857' : (pct > 0 ? '#f97316' : '#94a3b8')};">
                            ${pct}%
                        </div>
                    </div>
                </div>

                <!-- BARRA DE PROGRESO -->
                <div style="background:#e5e7eb;height:6px;border-radius:99px;overflow:hidden;margin-bottom:14px;">
                    <div style="background:${todoVerif ? '#10b981' : '#f97316'};height:100%;width:${pct}%;border-radius:99px;transition:width 0.3s ease;"></div>
                </div>

                <!-- MONTAJES -->
                <div style="display:flex;flex-direction:column;gap:12px;">
        `;

        montajesEst.forEach(([mid, m]) => {
            if (!m.materialesNecesarios) return;

            const mats = m.materialesNecesarios.split('||').filter(x => x.trim());
            if (!mats.length) return;

            html += `
                <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;border:1px solid #e5e7eb;">
                    <div style="font-weight:600;font-size:0.82rem;color:#1e293b;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                        <span>${m.icono || '📦'}</span>
                        <span>${m.orden || ''}. ${m.nombre || 'Sin nombre'}</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
            `;

            mats.forEach(item => {
    const partes = item.split('=');
    const matId = partes[0];
    const cantidadTotal = parseInt(partes[1]) || 1;

                const cantidad = partes[1];
                const nombreEmb = partes[2] ? decodeURIComponent(partes[2]) : '';
                const codigoEmb = partes[3] ? decodeURIComponent(partes[3]) : '';

                let cat = catalogoMat[matId];
                if (!cat) {
                    cat = Object.values(catalogoMat).find(mm =>
                        mm.codigo === matId || mm.nombre === matId
                    );
                }

                const nombre = cat?.nombre || nombreEmb || matId;
                const codigo = cat?.codigo || codigoEmb || '';
                const ubicacion = cat?.ubicacion || '';
                const requiereEscaneo = cat?.requiereEscaneo === true;

                const claveItem = mid + '__' + matId;
const itemGuardado = verifActual.materiales?.[claveItem] || {};
const estado = itemGuardado.estado || 'pendiente';
const cantEntregada = itemGuardado.cantidadEntregada ?? 0;
const cantFaltante = itemGuardado.cantidadFaltante ?? 0;

let bg, border, textColor, iconoEstado, badgeTexto;
if (estado === 'verificado') {
    bg = '#ecfdf5'; border = '#a7f3d0'; textColor = '#047857';
    iconoEstado = '✅'; badgeTexto = 'Verificado';
} else if (estado === 'entregado_parcial') {
    bg = '#eff6ff'; border = '#93c5fd'; textColor = '#1e40af';
    iconoEstado = '🔵'; badgeTexto = `Parcial ${cantEntregada}/${cantidadTotal}`;
} else if (estado === 'entregado') {
    bg = '#eff6ff'; border = '#bfdbfe'; textColor = '#1d4ed8';
    iconoEstado = '📥'; badgeTexto = 'Entregado';
} else if (estado === 'falta') {
    bg = '#fef2f2'; border = '#fecaca'; textColor = '#b91c1c';
    iconoEstado = '⚠️'; badgeTexto = `Falta${cantFaltante ? ' ' + cantFaltante : ''}`;
} else {
    bg = '#fff7ed'; border = '#fed7aa'; textColor = '#c2410c';
    iconoEstado = '⏳'; badgeTexto = 'Pendiente';
}

                const puedeVerificar = estado === 'entregado';
                const yaVerificado = estado === 'verificado';

                html += `
           <div style="
    display:flex;flex-direction:column;gap:8px;
    padding:10px 12px;
    background:${bg};
    border:1px solid ${border};
    border-left:3px solid ${requiereEscaneo ? '#3b82f6' : '#f97316'};
    border-radius:8px;
">
    <!-- FILA 1: icono + nombre completo -->
    <div style="display:flex;align-items:flex-start;gap:10px;">
        <span style="font-size:1.1rem;flex-shrink:0;line-height:1.3;">${requiereEscaneo ? '📷' : '🧪'}</span>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.85rem;color:#1e293b;line-height:1.3;word-break:break-word;">
                ${nombre}
                ${codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.7rem;color:#64748b;font-weight:400;">(${codigo})</span>` : ''}
            </div>
            ${ubicacion ? `<div style="font-size:0.7rem;color:#64748b;margin-top:3px;">📍 ${ubicacion}</div>` : ''}
        </div>
    </div>

    <!-- FILA 2: badges + botones -->
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
    <span style="
        background:${textColor}18;
        color:${textColor};
        padding:3px 10px;
        border-radius:99px;
        font-size:0.7rem;
        font-weight:700;
        display:inline-flex;
        align-items:center;
        gap:4px;
    ">${iconoEstado} ${badgeTexto}</span>
    <span style="
        background:#64748b18;
        color:#475569;
        padding:3px 10px;
        border-radius:99px;
        font-size:0.75rem;
        font-weight:700;
    ">×${cantidad || 1}</span>

                     ${puedeVerificar && !yaVerificado ? `
    <button onclick="verificarMaterialOperario('${operacionIdActual}', '${estId}', '${mid}', '${matId}')"
        style="
            background:#10b981;
            border:none;
            color:white;
            padding:6px 12px;
            border-radius:8px;
            font-size:0.75rem;
            font-weight:700;
            cursor:pointer;
            display:inline-flex;
            align-items:center;
            gap:4px;
            flex-shrink:0;
            font-family:inherit;
        ">
        ✅ Verificar
    </button>
    <button onclick="abrirModalFalta('${operacionIdActual}', '${estId}', '${mid}', '${matId}', '${nombre.replace(/'/g, "\\'")}')"
        style="
            background:#fef2f2;
            border:1px solid #fecaca;
            color:#b91c1c;
            padding:6px 12px;
            border-radius:8px;
            font-size:0.75rem;
            font-weight:700;
            cursor:pointer;
            display:inline-flex;
            align-items:center;
            gap:4px;
            flex-shrink:0;
            font-family:inherit;
        ">
        ❌ Falta
    </button>
` : yaVerificado ? `
    <span style="font-size:0.7rem;color:#047857;font-weight:600;flex-shrink:0;">
        👤 ${itemGuardado.verificadoPor || '—'}
    </span>
` : estado === 'falta' ? `
    <span style="font-size:0.7rem;color:#b91c1c;font-weight:600;flex-shrink:0;">
        ⚠️ Falta ${itemGuardado.cantidadFaltante || '?'} · 👤 ${itemGuardado.reportadoPor || '—'}
    </span>
    <button onclick="abrirModalFalta('${operacionIdActual}', '${estId}', '${mid}', '${matId}', '${nombre.replace(/'/g, "\\'")}', ${itemGuardado.cantidadFaltante || 1}, '${(itemGuardado.comentario || '').replace(/'/g, "\\'")}')"
        style="
            background:white;
            border:1px solid #fecaca;
            color:#b91c1c;
            padding:5px 10px;
            border-radius:8px;
            font-size:0.7rem;
            font-weight:700;
            cursor:pointer;
            flex-shrink:0;
            font-family:inherit;
        ">
        ✏️ Editar
    </button>
` : `
    <span style="font-size:0.7rem;color:#94a3b8;font-weight:500;font-style:italic;">
        Pendiente de entrega
    </span>
`}
                        </div>

                        ${itemGuardado.respuestaAdmin && estado !== 'verificado' && itemGuardado.estado !== 'verificado' ? `
                            <div style="
                                width:100%;
                                padding:8px 12px;
                                background:#eff6ff;
                                border-left:3px solid #3b82f6;
                                border-radius:6px;
                                font-size:0.75rem;
                                line-height:1.4;
                            ">
                                <div style="display:flex;align-items:flex-start;gap:6px;">
                                    <span style="flex-shrink:0;">👨‍💼</span>
                                    <div style="flex:1;min-width:0;">
                                        <div style="font-weight:700;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.05em;color:#1d4ed8;margin-bottom:3px;">Admin</div>
                                        <div style="color:#1e293b;font-weight:500;">"${itemGuardado.respuestaAdmin}"</div>
                                        ${itemGuardado.fechaRespuestaAdmin ? `<div style="font-size:0.65rem;color:#3b82f6;margin-top:3px;">📅 ${formatearFechaCorta(itemGuardado.fechaRespuestaAdmin)}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    html += '</div>';

    if (totalMatGlobal > 0) {
        const pctGlobal = Math.round((totalVerifGlobal / totalMatGlobal) * 100);
        const resumen = `
            <div style="background:linear-gradient(135deg,#eff6ff,white);border:1px solid #bfdbfe;border-left:4px solid #3b82f6;border-radius:14px;padding:14px 16px;margin-bottom:1rem;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <div style="font-weight:700;font-size:0.95rem;color:#1d4ed8;">
                        📊 Verificación total de la operación
                    </div>
                    <div style="font-size:1rem;font-weight:800;color:${pctGlobal === 100 ? '#047857' : '#f97316'};">
                        ${totalVerifGlobal}/${totalMatGlobal} (${pctGlobal}%)
                    </div>
                </div>
                <div style="background:#e5e7eb;height:8px;border-radius:99px;overflow:hidden;">
                    <div style="background:${pctGlobal === 100 ? '#10b981' : '#f97316'};height:100%;width:${pctGlobal}%;border-radius:99px;transition:width 0.3s ease;"></div>
                </div>
            </div>
        `;
        html = resumen + html;
    }

    cont.innerHTML = html;
}

function cambiarOperacionMateriales(operacionId) {
    window.APP.materialesVistaActual.operacionId = operacionId;
    window.APP.materialesVistaActual.estacionId = null;
    cargarMaterialesOperario();
}

async function verificarMaterialOperario(operacionId, estacionId, montajeId, matId) {
    const clave = operacionId + '_' + estacionId;
    const claveItem = montajeId + '__' + matId;

    try {
        const data = await cargarFirebase('materiales_verificados', true);
        const doc = data[clave];

        if (!doc || !doc.materiales || !doc.materiales[claveItem]) {
            toast('⚠️ Este material no ha sido entregado todavía', '#f59e0b');
            return;
        }

        doc.materiales[claveItem].estado = 'verificado';
        doc.materiales[claveItem].verificadoPor = window.APP.operario?.nombre || 'Operario';
        doc.materiales[claveItem].fechaVerificacion = new Date().toISOString();
        doc.ultimaActualizacion = new Date().toISOString();

        await guardarFirebase('materiales_verificados', clave, doc);

        toast('✅ Material verificado', '#10b981', 1200);

        cargarMaterialesOperario();
    } catch (e) {
        console.error('❌ Error verificando material:', e);
        toast('❌ Error al verificar', '#ef4444');
    }
}

function abrirModalFalta(operacionId, estacionId, montajeId, matId, nombreMaterial, cantidadActual = 1, comentarioActual = '') {
    document.getElementById('modalFaltaMaterial')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modalFaltaMaterial';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

    modal.innerHTML = `
        <div style="background:white;border-radius:18px;padding:24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.4);">

            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:2.5rem;">⚠️</div>
                <h3 style="color:#b91c1c;margin:6px 0 4px 0;font-size:1.1rem;font-weight:700;">
                    Registrar falta
                </h3>
                <p style="font-size:0.85rem;color:#64748b;margin:0;">
                    <strong style="color:#1e293b;">${nombreMaterial}</strong>
                </p>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
                <label style="display:block;font-size:0.8rem;font-weight:700;color:#475569;margin-bottom:4px;">
                    ¿Cuántos faltan?
                </label>
                <input type="number" id="faltaCantidad" value="${cantidadActual}" min="1"
                    style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:1rem;font-weight:700;text-align:center;font-family:inherit;">
            </div>

            <div class="form-group" style="margin-bottom:16px;">
                <label style="display:block;font-size:0.8rem;font-weight:700;color:#475569;margin-bottom:4px;">
                    Motivo (opcional)
                </label>
                <textarea id="faltaComentario" rows="3" placeholder="Ej: Solo había 1 en almacén"
                    style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.85rem;font-family:inherit;resize:vertical;">${comentarioActual}</textarea>
            </div>

            <div style="display:flex;gap:8px;">
                <button onclick="cerrarModalFalta()"
                    style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;font-size:0.85rem;color:#64748b;font-weight:600;font-family:inherit;">
                    Cancelar
                </button>
                <button onclick="confirmarFaltaMaterial('${operacionId}', '${estacionId}', '${montajeId}', '${matId}')"
                    style="flex:1;padding:12px;border:none;border-radius:10px;background:#ef4444;color:white;cursor:pointer;font-size:0.85rem;font-weight:700;font-family:inherit;">
                    ⚠️ Registrar falta
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalFalta();
    });

    setTimeout(() => document.getElementById('faltaCantidad')?.focus(), 100);
}

function cerrarModalFalta() {
    document.getElementById('modalFaltaMaterial')?.remove();
}

async function confirmarFaltaMaterial(operacionId, estacionId, montajeId, matId) {
    const cantidadFaltante = parseInt(document.getElementById('faltaCantidad')?.value) || 1;
    const comentario = (document.getElementById('faltaComentario')?.value || '').trim();

    if (cantidadFaltante <= 0) {
        toast('⚠️ La cantidad debe ser mayor que 0', '#f59e0b');
        return;
    }

    const clave = operacionId + '_' + estacionId;
    const claveItem = montajeId + '__' + matId;

    try {
        const data = await cargarFirebase('materiales_verificados', true);
        const doc = data[clave];

        if (!doc || !doc.materiales || !doc.materiales[claveItem]) {
            toast('⚠️ Este material no ha sido entregado todavía', '#f59e0b');
            cerrarModalFalta();
            return;
        }

doc.materiales[claveItem].estado = 'falta';
doc.materiales[claveItem].cantidadFaltante = cantidadFaltante;
doc.materiales[claveItem].comentario = comentario;
doc.materiales[claveItem].reportadoPor = window.APP.operario?.nombre || 'Operario';
doc.materiales[claveItem].fechaReporte = new Date().toISOString();
doc.ultimaActualizacion = new Date().toISOString();

await guardarFirebase('materiales_verificados', clave, doc);

try {
    const [montajes, catalogoMat, operaciones] = await Promise.all([
        cargarFirebase('montajes'),
        cargarFirebase('materiales_catalogo'),
        cargarFirebase('operaciones')
    ]);

    const montaje = montajes[montajeId];
    const op = operaciones[operacionId];

    let cat = catalogoMat[matId];
    if (!cat) {
        cat = Object.values(catalogoMat).find(mm =>
            mm.codigo === matId || mm.nombre === matId
        );
    }

    const nombreMaterial = cat?.nombre || matId;
    const codigoMaterial = cat?.codigo || '';

    const idAlerta = 'falta_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    await guardarFirebase('alertas_admin', idAlerta, {
        tipo: 'falta_material',
        materialId: matId,
        materialNombre: nombreMaterial,
        materialCodigo: codigoMaterial,
        cantidadFaltante: cantidadFaltante,
        comentario: comentario,
        montajeId: montajeId,
        montajeNombre: montaje?.nombre || '—',
        operacionId: operacionId,
        numeroOperacion: op?.numero || '—',
        estacionId: estacionId,
        reportadoPor: window.APP.operario?.nombre || 'Operario',
        fecha: new Date().toISOString(),
        leida: false
    });

    console.log('🔔 Alerta creada para el admin:', idAlerta);
} catch (e) {
    console.error('⚠️ Error creando alerta (no bloquea):', e);
}

        toast(`⚠️ Falta registrada (${cantidadFaltante} uds)`, '#f59e0b', 1500);

        cerrarModalFalta();
        cargarMaterialesOperario();
    } catch (e) {
        console.error('❌ Error registrando falta:', e);
        toast('❌ Error al registrar', '#ef4444');
    }
}
