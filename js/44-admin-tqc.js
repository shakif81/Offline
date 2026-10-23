window.APP.tqcActual = {
    clave: null,
    data: null
};

async function comprobarYCrearQC(estacionId, operacionId) {
    if (!estacionId || !operacionId) return;

    try {
        const [montajes, historial, estaciones, operaciones] = await Promise.all([
            cargarFirebase('montajes', true),
            cargarFirebase('historial_montajes', true),
            cargarFirebase('estaciones'),
            cargarFirebase('operaciones')
        ]);

        const est = estaciones[estacionId];
        const op = operaciones[operacionId];
        if (!est || !op) return;

        const montajesEst = Object.entries(montajes)
            .filter(([mid, m]) => m.puntoId === estacionId && m.modelo === est.modelo)
            .map(([mid]) => mid);

        if (montajesEst.length === 0) return;

        const completados = new Set();
        for (const h of Object.values(historial)) {
            if (h.operacionId === operacionId && 
                h.estacionId === estacionId && 
                h.completado) {
                completados.add(h.montajeId);
            }
        }

        const todosCompletados = montajesEst.every(mid => completados.has(mid));

        if (!todosCompletados) {
            console.log('⏳ Estación no completa todavía:', 
                completados.size + '/' + montajesEst.length);
            return;
        }

        const claveQC = operacionId + '_' + estacionId;
        const qcExistente = await cargarFirebase('estaciones_qc', true);

        if (qcExistente[claveQC]) {
            console.log('ℹ️ Ya existe QC para esta estación');
            return;
        }

        const montajesQC = [];
        for (const mid of montajesEst) {
            const h = Object.values(historial).find(x =>
                x.montajeId === mid && 
                x.operacionId === operacionId && 
                x.completado
            );

            const m = montajes[mid];
            montajesQC.push({
                montajeId: mid,
                montajeNombre: m?.nombre || 'Sin nombre',
                orden: m?.orden || '—',
                operario: h?.operario || '—',
                historialId: h ? Object.entries(historial).find(([hid, hv]) => hv === h)?.[0] : '',
                estado: 'pendiente',
                motivoRechazo: '',
                fotosRechazo: [],
                revisadoPor: '',
                fechaRevision: null
            });
        }

        const dataQC = {
            operacionId,
            numeroOperacion: op.numero || '—',
            estacionId,
            estacionNombre: est.nombre || 'Sin nombre',
            modelo: est.modelo || 'MS3',
            estado: 'pendiente',
            fechaCreacion: new Date().toISOString(),
            fechaUltimaRevision: null,
            revisor: '',
            totalMontajes: montajesEst.length,
            montajesAprobados: 0,
            montajesRechazados: 0,
            montajesQC
        };

        await guardarFirebase('estaciones_qc', claveQC, dataQC);

        console.log('🔍 QC creado para estación:', est.nombre);

        toast('🔍 Estación completa → pendiente de QC', '#8b5cf6', 4000);
    } catch (e) {
        console.error('❌ Error comprobando estación:', e);
    }
}

async function cargarTQC() {
    const cont = document.getElementById('tqcListaEstaciones');
    const contador = document.getElementById('tqcContador');
    if (!cont) return;

    cont.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const filtroEstado = document.getElementById('tqcFiltroEstado')?.value || 'pendiente';
    const filtroOperacion = document.getElementById('tqcFiltroOperacion')?.value || 'todas';

    const [qcs, operaciones] = await Promise.all([
        cargarFirebase('estaciones_qc', true),
        cargarFirebase('operaciones')
    ]);

    const selOp = document.getElementById('tqcFiltroOperacion');
    if (selOp && selOp.options.length <= 1) {
        const opsUnicas = [...new Set(
            Object.values(qcs).map(q => q.operacionId).filter(Boolean)
        )];

        opsUnicas.forEach(opId => {
            const op = operaciones[opId];
            if (!op) return;
            const opt = document.createElement('option');
            opt.value = opId;
            opt.textContent = `${op.modelo === 'MS3' ? '🔷' : '🔶'} Op. ${op.numero}`;
            selOp.appendChild(opt);
        });
    }

    let arr = Object.entries(qcs);

    if (filtroEstado !== 'todas') {
        arr = arr.filter(([id, q]) => q.estado === filtroEstado);
    }

    if (filtroOperacion !== 'todas') {
        arr = arr.filter(([id, q]) => q.operacionId === filtroOperacion);
    }

    arr.sort((a, b) => 
        new Date(a[1].fechaCreacion || 0) - new Date(b[1].fechaCreacion || 0)
    );

    actualizarBadgeTQCSidebar(arr.length);

    if (contador) {
        contador.textContent = `${arr.length} estación${arr.length !== 1 ? 'es' : ''}`;
    }

    if (!arr.length) {
        cont.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2.5rem;margin-bottom:12px;">✅</div>
                <div style="font-weight:600;color:#1e293b;margin-bottom:4px;">Nada pendiente</div>
                <div style="font-size:0.85rem;color:#94a3b8;">
                    ${filtroEstado === 'pendiente' 
                        ? 'No hay estaciones esperando revisión' 
                        : 'Prueba otros filtros'}
                </div>
            </div>
        `;
        return;
    }

    cont.innerHTML = arr.map(([clave, qc]) => {
        const fecha = new Date(qc.fechaCreacion);
        const ahora = new Date();
        const diffMin = Math.floor((ahora - fecha) / 60000);

        let fechaTexto = '';
        if (diffMin < 60) fechaTexto = `hace ${diffMin} min`;
        else if (diffMin < 1440) fechaTexto = `hace ${Math.floor(diffMin / 60)}h`;
        else fechaTexto = `hace ${Math.floor(diffMin / 1440)}d`;

        let colorBorde = '#f59e0b';
        let colorFondo = '#fffbeb';
        let estadoTexto = '⏳ Pendiente';
        let estadoColor = '#c2410c';

        if (qc.estado === 'aprobado') {
            colorBorde = '#10b981';
            colorFondo = '#ecfdf5';
            estadoTexto = '✅ Aprobada';
            estadoColor = '#047857';
        } else if (qc.estado === 'parcial' || qc.estado === 'rechazado') {
            colorBorde = '#ef4444';
            colorFondo = '#fef2f2';
            estadoTexto = '🔄 Con rechazos';
            estadoColor = '#b91c1c';
        }

        const operarios = [...new Set(
            (qc.montajesQC || []).map(m => m.operario).filter(Boolean)
        )];

        return `
            <div onclick="abrirRevisionQC('${clave}')"
                style="
                    background:white;
                    border:1px solid ${colorBorde}44;
                    border-left:4px solid ${colorBorde};
                    border-radius:12px;
                    padding:14px 16px;
                    cursor:pointer;
                    transition:all 0.15s ease;
                "
                onmouseover="this.style.transform='translateX(3px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
                onmouseout="this.style.transform='translateX(0)';this.style.boxShadow=''">

                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                        <span style="font-size:1.4rem;">🏭</span>
                        <div style="min-width:0;">
                            <div style="font-weight:700;font-size:0.95rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                ${qc.estacionNombre || 'Sin nombre'}
                            </div>
                            <div style="font-size:0.72rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <span style="background:#eef2ff;color:#4338ca;padding:1px 8px;border-radius:99px;font-weight:700;font-size:0.68rem;">
                                    Op. ${qc.numeroOperacion || '—'}
                                </span>
                                <span style="color:#cbd5e1;">·</span>
                                <span>${qc.modelo || 'MS3'}</span>
                                <span style="color:#cbd5e1;">·</span>
                                <span>📅 ${fechaTexto}</span>
                            </div>
                        </div>
                    </div>
                    <span style="
                        background:${colorFondo};
                        color:${estadoColor};
                        padding:4px 12px;
                        border-radius:99px;
                        font-size:0.72rem;
                        font-weight:700;
                        white-space:nowrap;
                        flex-shrink:0;
                    ">${estadoTexto}</span>
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:0.75rem;padding-top:8px;border-top:1px solid #f1f5f9;">
                    <span style="color:#475569;font-weight:600;">
                        📦 ${qc.totalMontajes || 0} montaje${qc.totalMontajes !== 1 ? 's' : ''}
                    </span>
                    ${qc.montajesAprobados > 0 ? `
                        <span style="color:#047857;font-weight:700;">
                            ✅ ${qc.montajesAprobados} aprobado${qc.montajesAprobados !== 1 ? 's' : ''}
                        </span>
                    ` : ''}
                    ${qc.montajesRechazados > 0 ? `
                        <span style="color:#b91c1c;font-weight:700;">
                            ❌ ${qc.montajesRechazados} rechazado${qc.montajesRechazados !== 1 ? 's' : ''}
                        </span>
                    ` : ''}
                    ${operarios.length > 0 ? `
                        <span style="color:#64748b;font-weight:600;margin-left:auto;">
                            👤 ${operarios.join(', ')}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function actualizarBadgeTQCSidebar(n) {
    const badge = document.getElementById('badgeTQCSidebar');
    if (!badge) return;

    if (n > 0) {
        badge.textContent = n > 99 ? '99+' : n;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

async function abrirRevisionQC(clave) {
    const qcs = await cargarFirebase('estaciones_qc', true);
    const qc = qcs[clave];
    if (!qc) {
        toast('❌ QC no encontrado', '#ef4444');
        return;
    }

    window.APP.tqcActual = {
        clave,
        data: JSON.parse(JSON.stringify(qc))
    };

    renderModalRevisionQC();
}

function renderModalRevisionQC() {
    document.getElementById('modalRevisionQC')?.remove();

    const { data: qc } = window.APP.tqcActual;
    const montajes = qc.montajesQC || [];

    const pendientes = montajes.filter(m => m.estado === 'pendiente').length;
    const aprobados = montajes.filter(m => m.estado === 'aprobado').length;
    const rechazados = montajes.filter(m => m.estado === 'rechazado').length;
    const todosRevisados = pendientes === 0;

    const modal = document.createElement('div');
    modal.id = 'modalRevisionQC';
    modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

    modal.innerHTML = `
        <!-- CABECERA -->
        <div style="background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                <span style="font-size:1.6rem;">🔍</span>
                <div style="min-width:0;">
                    <div style="font-weight:800;font-size:1rem;">Revisión QC</div>
                    <div style="font-size:0.75rem;opacity:0.9;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${qc.estacionNombre} · Op. ${qc.numeroOperacion} · ${qc.modelo}
                    </div>
                </div>
            </div>
            <button onclick="cerrarModal('modalRevisionQC')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:38px;height:38px;border-radius:10px;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
        </div>

        <!-- RESUMEN -->
        <div style="padding:12px 20px;background:#f8fafc;border-bottom:1px solid #e5e7eb;display:flex;gap:12px;flex-wrap:wrap;font-size:0.78rem;font-weight:700;flex-shrink:0;">
            <span style="color:#1e293b;">📦 ${montajes.length} montaje${montajes.length !== 1 ? 's' : ''}</span>
            ${pendientes > 0 ? `<span style="color:#c2410c;">⏳ ${pendientes} pendiente${pendientes !== 1 ? 's' : ''}</span>` : ''}
            ${aprobados > 0 ? `<span style="color:#047857;">✅ ${aprobados} aprobado${aprobados !== 1 ? 's' : ''}</span>` : ''}
            ${rechazados > 0 ? `<span style="color:#b91c1c;">❌ ${rechazados} rechazado${rechazados !== 1 ? 's' : ''}</span>` : ''}
        </div>

        <!-- LISTA DE MONTAJES -->
        <div style="flex:1;overflow-y:auto;padding:16px 20px;background:#fafafa;">
            <div style="max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:12px;">
                ${montajes.map((m, idx) => renderTarjetaMontajeQC(m, idx)).join('')}
            </div>
        </div>

        <!-- PIE CON ACCIONES -->
        <div style="padding:14px 20px;border-top:1px solid #e5e7eb;background:white;display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;justify-content:flex-end;">
            <button onclick="cerrarModal('modalRevisionQC')" style="padding:12px 20px;border:1px solid #e5e7eb;border-radius:10px;background:white;color:#64748b;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">
                Cancelar
            </button>
            ${todosRevisados ? `
                <button onclick="guardarRevisionQC()" style="padding:12px 24px;border:none;border-radius:10px;background:#10b981;color:white;font-weight:700;cursor:pointer;font-size:0.9rem;font-family:inherit;display:flex;align-items:center;gap:6px;">
                    💾 Guardar revisión
                </button>
            ` : `
                <div style="padding:12px 20px;color:#c2410c;font-weight:700;font-size:0.85rem;display:flex;align-items:center;">
                    ⏳ Faltan ${pendientes} por revisar
                </div>
            `}
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function renderTarjetaMontajeQC(m, idx) {
    const estado = m.estado || 'pendiente';

    let colorBorde = '#94a3b8';
    let colorFondo = '#f8fafc';
    let icono = '⏳';
    let texto = 'Pendiente';

    if (estado === 'aprobado') {
        colorBorde = '#10b981';
        colorFondo = '#ecfdf5';
        icono = '✅';
        texto = 'Aprobado';
    } else if (estado === 'rechazado') {
        colorBorde = '#ef4444';
        colorFondo = '#fef2f2';
        icono = '❌';
        texto = 'Rechazado';
    }

    return `
        <div style="background:${colorFondo};border:1px solid ${colorBorde}44;border-left:4px solid ${colorBorde};border-radius:12px;padding:14px 16px;">
            
            <!-- CABECERA -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <span style="font-size:1.3rem;">${icono}</span>
                    <div style="min-width:0;">
                        <div style="font-weight:700;font-size:0.92rem;color:#1e293b;">
                            ${m.orden ? `${m.orden}. ` : ''}${m.montajeNombre}
                        </div>
                        <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">
                            👤 ${m.operario || '—'}
                            ${m.qcReenvios > 0 ? ` · 🔄 Reenviado ${m.qcReenvios}×` : ''}
                        </div>
                    </div>
                </div>
                <span style="
                    background:${colorBorde}18;
                    color:${colorBorde};
                    padding:4px 12px;
                    border-radius:99px;
                    font-size:0.72rem;
                    font-weight:700;
                    white-space:nowrap;
                    flex-shrink:0;
                ">${texto}</span>
            </div>

            <!-- MOTIVO DEL RECHAZO (si aplica) -->
            ${estado === 'rechazado' && m.motivoRechazo ? `
                <div style="background:white;border-radius:8px;padding:10px 12px;border-left:3px solid #ef4444;margin-bottom:12px;">
                    <div style="font-size:0.72rem;color:#b91c1c;font-weight:700;margin-bottom:4px;">❌ Motivo del rechazo:</div>
                    <div style="font-size:0.82rem;color:#1e293b;line-height:1.4;">${m.motivoRechazo}</div>
                </div>
            ` : ''}

            <!-- BOTONES -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${estado === 'pendiente' || estado === 'rechazado' ? `
                    <button onclick="marcarMontajeQC(${idx}, 'aprobado')" style="
                        flex:1;
                        min-width:120px;
                        padding:10px 14px;
                        border:none;
                        border-radius:8px;
                        background:${estado === 'aprobado' ? '#10b981' : '#f1f5f9'};
                        color:${estado === 'aprobado' ? 'white' : '#047857'};
                        border:1px solid #10b981;
                        font-weight:700;
                        font-size:0.82rem;
                        cursor:pointer;
                        font-family:inherit;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        gap:6px;
                    ">✅ Aprobar</button>
                    
                    <button onclick="rechazarMontajeQC(${idx})" style="
                        flex:1;
                        min-width:120px;
                        padding:10px 14px;
                        border:1px solid #ef4444;
                        border-radius:8px;
                        background:white;
                        color:#ef4444;
                        font-weight:700;
                        font-size:0.82rem;
                        cursor:pointer;
                        font-family:inherit;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        gap:6px;
                    ">❌ Rechazar</button>
                ` : `
                    <div style="font-size:0.78rem;color:#64748b;font-weight:600;padding:8px 0;">
                        Revisado por ${m.revisadoPor || '—'}
                    </div>
                    <button onclick="marcarMontajeQC(${idx}, 'pendiente')" style="
                        padding:10px 14px;
                        border:1px solid #cbd5e1;
                        border-radius:8px;
                        background:white;
                        color:#64748b;
                        font-weight:600;
                        font-size:0.78rem;
                        cursor:pointer;
                        font-family:inherit;
                    ">↺ Cambiar decisión</button>
                `}
            </div>
        </div>
    `;
}

function marcarMontajeQC(idx, nuevoEstado) {
    const { data: qc } = window.APP.tqcActual;
    if (!qc.montajesQC[idx]) return;

    qc.montajesQC[idx].estado = nuevoEstado;

    if (nuevoEstado === 'aprobado') {
        qc.montajesQC[idx].motivoRechazo = '';
        qc.montajesQC[idx].fotosRechazo = [];
        qc.montajesQC[idx].revisadoPor = window.APP.operario?.nombre || 'Admin';
        qc.montajesQC[idx].fechaRevision = new Date().toISOString();
    } else if (nuevoEstado === 'pendiente') {
        qc.montajesQC[idx].motivoRechazo = '';
        qc.montajesQC[idx].fotosRechazo = [];
        qc.montajesQC[idx].revisadoPor = '';
        qc.montajesQC[idx].fechaRevision = null;
    }

    renderModalRevisionQC();
}

function rechazarMontajeQC(idx) {
    const { data: qc } = window.APP.tqcActual;
    const montaje = qc.montajesQC[idx];
    if (!montaje) return;

    document.getElementById('modalRechazoMontaje')?.remove();

    const fotosActuales = [...(montaje.fotosRechazo || [])];

    const modal = document.createElement('div');
    modal.id = 'modalRechazoMontaje';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;';

    modal.innerHTML = `
        <div style="background:white;border-radius:18px;padding:24px;max-width:520px;width:100%;max-height:90vh;display:flex;flex-direction:column;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <span style="font-size:2rem;">❌</span>
                <div style="flex:1;min-width:0;">
                    <h3 style="margin:0;color:#b91c1c;font-size:1.05rem;font-weight:700;">Rechazar montaje</h3>
                    <div style="font-size:0.78rem;color:#64748b;margin-top:2px;">
                        ${montaje.montajeNombre}
                    </div>
                </div>
            </div>

            <div style="flex:1;overflow-y:auto;">
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="display:block;font-size:0.8rem;font-weight:700;color:#475569;margin-bottom:6px;">
                        📝 Motivo del rechazo *
                    </label>
                    <textarea id="motivoRechazoTexto" placeholder="Explica qué hay que corregir..." rows="4" maxlength="500"
                        style="width:100%;padding:10px 12px;border:2px solid #cbd5e1;border-radius:10px;font-size:0.85rem;font-family:inherit;resize:vertical;">
${montaje.motivoRechazo || ''}</textarea>
                    <small style="color:#64748b;font-size:0.72rem;">Este mensaje lo verá el operario.</small>
                </div>

                <!-- FOTOS -->
                <div style="margin-bottom:14px;">
                    <label style="display:block;font-size:0.8rem;font-weight:700;color:#475569;margin-bottom:6px;">
                        📷 Fotos de evidencia (opcional)
                    </label>
                    
                    <input type="file" id="fotoRechazoInput" accept="image/*" style="display:none;" onchange="añadirFotoRechazo(this, ${idx})">
                    <button onclick="document.getElementById('fotoRechazoInput').click()" style="
                        width:100%;
                        padding:10px;
                        border:2px dashed #cbd5e1;
                        border-radius:10px;
                        background:#f8fafc;
                        color:#64748b;
                        font-weight:600;
                        font-size:0.82rem;
                        cursor:pointer;
                        font-family:inherit;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        gap:6px;
                    ">📷 Añadir foto</button>

                    <div id="fotosRechazoLista" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                        ${fotosActuales.map((url, fi) => `
                            <div style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
                                <img src="${url}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="verFotoGrande('${url}')">
                                <button onclick="event.stopPropagation(); quitarFotoRechazo(${idx}, ${fi})" style="
                                    position:absolute;top:2px;right:2px;
                                    background:rgba(239,68,68,0.9);color:white;border:none;
                                    width:22px;height:22px;border-radius:50%;
                                    font-size:0.7rem;cursor:pointer;
                                    display:flex;align-items:center;justify-content:center;
                                    font-weight:700;
                                ">✕</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div style="display:flex;gap:8px;margin-top:8px;">
                <button onclick="document.getElementById('modalRechazoMontaje').remove()" style="
                    flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:10px;
                    background:white;color:#64748b;font-weight:700;cursor:pointer;
                    font-size:0.85rem;font-family:inherit;
                ">Cancelar</button>
                <button onclick="confirmarRechazoMontaje(${idx})" style="
                    flex:1;padding:12px;border:none;border-radius:10px;
                    background:#ef4444;color:white;font-weight:700;cursor:pointer;
                    font-size:0.85rem;font-family:inherit;
                ">❌ Confirmar rechazo</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('motivoRechazoTexto')?.focus(), 100);
}

async function añadirFotoRechazo(input, idx) {
    const file = input?.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        toast('⚠️ La foto es demasiado grande (máx 5MB)', '#f59e0b');
        input.value = '';
        return;
    }

    mostrarLoading('Subiendo foto...');

    try {
        const url = await subirACloudinary(file);
        if (!url) throw new Error('Error subiendo');

        const { data: qc } = window.APP.tqcActual;
        if (!qc.montajesQC[idx].fotosRechazo) {
            qc.montajesQC[idx].fotosRechazo = [];
        }
        qc.montajesQC[idx].fotosRechazo.push(url);

        ocultarLoading();
        toast('📷 Foto añadida', '#10b981');

        actualizarFotosRechazoModal(idx);
    } catch (e) {
        ocultarLoading();
        console.error('❌ Error:', e);
        toast('❌ Error al subir la foto', '#ef4444');
    } finally {
        input.value = '';
    }
}

function quitarFotoRechazo(idx, fotoIndex) {
    const { data: qc } = window.APP.tqcActual;
    if (!qc.montajesQC[idx].fotosRechazo) return;

    qc.montajesQC[idx].fotosRechazo.splice(fotoIndex, 1);
    actualizarFotosRechazoModal(idx);
}

function actualizarFotosRechazoModal(idx) {
    const { data: qc } = window.APP.tqcActual;
    const lista = document.getElementById('fotosRechazoLista');
    if (!lista) return;

    const fotos = qc.montajesQC[idx].fotosRechazo || [];

    lista.innerHTML = fotos.map((url, fi) => `
        <div style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <img src="${url}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="verFotoGrande('${url}')">
            <button onclick="event.stopPropagation(); quitarFotoRechazo(${idx}, ${fi})" style="
                position:absolute;top:2px;right:2px;
                background:rgba(239,68,68,0.9);color:white;border:none;
                width:22px;height:22px;border-radius:50%;
                font-size:0.7rem;cursor:pointer;
                display:flex;align-items:center;justify-content:center;
                font-weight:700;
            ">✕</button>
        </div>
    `).join('');
}

function confirmarRechazoMontaje(idx) {
    const texto = document.getElementById('motivoRechazoTexto')?.value.trim() || '';

    if (!texto) {
        toast('⚠️ Escribe el motivo del rechazo', '#f59e0b');
        return;
    }

    const { data: qc } = window.APP.tqcActual;
    if (!qc.montajesQC[idx]) return;

    qc.montajesQC[idx].estado = 'rechazado';
    qc.montajesQC[idx].motivoRechazo = texto;
    qc.montajesQC[idx].revisadoPor = window.APP.operario?.nombre || 'Admin';
    qc.montajesQC[idx].fechaRevision = new Date().toISOString();

    document.getElementById('modalRechazoMontaje')?.remove();
    renderModalRevisionQC();

    toast('❌ Montaje rechazado', '#ef4444', 2000);
}

async function guardarRevisionQC() {
    const { clave, data: qc } = window.APP.tqcActual;
    if (!clave || !qc) return;

    const montajes = qc.montajesQC || [];
    const aprobados = montajes.filter(m => m.estado === 'aprobado').length;
    const rechazados = montajes.filter(m => m.estado === 'rechazado').length;

    let estadoGlobal = 'pendiente';
    if (rechazados === 0 && aprobados === montajes.length) {
        estadoGlobal = 'aprobado';
    } else if (rechazados > 0) {
        estadoGlobal = 'parcial';
    }

    let mensaje = '';
    let tipo = 'success';

    if (estadoGlobal === 'aprobado') {
        mensaje = `✅ ¿Aprobar TODA la estación?\n\nLos ${montajes.length} montajes quedarán aprobados y bloqueados.`;
    } else if (estadoGlobal === 'parcial') {
        mensaje = `🔄 ¿Guardar con ${rechazados} rechazo${rechazados > 1 ? 's' : ''}?\n\nLos montajes rechazados volverán al operario para corregir.\nLos aprobados quedarán bloqueados.`;
        tipo = 'warning';
    } else {
        mensaje = '⚠️ No has revisado todos los montajes.';
        toast('⚠️ Faltan montajes por revisar', '#f59e0b');
        return;
    }

    const ok = await confirmar(mensaje, {
        titulo: '💾 Guardar revisión',
        tipo,
        okTexto: '💾 Sí, guardar'
    });
    if (!ok) return;

    mostrarLoading('Guardando revisión...');

    try {
        qc.estado = estadoGlobal;
        qc.montajesAprobados = aprobados;
        qc.montajesRechazados = rechazados;
        qc.revisor = window.APP.operario?.nombre || 'Admin';
        qc.fechaUltimaRevision = new Date().toISOString();

        await guardarFirebase('estaciones_qc', clave, qc);

        const historial = await cargarFirebase('historial_montajes', true);

        for (const m of montajes) {
            const histId = m.historialId;
            if (!histId) continue;
            const h = historial[histId];
            if (!h) continue;

const updates = {
    qcEstado: m.estado,
    qcComentario: m.motivoRechazo || '',
    qcRevisor: m.revisadoPor || '',
    qcFecha: m.fechaRevision || null,
    qcFotos: m.fotosRechazo || [],
    qcReenvios: m.estado === 'rechazado' ? (h.qcReenvios || 0) + 1 : (h.qcReenvios || 0),
    notificacionVista: false
};

if (m.estado === 'rechazado') {
    updates.fechaRechazo = new Date().toISOString();
}

            await guardarFirebase('historial_montajes', histId, updates);
        }

        ocultarLoading();
toast(
    estadoGlobal === 'aprobado' 
        ? '✅ Estación aprobada' 
        : `🔄 Guardado con ${rechazados} rechazo${rechazados > 1 ? 's' : ''}`,
    estadoGlobal === 'aprobado' ? '#10b981' : '#f59e0b'
);

for (const m of montajes) {
    if (m.estado === 'rechazado') {
        await guardarFirebase('historial_montajes', m.historialId, {
            notificacionVista: false
        });
    }
}

cerrarModal('modalRevisionQC');
cargarTQC();
    } catch (e) {
        ocultarLoading();
        console.error('❌ Error guardando revisión:', e);
        toast('❌ Error al guardar', '#ef4444');
    }
}
