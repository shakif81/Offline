function tieneResistencias(montaje) {
    if (!montaje.materialesNecesarios) return false;

    const materialesCache = window.APP.fbCache['materiales_catalogo']?.data || {};

    return montaje.materialesNecesarios.split('||').some(item => {
        const matId = item.trim().split('=')[0];
        if (!matId) return false;

        const cat = materialesCache[matId] ||
            Object.values(materialesCache).find(m =>
                m.codigo === matId || m.nombre === matId
            );

        return cat?.esResistencia === true;
    });
}

async function abrirModalResistencias(montajeId) {
    const operacionId = window.APP.operacionActiva;
    if (!operacionId) {
        toast('❌ No hay operación activa', '#ef4444');
        return;
    }

    const [guardadoCheck, historialCheck] = await Promise.all([
        cargarFirebase('resistencias_montajes', true),
        cargarFirebase('historial_montajes', true)
    ]);

    const claveCheck = operacionId + '_' + montajeId;
    const yaGuardado = !!guardadoCheck[claveCheck];

    if (yaGuardado) {
        const registros = Object.values(historialCheck)
            .filter(h => h.montajeId === montajeId && h.operacionId === operacionId && h.completado)
            .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

        const ultimo = registros[0];
        const rechazado = ultimo?.qcEstado === 'rechazado';

        if (!rechazado) {
            await alertar(
                '🔒 Las resistencias de este montaje ya están guardadas.\n\n' +
                'No se pueden editar a menos que QC rechace el montaje.',
                { titulo: 'Resistencias bloqueadas', tipo: 'warning' }
            );
            return;
        }
    }

    const [montajes, materiales, operaciones] = await Promise.all([
        cargarFirebase('montajes', true),
        cargarFirebase('materiales_catalogo', true),
        cargarFirebase('operaciones')
    ]);

    const m = montajes[montajeId];
    const op = operaciones[operacionId];

    if (!m) {
        toast('❌ Montaje no encontrado', '#ef4444');
        return;
    }

    const numeroOperacion = op?.numero || '—';

    const resistencias = [];
    if (m.materialesNecesarios) {
        m.materialesNecesarios.split('||').forEach(item => {
            const partes = item.trim().split('=');
            const matId = partes[0];
            const cantidad = parseInt(partes[1]) || 1;
            if (!matId) return;

            let cat = materiales[matId];
            if (!cat) {
                cat = Object.values(materiales).find(mm =>
                    mm.codigo === matId || mm.nombre === matId
                );
            }

                        if (cat?.esResistencia === true) {
    const nombreMaterial = cat.nombre || matId;

    const nombresPredef = Array.isArray(cat.nombresResistencias) ? cat.nombresResistencias : [];

    for (let i = 0; i < cantidad; i++) {
        const nombreCorto = nombresPredef[i] || nombreMaterial;

        resistencias.push({
            matId,
            nombreCorto,
            numeroSerie: `${nombreCorto}-${numeroOperacion}`,
            lote: ''
        });
    }
}
        });
    }

    if (!resistencias.length) {
        toast('ℹ️ Este montaje no tiene resistencias', '#94a3b8');
        return;
    }

    const guardado = await cargarFirebase('resistencias_montajes', true);
    const clave = operacionId + '_' + montajeId;
    const datosGuardados = guardado[clave]?.registros || [];

    resistencias.forEach((r, idx) => {
    const yaGuardada = datosGuardados[idx];
    if (yaGuardada && yaGuardada.matId === r.matId) {
        r.lote = yaGuardada.lote || '';
        if (yaGuardada.numeroSerie) r.numeroSerie = yaGuardada.numeroSerie;
    }
});

    mostrarModalResistencias(montajeId, m, resistencias, operacionId, numeroOperacion);
}

function toggleSeleccionResistencia(idx) {
    const ctx = window.APP._resistenciasModal;
    if (!ctx) return;

    const sel = ctx.getSeleccionadas();
    if (sel.has(idx)) sel.delete(idx);
    else sel.add(idx);

    ctx.setSeleccionadas(sel);
    ctx.renderModal();
}

function marcarTodasResistencias() {
    const ctx = window.APP._resistenciasModal;
    if (!ctx) return;

    const sel = new Set();
    ctx.resistencias.forEach((_, idx) => sel.add(idx));
    ctx.setSeleccionadas(sel);
    ctx.renderModal();
}

function desmarcarTodasResistencias() {
    const ctx = window.APP._resistenciasModal;
    if (!ctx) return;

    ctx.setSeleccionadas(new Set());
    ctx.renderModal();
}

function aplicarLoteASeleccionadas() {
    const ctx = window.APP._resistenciasModal;
    if (!ctx) return;

    const inp = document.getElementById('inspLoteGlobal');
    const lote = inp?.value.trim() || '';

    if (!lote) {
        toast('⚠️ Escribe el lote primero', '#f59e0b');
        return;
    }

    const sel = ctx.getSeleccionadas();
    if (sel.size === 0) {
        toast('⚠️ Selecciona al menos una resistencia', '#f59e0b');
        return;
    }

    sel.forEach(idx => {
        if (ctx.resistencias[idx]) {
            ctx.resistencias[idx].lote = lote;
        }
    });

    toast(`✅ Lote "${lote}" aplicado a ${sel.size} resistencia${sel.size > 1 ? 's' : ''}`, '#10b981');

    ctx.setSeleccionadas(new Set());
    ctx.renderModal();

    setTimeout(() => {
        const inp2 = document.getElementById('inspLoteGlobal');
        if (inp2) { inp2.value = ''; inp2.focus(); }
    }, 100);
}

function mostrarModalResistencias(montajeId, montaje, resistencias, operacionId, numeroOperacion) {
    document.getElementById('modalResistencias')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modalResistencias';
    modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

    let seleccionadas = new Set();

    function renderModal() {
        const conLote = resistencias.filter(r => r.lote && r.lote.trim()).length;
        const total = resistencias.length;
        const todasOk = conLote === total;
        const numSeleccionadas = seleccionadas.size;

        modal.innerHTML = `
            <!-- CABECERA (estilo Detalle de Estación) -->
            <div style="background:white;border-bottom:1px solid #e5e7eb;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                    <div style="width:48px;height:48px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">⚡</div>
                    <div style="min-width:0;">
                        <h2 style="margin:0;color:#1e293b;font-size:1.15rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Resistencias</h2>
                        <div style="font-size:0.78rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            <span>${montaje.nombre || 'Sin nombre'}</span>
                            <span style="color:#cbd5e1;">·</span>
                            <span>Op. ${numeroOperacion}</span>
                            <span style="color:#cbd5e1;">·</span>
                            <span style="color:#4338ca;font-weight:700;background:#eef2ff;padding:1px 8px;border-radius:99px;font-size:0.72rem;">${conLote}/${total}</span>
                        </div>
                    </div>
                </div>
                <button onclick="cerrarModal('modalResistencias')" style="background:#f1f5f9;border:none;border-radius:10px;width:44px;height:44px;font-size:1.3rem;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
            </div>

            <!-- BARRA DE ACCIONES -->
            <div style="
                padding: 12px 20px;
                background: #f8fafc;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                flex-direction: column;
                gap: 10px;
                flex-shrink: 0;
            ">
                <!-- FILA 1: selección -->
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <button onclick="marcarTodasResistencias()" style="
                        padding:7px 14px;
                        border:1px solid #c7d2fe;
                        border-radius:8px;
                        background:white;
                        color:#4338ca;
                        font-weight:700;
                        font-size:0.78rem;
                        cursor:pointer;
                        font-family:inherit;
                    ">✓ Marcar todas</button>
                    <button onclick="desmarcarTodasResistencias()" style="
                        padding:7px 14px;
                        border:1px solid #cbd5e1;
                        border-radius:8px;
                        background:white;
                        color:#64748b;
                        font-weight:700;
                        font-size:0.78rem;
                        cursor:pointer;
                        font-family:inherit;
                    ">✕ Ninguna</button>
                    <span style="
                        margin-left:auto;
                        font-size:0.78rem;
                        font-weight:700;
                        color:#4338ca;
                    ">
                        ${numSeleccionadas} seleccionada${numSeleccionadas !== 1 ? 's' : ''}
                    </span>
                </div>

                <!-- FILA 2: campo lote + aplicar -->
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <span style="font-size:0.82rem;font-weight:700;color:#475569;flex-shrink:0;">
                        📝 Lote:
                    </span>
                    <input type="text" id="inspLoteGlobal" placeholder="Ej: L2026-001" maxlength="30"
                        style="flex:1;min-width:150px;padding:10px 14px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.9rem;font-family:inherit;background:white;font-weight:600;"
                        onkeydown="if(event.key==='Enter'){event.preventDefault();aplicarLoteASeleccionadas();}">
                    <button onclick="aplicarLoteASeleccionadas()" style="
                        padding:10px 20px;
                        border:none;
                        border-radius:8px;
                        background:${numSeleccionadas > 0 ? '#6366f1' : '#cbd5e1'};
                        color:white;
                        font-weight:700;
                        font-size:0.85rem;
                        cursor:${numSeleccionadas > 0 ? 'pointer' : 'not-allowed'};
                        font-family:inherit;
                        white-space:nowrap;
                    " ${numSeleccionadas === 0 ? 'disabled' : ''}>
                        ✅ Aplicar (${numSeleccionadas})
                    </button>
                </div>
            </div>

            <!-- TABLA (ocupa el resto de la pantalla) -->
            <div style="flex:1;overflow-y:auto;padding:16px 20px;background:#fafafa;">
                <div style="max-width:900px;margin:0 auto;">

                    <!-- CABECERA TABLA -->
                    <div style="
                        display:grid;
                        grid-template-columns:44px 44px 1.2fr 1fr 1fr;
                        gap:10px;
                        font-size:0.7rem;
                        font-weight:700;
                        color:#64748b;
                        text-transform:uppercase;
                        letter-spacing:0.05em;
                        padding:0 6px 10px 6px;
                        border-bottom:2px solid #e5e7eb;
                        margin-bottom:10px;
                        align-items:center;
                    ">
                        <div style="text-align:center;">Sel.</div>
                        <div>#</div>
                        <div>Nombre</div>
                        <div>Nº Serie</div>
                        <div>Lote</div>
                    </div>

                    <div id="listaResistencias" style="display:flex;flex-direction:column;gap:6px;">
                        ${resistencias.map((r, idx) => {
                            const tieneLote = r.lote && r.lote.trim().length > 0;
                            const estaSeleccionada = seleccionadas.has(idx);

                            return `
                                <div style="
                                    display:grid;
                                    grid-template-columns:44px 44px 1.2fr 1fr 1fr;
                                    gap:10px;
                                    align-items:center;
                                    padding:10px 6px;
                                    border-bottom:1px solid #f1f5f9;
                                    background:${estaSeleccionada ? '#eef2ff' : (tieneLote ? '#f0fdf4' : 'white')};
                                    border-radius:10px;
                                    transition:all 0.15s ease;
                                ">

                                    <!-- CHECKBOX -->
                                    <div style="display:flex;justify-content:center;">
                                        <input type="checkbox"
                                            ${estaSeleccionada ? 'checked' : ''}
                                            onchange="toggleSeleccionResistencia(${idx})"
                                            style="width:22px;height:22px;cursor:pointer;">
                                    </div>

                                    <!-- NÚMERO -->
                                    <span style="
                                        background:${tieneLote ? '#10b981' : '#e5e7eb'};
                                        color:${tieneLote ? 'white' : '#64748b'};
                                        width:30px;height:30px;border-radius:50%;
                                        display:flex;align-items:center;justify-content:center;
                                        font-size:0.75rem;font-weight:800;
                                        flex-shrink:0;
                                    ">${tieneLote ? '✓' : idx + 1}</span>

                                    <!-- NOMBRE (solo lectura, viene del textarea del admin) -->
                                    <div style="
                                        font-family:'SF Mono',Monaco,monospace;
                                        font-size:0.8rem;
                                        font-weight:800;
                                        color:#4338ca;
                                        overflow:hidden;
                                        text-overflow:ellipsis;
                                        white-space:nowrap;
                                        padding:9px 10px;
                                        background:#eef2ff;
                                        border:2px solid #c7d2fe;
                                        border-radius:8px;
                                        text-align:center;
                                    " title="${r.nombreCorto || ''}">${r.nombreCorto || '—'}</div>

                                    <!-- Nº SERIE (editable) -->
                                    <input type="text"
                                        value="${r.numeroSerie || ''}"
                                        placeholder="Nº Serie..."
                                        maxlength="60"
                                        oninput="cambiarSerieResistencia(${idx}, this.value)"
                                        style="
                                            min-width:0;
                                            width:100%;
                                            padding:9px 10px;
                                            border-radius:8px;
                                            border:2px solid #cbd5e1;
                                            background:white;
                                            font-family:'SF Mono',Monaco,monospace;
                                            font-size:0.82rem;
                                            font-weight:700;
                                            color:#1e293b;
                                        ">

                                    <!-- LOTE -->
                                    <input type="text"
                                        value="${r.lote || ''}"
                                        placeholder="Lote..."
                                        maxlength="30"
                                        oninput="cambiarLoteResistencia(${idx}, this.value)"
                                        style="
                                            width:100%;
                                            padding:9px 10px;
                                            border-radius:8px;
                                            border:2px solid ${tieneLote ? '#86efac' : '#cbd5e1'};
                                            background:${tieneLote ? '#ecfdf5' : 'white'};
                                            font-size:0.85rem;
                                            font-family:inherit;
                                            font-weight:700;
                                            color:#1e293b;
                                        ">
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div style="height:2rem;"></div>
            </div>

            <!-- PIE -->
            <div style="
                padding:14px 20px;
                border-top:1px solid #e5e7eb;
                background:white;
                display:flex;
                gap:10px;
                align-items:center;
                flex-wrap:wrap;
                flex-shrink:0;
                box-shadow:0 -1px 3px rgba(0,0,0,0.05);
            ">
                <div style="flex:1;font-size:0.85rem;font-weight:700;color:${todasOk ? '#047857' : '#64748b'};">
                    ${todasOk
                        ? '✅ Todas rellenadas'
                        : `⏳ ${conLote}/${total} rellenadas`}
                </div>
                <button onclick="cerrarModal('modalResistencias')" style="
                    padding:12px 20px;
                    border:1px solid #e5e7eb;
                    border-radius:10px;
                    background:white;
                    color:#64748b;
                    font-weight:700;
                    cursor:pointer;
                    font-size:0.85rem;
                    font-family:inherit;
                ">Cancelar</button>
                <button onclick="guardarResistencias('${montajeId}')" style="
                    padding:12px 24px;
                    border:none;
                    border-radius:10px;
                    background:#10b981;
                    color:white;
                    font-weight:700;
                    cursor:pointer;
                    font-size:0.9rem;
                    font-family:inherit;
                    display:flex;
                    align-items:center;
                    gap:6px;
                ">💾 Guardar</button>
            </div>
        `;
    }

    window.APP._resistenciasModal = {
        montajeId,
        operacionId,
        numeroOperacion,
        montajeNombre: montaje.nombre || '—',
        resistencias,
        renderModal,
        getSeleccionadas: () => seleccionadas,
        setSeleccionadas: (s) => { seleccionadas = s; }
    };

    renderModal();
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

async function guardarResistencias(montajeId) {
    const ctx = window.APP._resistenciasModal;
    if (!ctx) return;

    const { operacionId, numeroOperacion, resistencias } = ctx;

    const sinLote = resistencias.filter(r => !r.lote.trim());

    if (sinLote.length > 0) {
        const ok = await confirmar(
            `Hay ${sinLote.length} resistencia(s) sin lote.\n\n¿Guardar igual?`,
            { titulo: '⚠️ Faltan lotes', tipo: 'warning', okTexto: '💾 Guardar igual' }
        );
        if (!ok) return;
    }

const confirmarGuardado = await confirmar(
    '⚠️ Una vez guardadas las resistencias, NO se podrán editar.\n\n' +
    'Solo se desbloquearán si QC rechaza el montaje.\n\n' +
    '¿Confirmas el guardado?',
    { titulo: '💾 Guardar resistencias', tipo: 'warning', okTexto: '💾 Sí, guardar' }
);
if (!confirmarGuardado) return;

const clave = operacionId + '_' + montajeId;

const data = {
    operacionId,
    numeroOperacion,
    montajeId,
    montajeNombre: ctx.montajeNombre || '—',
    registros: resistencias.map(r => ({
            matId: r.matId,
            nombreCorto: r.nombreCorto,
            numeroSerie: r.numeroSerie,
            lote: r.lote.trim(),
            registradoPor: window.APP.operario?.nombre || 'Operario',
            fecha: new Date().toISOString()
        })),
        ultimaActualizacion: new Date().toISOString()
    };

    mostrarLoading('Guardando resistencias...');
    const ok = await guardarFirebase('resistencias_montajes', clave, data);
    ocultarLoading();

    if (ok) {
        toast('✅ Resistencias guardadas', '#10b981');
        cerrarModal('modalResistencias');
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

function actualizarBotonAplicarResistencias() {
    const inp = document.getElementById('inspLoteGlobal');
    const btn = document.getElementById('btnAplicarLote');
    if (!inp || !btn) return;

    const ctx = window.APP._resistenciasModal;
    if (!ctx) return;

    const lote = inp.value.trim();
    const numSeleccionadas = ctx.getSeleccionadas().size;

    if (numSeleccionadas === 0) {
        btn.textContent = `✅ Aplicar (0)`;
        btn.style.background = '#cbd5e1';
        btn.style.cursor = 'not-allowed';
        btn.disabled = true;
    } else if (!lote) {
        btn.textContent = `✅ Aplicar (${numSeleccionadas})`;
        btn.style.background = '#f59e0b';
        btn.style.cursor = 'pointer';
        btn.disabled = false;
    } else {
        const loteMostrar = lote.length > 15 ? lote.substring(0, 15) + '…' : lote;
        btn.textContent = `✅ Aplicar "${loteMostrar}" (${numSeleccionadas})`;
        btn.style.background = '#f59e0b';
        btn.style.cursor = 'pointer';
        btn.disabled = false;
    }
}

function cambiarLoteResistencia(idx, valor) {
    const ctx = window.APP._resistenciasModal;
    if (!ctx) return;
    if (!ctx.resistencias[idx]) return;

    ctx.resistencias[idx].lote = valor;

    const tieneLote = valor.trim().length > 0;

    const filas = document.querySelectorAll('#listaResistencias > div');
    const fila = filas[idx];
    if (fila) {
        const inputs = fila.querySelectorAll('input[type="text"]');
        const inputLote = inputs[1];
        if (inputLote) {
            inputLote.style.borderColor = tieneLote ? '#86efac' : '#cbd5e1';
            inputLote.style.background = tieneLote ? '#ecfdf5' : 'white';
        }

        fila.style.background = tieneLote ? '#f0fdf4' : 'transparent';

        const badge = fila.querySelector('span');
        if (badge) {
            badge.style.background = tieneLote ? '#10b981' : '#e5e7eb';
            badge.style.color = tieneLote ? 'white' : '#64748b';
            badge.textContent = tieneLote ? '✓' : (idx + 1);
        }
    }

    const conLote = ctx.resistencias.filter(r => r.lote && r.lote.trim()).length;
    const total = ctx.resistencias.length;
    const contenedorPie = document.querySelector('#modalResistencias > div > div:last-child > div:first-child');
    if (contenedorPie) {
        contenedorPie.textContent = conLote === total
            ? '✅ Todas rellenadas'
            : `⏳ ${conLote}/${total} rellenadas`;
        contenedorPie.style.color = conLote === total ? '#047857' : '#c2410c';
    }
}

function cambiarSerieResistencia(idx, valor) {
    const ctx = window.APP._resistenciasModal;
    if (!ctx) return;
    if (!ctx.resistencias[idx]) return;

    ctx.resistencias[idx].numeroSerie = valor;
}
