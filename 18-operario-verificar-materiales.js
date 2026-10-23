window.APP.verifMatActual = {
    operacionId: null,
    camara: null,
    ultimoCodigo: '',
    materialesPendientes: [],
    inputListener: null
};

window.APP.verifMatActual = {
    operacionId: null,
    camara: null,
    materialesPendientes: [],
    materialSeleccionado: null
};

async function cargarVerificarMateriales() {
    const cont = document.getElementById('verifMatContainer');
    if (!cont) return;

    cont.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    await detenerCamaraVerifMat();

    const opIdActual = window.APP.operacionActiva;
    window.APP.verifMatActual.operacionId = opIdActual || null;

    if (!opIdActual) {
        cont.innerHTML = _vacioVerifMat(
            '📋',
            'No hay operación activa',
            'Entra en una operación desde Operaciones para verificar sus materiales.'
        );
        return;
    }

    const [operaciones, estaciones, montajes, catalogoMat, verificaciones] = await Promise.all([
        cargarFirebase('operaciones', true),
        cargarFirebase('estaciones'),
        cargarFirebase('montajes'),
        cargarFirebase('materiales_catalogo', true),
        cargarFirebase('materiales_verificados', true)
    ]);

    if (opIdActual !== window.APP.operacionActiva) return;

    const opActual = operaciones[opIdActual];
    if (!opActual) {
        cont.innerHTML = _vacioVerifMat(
            '⚠️',
            'Operación no encontrada',
            'La operación activa ya no existe. Elige otra desde Operaciones.'
        );
        return;
    }

    const pendientes = _calcularMaterialesPendientes(
        opIdActual, opActual.modelo, montajes, estaciones, catalogoMat, verificaciones
    );
    window.APP.verifMatActual.materialesPendientes = pendientes;

    const totalPend = pendientes.length;
    const totalVerif = _contarVerificadosOp(opIdActual, montajes, estaciones, verificaciones);

    cont.innerHTML = `
        <div style="background:white;border-radius:14px;padding:14px 16px;border:1px solid #e5e7eb;margin-bottom:1rem;display:flex;align-items:center;gap:12px;">
            <span style="font-size:1.6rem;">${opActual.modelo === 'MS3' ? '🔷' : '🔶'}</span>
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.72rem;font-weight:700;color:#64748b;">Operación activa</div>
                <div style="font-size:1rem;font-weight:800;color:#1e293b;">Op. ${opActual.numero} (${opActual.modelo || 'MS3'})</div>
            </div>
        </div>

        <!-- RESUMEN -->
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:1rem;">
            <div style="background:linear-gradient(135deg,#fef2f2,white);border:1px solid #fecaca;border-radius:14px;padding:1rem;text-align:center;">
                <div style="font-size:1.5rem;margin-bottom:4px;">⏳</div>
                <div style="font-size:1.6rem;font-weight:800;color:#b91c1c;line-height:1;" id="verifMatCountPend">${totalPend}</div>
                <div style="font-size:0.72rem;color:#b91c1c;font-weight:600;margin-top:4px;">Pendientes</div>
            </div>
            <div style="background:linear-gradient(135deg,#ecfdf5,white);border:1px solid #a7f3d0;border-radius:14px;padding:1rem;text-align:center;">
                <div style="font-size:1.5rem;margin-bottom:4px;">✅</div>
                <div style="font-size:1.6rem;font-weight:800;color:#047857;line-height:1;" id="verifMatCountVerif">${totalVerif}</div>
                <div style="font-size:0.72rem;color:#047857;font-weight:600;margin-top:4px;">Verificados</div>
            </div>
        </div>

        <!-- ZONA DE ESCANEO -->
        <div style="background:white;border-radius:14px;padding:16px;border:1px solid #e5e7eb;margin-bottom:1rem;">
            <div style="font-weight:700;font-size:0.95rem;color:#1e293b;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                <span>📷</span>
                <span>Escanear etiqueta</span>
            </div>

            <!-- INPUT MANUAL / LECTOR USB -->
            <input type="text"
                id="verifMatInputManual"
                placeholder="Escanea o escribe el código del material..."
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                style="width:100%;padding:12px 14px;border:2px solid #cbd5e1;border-radius:10px;font-size:0.95rem;font-family:'SF Mono',Monaco,monospace;font-weight:700;text-align:center;letter-spacing:0.03em;margin-bottom:10px;">

            <!-- CONTROLES -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button id="btnCamaraVerifMat" onclick="toggleCamaraVerifMat()"
                    style="flex:1;min-width:130px;padding:12px;border:none;border-radius:10px;background:#6366f1;color:white;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;">
                    ▶️ Activar cámara
                </button>
                <button onclick="procesarCodigoVerifMatManual()"
                    style="padding:12px 18px;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#475569;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">
                    ⏎ Procesar
                </button>
            </div>

            <!-- LECTOR DE CÁMARA (oculto hasta activar) -->
            <div id="verifMatCamaraWrapper" style="display:none;margin-top:12px;">
                <div id="verifMatCamara" style="width:100%;max-width:400px;margin:0 auto;border-radius:12px;overflow:hidden;"></div>
            </div>
        </div>

        <!-- LISTA DE MATERIALES PENDIENTES -->
        <div style="background:white;border-radius:14px;padding:16px;border:1px solid #e5e7eb;">
            <div style="font-weight:700;font-size:0.95rem;color:#1e293b;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span>📦</span>
                    <span>Materiales pendientes</span>
                </div>
                <span style="font-size:0.72rem;font-weight:700;color:#64748b;background:#f1f5f9;padding:3px 10px;border-radius:99px;">
                    ${totalPend}
                </span>
            </div>
            <div id="verifMatListaPendientes" style="display:flex;flex-direction:column;gap:8px;">
                ${_renderPendientesVerifMat(pendientes)}
            </div>
        </div>
    `;

    const input = document.getElementById('verifMatInputManual');
    if (input) {
        setTimeout(() => input.focus(), 300);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                procesarCodigoVerifMatManual();
            }
        });
    }
}

function _vacioVerifMat(icono, titulo, texto) {
    return `
        <div style="background:white;border-radius:14px;padding:2rem 1.2rem;border:1px solid #e5e7eb;text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:8px;">${icono}</div>
            <div style="font-weight:700;color:#1e293b;margin-bottom:6px;">${titulo}</div>
            <div style="font-size:0.85rem;color:#64748b;margin-bottom:16px;">${texto}</div>
            <button class="btn btn-primary" onclick="showPage('operaciones')">Ir a Operaciones</button>
        </div>
    `;
}

function _calcularMaterialesPendientes(operacionId, modelo, montajes, estaciones, catalogoMat, verificaciones) {
    const pendientes = [];

    const estIds = Object.keys(estaciones).filter(eid => estaciones[eid].modelo === modelo);

    estIds.forEach(estId => {
        const clave = operacionId + '_' + estId;
        const verif = verificaciones[clave];
        if (!verif || !verif.materiales) return;

        Object.entries(verif.materiales).forEach(([claveItem, item]) => {
            const estado = item.estado;
            if (estado !== 'entregado' && estado !== 'entregado_parcial') return;

            const partes = claveItem.split('__');
            const montajeId = partes[0];
            const matId = partes[1];

            const montaje = montajes[montajeId];
            const est = estaciones[estId];

            let cat = catalogoMat[matId];
            if (!cat) {
                cat = Object.values(catalogoMat).find(mm =>
                    mm.codigo === matId || mm.nombre === matId
                );
            }

            pendientes.push({
                opId: operacionId,
                estId,
                estNombre: est?.nombre || '—',
                montajeId,
                montajeNombre: montaje?.nombre || '—',
                matId,
                nombre: cat?.nombre || matId,
                codigo: (cat?.codigo || '').trim(),
                ubicacion: cat?.ubicacion || '',
                cantidadTotal: item.cantidadTotal || 0,
                cantidadEntregada: item.cantidadEntregada || 0,
                estado,
                claveItem
            });
        });
    });

    pendientes.sort((a, b) => {
        if (a.montajeNombre !== b.montajeNombre) return a.montajeNombre.localeCompare(b.montajeNombre);
        return (a.nombre || '').localeCompare(b.nombre || '');
    });

    return pendientes;
}

function _contarVerificadosOp(operacionId, montajes, estaciones, verificaciones) {
    let total = 0;
    Object.entries(verificaciones).forEach(([clave, doc]) => {
        if (!clave.startsWith(operacionId + '_')) return;
        if (!doc.materiales) return;
        Object.values(doc.materiales).forEach(m => {
            if (m.estado === 'verificado') total++;
        });
    });
    return total;
}

function _renderPendientesVerifMat(pendientes) {
    if (!pendientes.length) {
        return `
            <div style="text-align:center;padding:2rem 1rem;color:#94a3b8;">
                <div style="font-size:2.5rem;margin-bottom:8px;">✅</div>
                <div style="font-weight:600;color:#1e293b;margin-bottom:4px;">Todo verificado</div>
                <div style="font-size:0.85rem;">No hay materiales pendientes de verificar</div>
            </div>
        `;
    }

    return pendientes.map((p, idx) => `
        <button onclick="abrirConfirmacionVerifMat(${idx})"
            style="
                width:100%;
                background:#f8fafc;
                border:1px solid #e5e7eb;
                border-left:3px solid #6366f1;
                border-radius:10px;
                padding:12px 14px;
                cursor:pointer;
                text-align:left;
                font-family:inherit;
                display:flex;
                align-items:center;
                gap:12px;
                transition:all 0.15s ease;
            "
            onmouseover="this.style.background='#eef2ff';this.style.borderColor='#c7d2fe';"
            onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e5e7eb';">
            <span style="font-size:1.3rem;flex-shrink:0;">📦</span>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.88rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${p.nombre}
                </div>
                <div style="font-size:0.72rem;color:#64748b;margin-top:3px;font-family:'SF Mono',Monaco,monospace;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${p.codigo || '—'}
                </div>
                <div style="font-size:0.72rem;color:#94a3b8;margin-top:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span>📍 ${p.estNombre}</span>
                    <span style="color:#cbd5e1;">·</span>
                    <span>📦 ${p.montajeNombre}</span>
                </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:0.85rem;font-weight:800;color:#1d4ed8;">
                    ×${p.cantidadEntregada || p.cantidadTotal}
                </div>
                <div style="font-size:0.65rem;color:#94a3b8;font-weight:600;margin-top:2px;">uds</div>
            </div>
        </button>
    `).join('');
}

async function toggleCamaraVerifMat() {
    const ctx = window.APP.verifMatActual;

    if (ctx.camara) {
        await detenerCamaraVerifMat();
        return;
    }

    const btn = document.getElementById('btnCamaraVerifMat');
    const wrapper = document.getElementById('verifMatCamaraWrapper');

    if (btn) btn.innerHTML = '⏹️ Detener cámara';
    if (wrapper) wrapper.style.display = 'block';

    try {
        if (typeof Html5Qrcode === 'undefined') {
            toast('⚠️ Librería de escáner no disponible', '#ef4444');
            return;
        }

        const lector = new Html5Qrcode('verifMatCamara');

        await lector.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 200 } },
            (decodedText) => {
                _onCodigoDetectadoVerifMat(decodedText);
            },
            () => {}
        );

        ctx.camara = lector;
    } catch (e) {
        console.error('❌ Error cámara:', e);
        toast('❌ No se pudo activar la cámara', '#ef4444');
        if (wrapper) wrapper.style.display = 'none';
        if (btn) btn.innerHTML = '▶️ Activar cámara';
    }
}

async function detenerCamaraVerifMat() {
    const ctx = window.APP.verifMatActual;

    if (ctx.camara) {
        try { await ctx.camara.stop(); } catch (e) {}
        ctx.camara = null;
    }

    const wrapper = document.getElementById('verifMatCamaraWrapper');
    if (wrapper) wrapper.style.display = 'none';

    const btn = document.getElementById('btnCamaraVerifMat');
    if (btn) btn.innerHTML = '▶️ Activar cámara';
}

function procesarCodigoVerifMatManual() {
    const input = document.getElementById('verifMatInputManual');
    if (!input) return;
    const codigo = input.value.trim();
    if (!codigo) return;

    _onCodigoDetectadoVerifMat(codigo);
    input.value = '';
    input.focus();
}

async function _onCodigoDetectadoVerifMat(codigoOriginal) {
    let codigo = codigoOriginal.trim();
    if (typeof procesarCodigoEscaner === 'function') {
        try { codigo = procesarCodigoEscaner(codigo) || codigo; } catch (e) {}
    }

    if (!codigo) {
        toast('⚠️ Código vacío', '#f59e0b');
        return;
    }

    if (navigator.vibrate) {
        try { navigator.vibrate(80); } catch (e) {}
    }

    const pendientes = window.APP.verifMatActual.materialesPendientes || [];
    const coincidencias = pendientes.filter(p =>
        (p.codigo || '').toLowerCase() === codigo.toLowerCase() ||
        (p.matId || '').toLowerCase() === codigo.toLowerCase()
    );

    if (window.APP.verifMatActual.camara) {
        await detenerCamaraVerifMat();
    }

    if (!coincidencias.length) {
        toast(`❌ Código no encontrado en pendientes: ${codigo}`, '#ef4444', 3500);
        return;
    }

    if (coincidencias.length === 1) {
        const idx = pendientes.findIndex(p => p === coincidencias[0]);
        abrirConfirmacionVerifMat(idx);
        return;
    }

    _mostrarSelectorCoincidenciasVerifMat(coincidencias);
}

function _mostrarSelectorCoincidenciasVerifMat(coincidencias) {
    document.getElementById('modalElegirCoincidencia')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modalElegirCoincidencia';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

    modal.innerHTML = `
        <div style="background:white;border-radius:18px;max-width:460px;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <span style="font-size:1.4rem;">🔍</span>
                    <div style="min-width:0;">
                        <div style="font-weight:800;font-size:0.95rem;">Múltiples coincidencias</div>
                        <div style="font-size:0.72rem;opacity:0.9;">Elige el material correcto</div>
                    </div>
                </div>
                <button onclick="document.getElementById('modalElegirCoincidencia').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:10px;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
            </div>
            <div style="padding:14px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
                ${coincidencias.map(c => `
                    <button onclick="elegirCoincidenciaVerifMat('${c.opId}', '${c.estId}', '${c.montajeId}', '${c.matId}')"
                        style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;cursor:pointer;text-align:left;font-family:inherit;transition:all 0.15s ease;"
                        onmouseover="this.style.background='#eef2ff';this.style.borderColor='#c7d2fe';"
                        onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e5e7eb';">
                        <div style="font-weight:700;font-size:0.88rem;color:#1e293b;">${c.nombre}</div>
                        <div style="font-size:0.72rem;color:#64748b;margin-top:3px;">📍 ${c.estNombre} · 📦 ${c.montajeNombre}</div>
                        <div style="font-size:0.72rem;color:#1d4ed8;font-weight:700;margin-top:3px;">Necesario: ×${c.cantidadEntregada || c.cantidadTotal} uds</div>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function elegirCoincidenciaVerifMat(opId, estId, montajeId, matId) {
    document.getElementById('modalElegirCoincidencia')?.remove();
    document.body.style.overflow = '';

    const pendientes = window.APP.verifMatActual.materialesPendientes || [];
    const idx = pendientes.findIndex(p =>
        p.opId === opId && p.estId === estId &&
        p.montajeId === montajeId && p.matId === matId
    );

    if (idx >= 0) abrirConfirmacionVerifMat(idx);
}

async function abrirConfirmacionVerifMat(idx) {
    const pendientes = window.APP.verifMatActual.materialesPendientes || [];
    const p = pendientes[idx];
    if (!p) {
        toast('⚠️ Material no encontrado', '#f59e0b');
        return;
    }

    if (p.opId !== window.APP.operacionActiva) {
        toast('⚠️ Ese material no es de la operación activa', '#f59e0b');
        cargarVerificarMateriales();
        return;
    }

    window.APP.verifMatActual.materialSeleccionado = p;

    document.getElementById('modalConfirmarVerifMat')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modalConfirmarVerifMat';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

    const colorEstado = p.estado === 'entregado_parcial' ? '#3b82f6' : '#10b981';
    const textoEstado = p.estado === 'entregado_parcial'
        ? `Entrega parcial: ${p.cantidadEntregada}/${p.cantidadTotal}`
        : `Entregado completo`;

    modal.innerHTML = `
        <div style="background:white;border-radius:18px;max-width:460px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">

            <!-- CABECERA -->
            <div style="background:linear-gradient(135deg,${colorEstado},${p.estado === 'entregado_parcial' ? '#2563eb' : '#059669'});color:white;padding:16px 20px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <span style="font-size:2rem;">📦</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:800;font-size:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${p.nombre}
                        </div>
                        <div style="font-size:0.75rem;opacity:0.9;margin-top:2px;font-family:'SF Mono',Monaco,monospace;font-weight:600;">
                            ${p.codigo || '—'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- DATOS -->
            <div style="background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:12px 20px;font-size:0.78rem;color:#64748b;font-weight:600;display:flex;flex-direction:column;gap:4px;">
                <div>📍 ${p.estNombre} · 📦 ${p.montajeNombre}</div>
                <div style="color:${colorEstado};font-weight:700;">${textoEstado}</div>
            </div>

            <!-- CUERPO -->
            <div style="padding:20px;overflow-y:auto;">

                <div style="text-align:center;margin-bottom:16px;">
                    <div style="font-size:0.85rem;color:#64748b;font-weight:600;margin-bottom:4px;">
                        Necesario
                    </div>
                    <div style="font-size:2.2rem;font-weight:800;color:#1e293b;line-height:1;">
                        ${p.cantidadTotal}
                        <span style="font-size:1rem;font-weight:600;color:#64748b;">uds</span>
                    </div>
                </div>

                <div style="margin-bottom:14px;">
                    <label style="display:block;font-size:0.82rem;font-weight:700;color:#475569;margin-bottom:8px;text-align:center;">
                        ¿Cuántas has recibido?
                    </label>
                    <div style="display:flex;align-items:center;gap:10px;justify-content:center;">
                        <button onclick="cambiarCantidadVerifMat(-1)" style="width:48px;height:48px;border:2px solid #cbd5e1;background:white;border-radius:12px;font-size:1.4rem;font-weight:800;color:#475569;cursor:pointer;font-family:inherit;">−</button>
                        <input type="number" id="verifMatCantidad" value="${p.cantidadEntregada || p.cantidadTotal}" min="0" max="999"
                            style="width:100px;padding:12px;border:2px solid #6366f1;border-radius:12px;font-size:1.6rem;font-weight:800;text-align:center;font-family:'SF Mono',Monaco,monospace;color:#1e293b;"
                            onfocus="this.select()">
                        <button onclick="cambiarCantidadVerifMat(1)" style="width:48px;height:48px;border:2px solid #cbd5e1;background:white;border-radius:12px;font-size:1.4rem;font-weight:800;color:#475569;cursor:pointer;font-family:inherit;">+</button>
                    </div>
                </div>

                <div id="verifMatAvisoCantidad" style="display:none;background:#fef3c7;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:8px;padding:10px 12px;font-size:0.78rem;color:#92400e;font-weight:600;margin-bottom:14px;"></div>

            </div>

            <!-- PIE -->
            <div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;flex-direction:column;gap:8px;flex-shrink:0;">
                <div style="display:flex;gap:8px;">
                    <button onclick="cerrarModalConfirmarVerifMat()"
                        style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:white;color:#64748b;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">
                        Cancelar
                    </button>
                    <button onclick="confirmarVerifMat()"
                        style="flex:2;padding:12px;border:none;border-radius:10px;background:#10b981;color:white;font-weight:700;cursor:pointer;font-size:0.9rem;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;">
                        ✅ Confirmar
                    </button>
                </div>
                <button onclick="reportarFaltaDesdeVerifMat()"
                    style="width:100%;padding:10px;border:1px solid #fecaca;border-radius:10px;background:#fef2f2;color:#b91c1c;font-weight:700;cursor:pointer;font-size:0.82rem;font-family:inherit;">
                    ❌ Falta material
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const inputCant = document.getElementById('verifMatCantidad');
    if (inputCant) {
        inputCant.addEventListener('input', _actualizarAvisoCantidadVerifMat);
        setTimeout(() => inputCant.select(), 100);
    }
}

function _actualizarAvisoCantidadVerifMat() {
    const p = window.APP.verifMatActual.materialSeleccionado;
    if (!p) return;

    const aviso = document.getElementById('verifMatAvisoCantidad');
    if (!aviso) return;

    const cant = parseInt(document.getElementById('verifMatCantidad')?.value) || 0;

    if (cant === 0) {
        aviso.style.display = 'block';
        aviso.style.background = '#fef2f2';
        aviso.style.borderColor = '#fecaca';
        aviso.style.borderLeftColor = '#ef4444';
        aviso.style.color = '#b91c1c';
        aviso.innerHTML = '⚠️ Cantidad 0 · Usa "❌ Falta material" para reportar.';
        return;
    }

    if (cant > p.cantidadTotal) {
        const extra = cant - p.cantidadTotal;
        aviso.style.display = 'block';
        aviso.style.background = '#fef3c7';
        aviso.style.borderColor = '#fde68a';
        aviso.style.borderLeftColor = '#f59e0b';
        aviso.style.color = '#92400e';
        aviso.innerHTML = `⚠️ Has recibido <strong>${extra} ud${extra > 1 ? 's' : ''} de más</strong> respecto a lo necesario. Se guardará como verificado igualmente.`;
        return;
    }

    if (cant < p.cantidadTotal) {
        const falta = p.cantidadTotal - cant;
        aviso.style.display = 'block';
        aviso.style.background = '#eff6ff';
        aviso.style.borderColor = '#bfdbfe';
        aviso.style.borderLeftColor = '#3b82f6';
        aviso.style.color = '#1d4ed8';
        aviso.innerHTML = `🔵 Se guardará como <strong>entrega parcial</strong> · faltan ${falta} ud${falta > 1 ? 's' : ''}.`;
        return;
    }

    aviso.style.display = 'block';
    aviso.style.background = '#ecfdf5';
    aviso.style.borderColor = '#a7f3d0';
    aviso.style.borderLeftColor = '#10b981';
    aviso.style.color = '#047857';
    aviso.innerHTML = '✅ Cantidad correcta · Se guardará como verificado.';
}

function cambiarCantidadVerifMat(delta) {
    const input = document.getElementById('verifMatCantidad');
    if (!input) return;
    const actual = parseInt(input.value) || 0;
    const nuevo = Math.max(0, actual + delta);
    input.value = nuevo;
    _actualizarAvisoCantidadVerifMat();
}

function cerrarModalConfirmarVerifMat() {
    document.getElementById('modalConfirmarVerifMat')?.remove();
    document.body.style.overflow = '';
    window.APP.verifMatActual.materialSeleccionado = null;
}

async function confirmarVerifMat() {
    const p = window.APP.verifMatActual.materialSeleccionado;
    if (!p) return;

    if (p.opId !== window.APP.operacionActiva) {
        cerrarModalConfirmarVerifMat();
        toast('⚠️ Ese material no es de la operación activa', '#f59e0b');
        cargarVerificarMateriales();
        return;
    }

    const input = document.getElementById('verifMatCantidad');
    const cantidad = parseInt(input?.value) || 0;

    if (cantidad <= 0) {
        toast('⚠️ La cantidad debe ser mayor que 0', '#f59e0b');
        return;
    }

    let nuevoEstado = 'verificado';
    if (cantidad < p.cantidadTotal) nuevoEstado = 'entregado_parcial';

    const clave = p.opId + '_' + p.estId;
    const claveItem = p.montajeId + '__' + p.matId;

    mostrarLoading('Guardando verificación...');

    try {
        const data = await cargarFirebase('materiales_verificados', true);
        const doc = data[clave];
        if (!doc || !doc.materiales?.[claveItem]) {
            ocultarLoading();
            toast('❌ Material no encontrado en el servidor', '#ef4444');
            return;
        }

        const anterior = doc.materiales[claveItem];

        doc.materiales[claveItem] = {
            ...anterior,
            estado: nuevoEstado,
            cantidadEntregada: cantidad,
            cantidadRecibida: cantidad,
            verificadoPor: window.APP.operario?.nombre || 'Operario',
            fechaVerificacion: new Date().toISOString(),
            entregadoPor: anterior.entregadoPor || '',
            fechaEntrega: anterior.fechaEntrega || null,
            cantidadFaltante: 0,
            comentario: anterior.comentario || ''
        };

        doc.ultimaActualizacion = new Date().toISOString();
        await guardarFirebase('materiales_verificados', clave, doc);

        ocultarLoading();

        _feedbackEscaneoExitoso();

        if (nuevoEstado === 'verificado') {
            toast(`✅ ${p.nombre} verificado ×${cantidad}`, '#10b981', 2000);
        } else {
            toast(`🔵 ${p.nombre} parcial ${cantidad}/${p.cantidadTotal}`, '#3b82f6', 2500);
        }

        cerrarModalConfirmarVerifMat();

        setTimeout(() => {
            if (document.getElementById('verificar-materiales')?.classList.contains('active')) {
                cargarVerificarMateriales();
            }
        }, 400);

    } catch (e) {
        ocultarLoading();
        console.error('❌ Error confirmando:', e);
        toast('❌ Error al guardar', '#ef4444');
    }
}

function reportarFaltaDesdeVerifMat() {
    const p = window.APP.verifMatActual.materialSeleccionado;
    if (!p) return;

    cerrarModalConfirmarVerifMat();

    if (typeof abrirModalFalta === 'function') {
        abrirModalFalta(
            p.opId,
            p.estId,
            p.montajeId,
            p.matId,
            p.nombre,
            p.cantidadTotal,
            ''
        );
    }
}

function _feedbackEscaneoExitoso() {
    if (navigator.vibrate) {
        try { navigator.vibrate([50, 40, 50]); } catch (e) {}
    }

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const audioCtx = new AudioCtx();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        }
    } catch (e) {}
}
