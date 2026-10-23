async function iniciarEntregaMateriales() {
    const selOp = document.getElementById('entregaOperacionSelect');
    if (!selOp) return;

    const operaciones = await cargarFirebase('operaciones', true);
    const arr = Object.entries(operaciones).sort((a, b) =>
        String(b[1].numero || '').localeCompare(String(a[1].numero || ''), undefined, { numeric: true })
    );

    const valorActual = selOp.value;
    selOp.innerHTML = '<option value="">— Selecciona operación —</option>';
    arr.forEach(([id, op]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `${op.modelo === 'MS3' ? '🔷' : '🔶'} Op. ${op.numero} (${op.modelo || 'MS3'})`;
        selOp.appendChild(opt);
    });

    if (valorActual) selOp.value = valorActual;
}

async function onCambioOperacionEntrega() {
    const operacionId = document.getElementById('entregaOperacionSelect')?.value;
    const selEst = document.getElementById('entregaEstacionSelect');

    if (!operacionId) {
        selEst.innerHTML = '<option value="">— Selecciona estación —</option>';
        selEst.disabled = true;
        document.getElementById('adminEntregaMaterialesList').innerHTML = `
            <div class="empty-state">👆 Selecciona una operación y estación para empezar</div>
        `;
        return;
    }

    const [operaciones, estaciones] = await Promise.all([
        cargarFirebase('operaciones'),
        cargarFirebase('estaciones')
    ]);

    const op = operaciones[operacionId];
    const modelo = op?.modelo || 'MS3';

    const estFiltradas = Object.entries(estaciones)
        .filter(([id, e]) => e.modelo === modelo)
        .sort((a, b) => {
            const numA = parseInt((a[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            const numB = parseInt((b[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            return numA - numB;
        });

    selEst.innerHTML = '<option value="">— Selecciona estación —</option>';
    estFiltradas.forEach(([id, e]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `📍 ${e.nombre}`;
        selEst.appendChild(opt);
    });
    selEst.disabled = false;

    document.getElementById('adminEntregaMaterialesList').innerHTML = `
        <div class="empty-state">👆 Selecciona una estación</div>
    `;
}

async function cargarEntregaMateriales() {
    const operacionId = document.getElementById('entregaOperacionSelect')?.value;
    const estacionId = document.getElementById('entregaEstacionSelect')?.value;

    const cont = document.getElementById('adminEntregaMaterialesList');
    if (!cont) return;

    if (operacionId && !estacionId) {
        await onCambioOperacionEntrega();
        return;
    }

    if (!operacionId || !estacionId) {
        cont.innerHTML = '<div class="empty-state">👆 Selecciona operación y estación</div>';
        return;
    }

    cont.innerHTML = '<div class="empty-state">⏳ Cargando materiales...</div>';

    const [montajes, catalogoMat, verificaciones, estaciones] = await Promise.all([
        cargarFirebase('montajes', true),
        cargarFirebase('materiales_catalogo'),
        cargarFirebase('materiales_verificados', true),
        cargarFirebase('estaciones')
    ]);

    const est = estaciones[estacionId];
    const clave = operacionId + '_' + estacionId;
    const verifActual = verificaciones[clave] || { materiales: {} };

    const montajesEst = Object.entries(montajes)
        .filter(([mid, m]) => m.puntoId === estacionId)
        .sort((a, b) => (parseInt(a[1].orden) || 0) - (parseInt(b[1].orden) || 0));

    if (!montajesEst.length) {
        cont.innerHTML = `<div class="empty-state">📭 Esta estación no tiene montajes asignados.</div>`;
        return;
    }

    let totalMat = 0;
    let totalOk = 0;
    let totalParcial = 0;
    let totalFalta = 0;
    let totalPendiente = 0;

    let html = `
        <div style="background:linear-gradient(135deg,#eff6ff,white);border:1px solid #bfdbfe;border-left:4px solid #3b82f6;border-radius:12px;padding:12px 16px;margin-bottom:1rem;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="font-size:1.5rem;">📍</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;color:#1d4ed8;font-size:0.95rem;">${est?.nombre || 'Estación'}</div>
                <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">${montajesEst.length} montaje${montajesEst.length !== 1 ? 's' : ''}</div>
            </div>
        </div>
    `;

    montajesEst.forEach(([mid, m]) => {
        if (!m.materialesNecesarios) return;

        const mats = m.materialesNecesarios.split('||').filter(x => x.trim());
        if (!mats.length) return;

        html += `
            <div style="background:white;border-radius:12px;padding:1rem 1.2rem;margin-bottom:0.75rem;border:1px solid #e5e7eb;border-left:4px solid #f97316;">
                <div style="font-weight:700;font-size:0.9rem;color:#c2410c;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
                    <span>${m.icono || '📦'}</span>
                    <span>${m.orden || ''}. ${m.nombre || 'Sin nombre'}</span>
                    <span style="font-size:0.7rem;color:#94a3b8;font-weight:500;">(${mats.length} mat.)</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
        `;

        mats.forEach(item => {
            const partes = item.split('=');
            const matId = partes[0];
            const cantidadTotal = parseInt(partes[1]) || 1;
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

            totalMat++;
            if (estado === 'verificado' || estado === 'entregado') totalOk++;
            else if (estado === 'entregado_parcial') totalParcial++;
            else if (estado === 'falta') totalFalta++;
            else if (estado === 'pendiente') totalPendiente++;

            let color, bg, icono;
            if (estado === 'verificado' || estado === 'entregado') {
                color = '#10b981'; bg = '#ecfdf5'; icono = '✅';
            } else if (estado === 'entregado_parcial') {
                color = '#3b82f6'; bg = '#eff6ff'; icono = '🔵';
            } else if (estado === 'falta') {
                color = '#ef4444'; bg = '#fef2f2'; icono = '⚠️';
        } else {
    color = '#f97316'; bg = '#fff7ed'; icono = '⏳';
}

            const inputId = 'inp_' + claveItem.replace(/[^a-zA-Z0-9]/g, '_');

            html += `
    <div data-clave-item="${claveItem}" style="background:${bg};border:1px solid ${color}40;border-left:3px solid ${requiereEscaneo ? '#3b82f6' : '#f97316'};border-radius:8px;padding:10px 12px;transition:all 0.3s ease;">

                    <!-- CABECERA ITEM -->
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                        <span style="font-size:1rem;">${icono}</span>
                        <span style="font-size:1rem;flex-shrink:0;">${requiereEscaneo ? '📷' : '🧪'}</span>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;font-size:0.85rem;color:#1e293b;">
                                ${nombre}
                                ${codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.7rem;color:#64748b;font-weight:400;">(${codigo})</span>` : ''}
                            </div>
                            ${ubicacion ? `<div style="font-size:0.7rem;color:#64748b;margin-top:2px;">📍 ${ubicacion}</div>` : ''}
                        </div>
                        <span style="background:${color}18;color:${color};padding:3px 10px;border-radius:99px;font-size:0.72rem;font-weight:700;flex-shrink:0;">
                            Total: ${cantidadTotal} uds
                        </span>
                    </div>

           <!-- ESTADO ACTUAL -->
<div style="font-size:0.72rem;color:${color};font-weight:600;margin-bottom:8px;">
    ${estado === 'pendiente' ? '⏳ Sin entregar' :
      estado === 'entregado' ? `✅ Entregado completo · ${itemGuardado.entregadoPor || ''}${itemGuardado.fechaEntrega ? ' · 📅 ' + formatearFechaCorta(itemGuardado.fechaEntrega) : ''}` :
      estado === 'entregado_parcial' ? `🔵 Entregado parcial: ${cantEntregada}/${cantidadTotal} · ${itemGuardado.entregadoPor || ''}${itemGuardado.fechaEntrega ? ' · 📅 ' + formatearFechaCorta(itemGuardado.fechaEntrega) : ''}` :
      estado === 'falta' ? `⚠️ Falta${cantFaltante ? ' ' + cantFaltante : ''} · ${itemGuardado.reportadoPor || ''}${itemGuardado.fechaReporte ? ' · 📅 ' + formatearFechaCorta(itemGuardado.fechaReporte) : ''}` :
      estado === 'verificado' ? `✅ Verificado por ${itemGuardado.verificadoPor || ''}${itemGuardado.fechaVerificacion ? ' · 📅 ' + formatearFechaCorta(itemGuardado.fechaVerificacion) : ''}` : estado}
</div>

                    ${itemGuardado.comentario ? `
                        <div style="background:white;border-radius:6px;padding:6px 10px;font-size:0.72rem;color:#64748b;margin-bottom:8px;border-left:2px solid ${color};">
                            💬 "${itemGuardado.comentario}"
                        </div>
                    ` : ''}

                    <!-- CONTROLES -->
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">

                        ${estado === 'falta' ? `
                            <button onclick="marcarFaltaResuelta('${operacionId}', '${estacionId}', '${mid}', '${matId}')"
                                style="background:#10b981;border:none;color:white;padding:6px 12px;border-radius:6px;font-size:0.72rem;font-weight:700;cursor:pointer;font-family:inherit;">
                                ✅ Resolver falta
                            </button>
                            <button onclick="responderFalta('${operacionId}', '${estacionId}', '${mid}', '${matId}')"
                                style="background:white;border:1px solid #cbd5e1;color:#64748b;padding:6px 12px;border-radius:6px;font-size:0.72rem;font-weight:600;cursor:pointer;font-family:inherit;">
                                💬 Responder
                            </button>
     ` : estado === 'verificado' ? `
` : `
                            <label style="font-size:0.72rem;color:#64748b;font-weight:600;">📦 Entregar:</label>
                            <input type="number" value="${cantEntregada}" min="0" max="${cantidadTotal}"
                                id="${inputId}"
                                style="width:70px;padding:6px 8px;border-radius:6px;border:1px solid ${color}60;font-size:0.85rem;text-align:center;font-weight:700;color:${color};font-family:inherit;">
                            <span style="font-size:0.72rem;color:#94a3b8;">de ${cantidadTotal}</span>

                            <button onclick="entregarCantidadManual('${operacionId}', '${estacionId}', '${mid}', '${matId}', '${inputId}', ${cantidadTotal})"
                                style="
                                    background: ${estado === 'pendiente' ? '#3b82f6' : '#f59e0b'};
                                    border: none;
                                    color: white;
                                    padding: 6px 14px;
                                    border-radius: 6px;
                                    font-size: 0.72rem;
                                    font-weight: 700;
                                    cursor: pointer;
                                    font-family: inherit;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 4px;
                                ">
                                ${estado === 'pendiente' ? '📥 Entregar' : '✏️ Actualizar'}
                            </button>

                            ${cantEntregada > 0 ? `
                                <button onclick="resetearEntregaMaterial('${operacionId}', '${estacionId}', '${mid}', '${matId}')"
                                    style="background:white;border:1px solid #e5e7eb;color:#94a3b8;padding:6px 10px;border-radius:6px;font-size:0.7rem;font-weight:600;cursor:pointer;font-family:inherit;">
                                    ↺ Resetear
                                </button>
                            ` : ''}
                        `}
                    </div>

         ${itemGuardado.respuestaAdmin && estado !== 'verificado' ? `
    <div style="background:#eff6ff;border-radius:6px;padding:8px 12px;font-size:0.72rem;color:#1e293b;margin-top:8px;border-left:3px solid #3b82f6;">
        <div style="display:flex;align-items:flex-start;gap:6px;">
            <span style="flex-shrink:0;">👨‍💼</span>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.05em;color:#1d4ed8;margin-bottom:3px;">Admin</div>
                <div style="font-weight:500;">"${itemGuardado.respuestaAdmin}"</div>
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

    if (totalMat > 0) {
        const pctOk = Math.round((totalOk / totalMat) * 100);
        const resumen = `
            <div style="background:white;border-radius:12px;padding:14px 16px;margin-bottom:1rem;border:1px solid #e5e7eb;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                    <div style="font-weight:700;font-size:0.9rem;color:#1e293b;">📦 Resumen de entrega</div>
                    <div style="font-size:0.85rem;font-weight:700;color:${pctOk === 100 ? '#047857' : '#f97316'};">
                        ${totalOk}/${totalMat} (${pctOk}%)
                    </div>
                </div>
                <div style="background:#e5e7eb;height:8px;border-radius:99px;overflow:hidden;margin-bottom:10px;">
                    <div style="background:${pctOk === 100 ? '#10b981' : '#f97316'};height:100%;width:${pctOk}%;border-radius:99px;transition:width 0.3s ease;"></div>
                </div>
                <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.75rem;">
                    <span style="color:#10b981;font-weight:700;">✅ OK: ${totalOk}</span>
                    ${totalParcial > 0 ? `<span style="color:#3b82f6;font-weight:700;">🔵 Parcial: ${totalParcial}</span>` : ''}
                    ${totalFalta > 0 ? `<span style="color:#ef4444;font-weight:700;">⚠️ Falta: ${totalFalta}</span>` : ''}
                    ${totalPendiente > 0 ? `<span style="color:#94a3b8;font-weight:700;">⏳ Pendiente: ${totalPendiente}</span>` : ''}
                </div>
            </div>
        `;
        html = resumen + html;
    }

    cont.innerHTML = html;
}

async function actualizarCantidadEntrega(operacionId, estacionId, montajeId, matId, cantidadInput, cantidadTotal) {
    const cantidad = Math.max(0, Math.min(parseInt(cantidadInput) || 0, cantidadTotal));
    const clave = operacionId + '_' + estacionId;
    const claveItem = montajeId + '__' + matId;

    try {
        const data = await cargarFirebase('materiales_verificados', true);
        const doc = data[clave] || { operacionId, estacionId, materiales: {} };
        if (!doc.materiales) doc.materiales = {};

        const [montajes, catalogoMat] = await Promise.all([
            cargarFirebase('montajes'),
            cargarFirebase('materiales_catalogo')
        ]);

        const montaje = montajes[montajeId];
        const itemMatInfo = montaje?.materialesNecesarios?.split('||').find(x => x.trim().startsWith(matId + '='));
        const partes = itemMatInfo ? itemMatInfo.split('=') : [];

        let cat = catalogoMat[matId];
        if (!cat) {
            cat = Object.values(catalogoMat).find(mm =>
                mm.codigo === matId || mm.nombre === matId
            );
        }

        const nombre = cat?.nombre || (partes[2] ? decodeURIComponent(partes[2]) : matId);
        const codigo = cat?.codigo || (partes[3] ? decodeURIComponent(partes[3]) : '');

        let nuevoEstado;
        if (cantidad === 0) nuevoEstado = 'pendiente';
        else if (cantidad >= cantidadTotal) nuevoEstado = 'entregado';
        else nuevoEstado = 'entregado_parcial';

        const anterior = doc.materiales[claveItem] || {};

        doc.materiales[claveItem] = {
            montajeId,
            montajeNombre: montaje?.nombre || '—',
            matId,
            matNombre: nombre,
            matCodigo: codigo,
            cantidadTotal,
            cantidadEntregada: cantidad,
            estado: nuevoEstado,
            entregadoPor: window.APP.operario?.nombre || 'Admin',
            fechaEntrega: cantidad > 0 ? new Date().toISOString() : null,
            cantidadFaltante: cantidad >= cantidadTotal ? 0 : anterior.cantidadFaltante || 0,
            comentario: anterior.comentario || '',
            reportadoPor: anterior.reportadoPor || '',
            fechaReporte: anterior.fechaReporte || null,
            verificadoPor: anterior.verificadoPor || '',
            fechaVerificacion: anterior.fechaVerificacion || null,
            respuestaAdmin: anterior.respuestaAdmin || '',
            fechaRespuestaAdmin: anterior.fechaRespuestaAdmin || null
        };

        doc.ultimaActualizacion = new Date().toISOString();
        await guardarFirebase('materiales_verificados', clave, doc);

        if (nuevoEstado === 'entregado') toast('✅ Entrega completa', '#10b981', 1200);
        else if (nuevoEstado === 'entregado_parcial') toast(`🔵 Entrega parcial (${cantidad}/${cantidadTotal})`, '#3b82f6', 1200);
        else toast('↩️ Marcado como pendiente', '#94a3b8', 1200);

        cargarEntregaMateriales();
    } catch (e) {
        console.error('❌ Error en actualizarCantidadEntrega:', e);
        toast('❌ Error al actualizar', '#ef4444');
    }
}

async function entregarCantidadManual(operacionId, estacionId, montajeId, matId, inputId, cantidadTotal) {
    const input = document.getElementById(inputId);
    if (!input) {
        toast('❌ No se encontró el input', '#ef4444');
        return;
    }

    const cantidad = Math.max(0, Math.min(parseInt(input.value) || 0, cantidadTotal));

    if (cantidad === 0) {
        toast('⚠️ La cantidad debe ser mayor que 0', '#f59e0b');
        return;
    }

    await actualizarCantidadEntrega(operacionId, estacionId, montajeId, matId, cantidad, cantidadTotal);
}

async function resetearEntregaMaterial(operacionId, estacionId, montajeId, matId) {
    const ok = await confirmar(
        '¿Resetear la entrega?\n\nEl material volverá a estado pendiente.',
        { titulo: '↺ Resetear', tipo: 'warning', okTexto: '↺ Sí, resetear' }
    );
    if (!ok) return;

    await actualizarCantidadEntrega(operacionId, estacionId, montajeId, matId, 0, 99999);
}
