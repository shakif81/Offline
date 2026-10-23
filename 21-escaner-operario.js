window.APP._escanerActual = {
    montajeId: null,
    componentes: [],
    slots: [],
    camara: null
};

function tieneComponentesAEscanear(montaje) {
    if (!montaje.materialesNecesarios) return false;

    const materialesCache = window.APP.fbCache['materiales_catalogo']?.data || {};

    return montaje.materialesNecesarios.split('||').some(item => {
        const matId = item.trim().split('=')[0];
        if (!matId) return false;

        const cat = materialesCache[matId] ||
            Object.values(materialesCache).find(m =>
                m.codigo === matId || m.nombre === matId
            );

        return cat?.requiereEscaneo === true;
    });
}

function contarComponentesAEscanear(montaje) {
    if (!montaje.materialesNecesarios) return 0;

    const materialesCache = window.APP.fbCache['materiales_catalogo']?.data || {};
    let total = 0;

    montaje.materialesNecesarios.split('||').forEach(item => {
        const partes = item.trim().split('=');
        const matId = partes[0];
        const cantidad = parseInt(partes[1]) || 1;
        if (!matId) return;

        const cat = materialesCache[matId] ||
            Object.values(materialesCache).find(m =>
                m.codigo === matId || m.nombre === matId
            );

        if (cat?.requiereEscaneo === true) {
            total += cantidad;
        }
    });

    return total;
}

async function abrirModalEscaner(montajeId) {
    const operacionId = window.APP.operacionActiva;
    if (!operacionId) {
        toast('❌ No hay operación activa', '#ef4444');
        return;
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

    const componentes = [];

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

            if (cat?.requiereEscaneo === true) {
                for (let i = 0; i < cantidad; i++) {
                    componentes.push({
                        materialId: matId,
                        materialNombre: cat.nombre || matId,
                        materialCodigo: cat.codigo || '',
                        numero: i + 1,
                        total: cantidad
                    });
                }
            }
        });
    }

    if (!componentes.length) {
        toast('ℹ️ Este montaje no tiene componentes a escanear', '#94a3b8');
        return;
    }

    const claveEscaneos = operacionId + '_' + montajeId;
    const escaneosGuardados = await cargarFirebase('componentes_escaneados', true);
    const guardados = escaneosGuardados[claveEscaneos]?.componentes || [];

const slots = componentes.map((comp, idx) => {
    const encontrado = guardados[idx];
    if (encontrado && encontrado.materialId === comp.materialId) {
        return {
            materialId: comp.materialId,
            materialNombre: comp.materialNombre,
            numero: comp.numero,
            total: comp.total,
            codigoEscaneado: encontrado.codigoEscaneado || '',
            codigoOriginal: encontrado.codigoOriginal || '',
            revision: encontrado.revision || '',
            escaneadoPor: encontrado.escaneadoPor || '',
            fechaEscaneo: encontrado.fechaEscaneo || null,
            manual: encontrado.manual || false
        };
    }
    return {
        materialId: comp.materialId,
        materialNombre: comp.materialNombre,
        numero: comp.numero,
        total: comp.total,
        codigoEscaneado: '',
        codigoOriginal: '',
        revision: '',
        escaneadoPor: '',
        fechaEscaneo: null,
        manual: false
    };
});

    window.APP._escanerActual = {
        montajeId,
        operacionId,
        numeroOperacion: op?.numero || '—',
        montajeNombre: m.nombre || 'Sin nombre',
        slots,
        camara: null
    };

    renderModalEscaner();
}

function renderModalEscaner() {
    document.getElementById('modalEscaner')?.remove();

    const ctx = window.APP._escanerActual;
    if (!ctx || !ctx.slots) return;

    const slots = ctx.slots;
    const hechos = slots.filter(s => s.codigoEscaneado).length;
    const total = slots.length;
    const todoOk = hechos === total;

    const porMaterial = {};
    slots.forEach((slot, idx) => {
        if (!porMaterial[slot.materialId]) {
            porMaterial[slot.materialId] = {
                materialId: slot.materialId,
                materialNombre: slot.materialNombre,
                slots: []
            };
        }
        porMaterial[slot.materialId].slots.push({ ...slot, idx });
    });

    const modal = document.createElement('div');
    modal.id = 'modalEscaner';
    modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

    modal.innerHTML = `
        <!-- CABECERA -->
        <div style="background:linear-gradient(135deg,#2d74da,#1a365d);color:white;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                <span style="font-size:1.6rem;">📷</span>
                <div style="min-width:0;">
                    <div style="font-weight:800;font-size:1rem;">Escanear componentes</div>
                    <div style="font-size:0.75rem;opacity:0.9;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${ctx.montajeNombre} · Op. ${ctx.numeroOperacion}
                    </div>
                </div>
            </div>
            <button onclick="cerrarModalEscaner()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:38px;height:38px;border-radius:10px;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
        </div>

        <!-- PROGRESO -->
        <div style="padding:12px 20px;background:#f8fafc;border-bottom:1px solid #e5e7eb;flex-shrink:0;">
            <div style="display:flex;justify-content:space-between;font-size:0.78rem;font-weight:700;color:#1e293b;margin-bottom:6px;">
                <span>Progreso</span>
                <span>${hechos} / ${total}</span>
            </div>
            <div style="background:#e5e7eb;height:8px;border-radius:99px;overflow:hidden;">
                <div style="background:${todoOk ? '#10b981' : '#3b82f6'};height:100%;width:${(hechos / total) * 100}%;border-radius:99px;transition:width 0.3s ease;"></div>
            </div>
        </div>

        <!-- LISTA -->
        <div style="flex:1;overflow-y:auto;padding:16px 20px;background:#fafafa;">
            <div style="max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:16px;">
                ${Object.values(porMaterial).map(grupo => `
                    <div style="background:white;border-radius:12px;padding:14px 16px;border:1px solid #e5e7eb;border-left:4px solid #3b82f6;">
                        <div style="font-weight:700;font-size:0.9rem;color:#1e293b;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                            <span>📦</span>
                            <span>${grupo.materialNombre}</span>
                            <span style="font-size:0.72rem;color:#64748b;font-weight:500;">(${grupo.slots.length} unidad${grupo.slots.length > 1 ? 'es' : ''})</span>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                       ${grupo.slots.map(slot => {
    const tieneCodigo = !!slot.codigoEscaneado;
    const esElSiguiente = esSiguienteSlot(slot.idx);

    return `
        <div style="
            background:${tieneCodigo ? '#f0fdf4' : (esElSiguiente ? '#eff6ff' : '#f8fafc')};
            border:1px solid ${tieneCodigo ? '#a7f3d0' : (esElSiguiente ? '#bfdbfe' : '#e5e7eb')};
            border-radius:8px;
            padding:10px 12px;
        ">
            <!-- FILA 1: Nº + estado + botones -->
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="
                    background:${tieneCodigo ? '#10b981' : (esElSiguiente ? '#3b82f6' : '#94a3b8')};
                    color:white;
                    width:28px;height:28px;
                    border-radius:50%;
                    display:flex;align-items:center;justify-content:center;
                    font-size:0.75rem;
                    font-weight:800;
                    flex-shrink:0;
                ">${tieneCodigo ? '✓' : slot.numero}</span>

                <div style="flex:1;min-width:0;">
                    ${tieneCodigo ? `
                        <div style="font-size:0.68rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">Nº Serie</div>
                    ` : `
                        <div style="font-size:0.82rem;color:#94a3b8;font-style:italic;">
                            ${esElSiguiente ? '⏳ Siguiente a escanear' : 'Pendiente'}
                        </div>
                    `}
                </div>

                ${tieneCodigo ? `
                    <button onclick="borrarEscaneoSlot(${slot.idx})" style="
                        background:#fef2f2;border:1px solid #fecaca;border-radius:6px;
                        padding:4px 10px;font-size:0.7rem;color:#b91c1c;cursor:pointer;
                        font-family:inherit;font-weight:600;
                    ">🗑️</button>
                ` : esElSiguiente ? `
                    <button onclick="abrirCamaraEscaner(${slot.idx})" style="
                        background:#3b82f6;border:none;border-radius:6px;
                        padding:6px 12px;font-size:0.75rem;color:white;cursor:pointer;
                        font-family:inherit;font-weight:700;
                    ">📷 Escanear</button>
                    <button onclick="abrirModalEscanerManual(${slot.idx})" style="
                        background:white;border:1px solid #cbd5e1;border-radius:6px;
                        padding:6px 12px;font-size:0.75rem;color:#64748b;cursor:pointer;
                        font-family:inherit;font-weight:600;
                    ">✍️ Manual</button>
                ` : ''}
            </div>

            ${tieneCodigo ? `
                <!-- FILA 2: Nº Serie (input) + Revisión (input) -->
                <div style="display:grid;grid-template-columns:1fr 100px;gap:8px;margin-top:10px;">
                    <input type="text" value="${slot.codigoEscaneado || ''}"
                        oninput="cambiarCodigoSlot(${slot.idx}, this.value)"
                        placeholder="Nº Serie..."
                        style="
                            width:100%;
                            padding:8px 10px;
                            border:2px solid #86efac;
                            border-radius:8px;
                            background:white;
                            font-family:'SF Mono',Monaco,monospace;
                            font-size:0.82rem;
                            font-weight:700;
                            color:#1e293b;
                        ">

                    <input type="text" value="${slot.revision || ''}"
                        oninput="cambiarRevisionSlot(${slot.idx}, this.value)"
                        placeholder="Rev..."
                        maxlength="20"
                        style="
                            width:100%;
                            padding:8px 10px;
                            border:2px solid #cbd5e1;
                            border-radius:8px;
                            background:white;
                            font-size:0.82rem;
                            font-weight:700;
                            color:#1e293b;
                            text-align:center;
                        ">
                </div>
            ` : ''}
        </div>
    `;
}).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- PIE -->
        <div style="padding:14px 20px;border-top:1px solid #e5e7eb;background:white;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-size:0.8rem;font-weight:700;color:${todoOk ? '#047857' : '#c2410c'};">
                ${todoOk ? '✅ Todos escaneados' : `⏳ Faltan ${total - hechos}`}
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="cerrarModalEscaner()" style="
                    padding:10px 16px;border:1px solid #e5e7eb;border-radius:10px;
                    background:white;color:#64748b;font-weight:700;cursor:pointer;
                    font-size:0.85rem;font-family:inherit;
                ">Cerrar</button>
                ${todoOk ? `
                    <button onclick="guardarEscaneosEscaner()" style="
                        padding:10px 20px;border:none;border-radius:10px;
                        background:#10b981;color:white;font-weight:700;cursor:pointer;
                        font-size:0.85rem;font-family:inherit;
                    ">💾 Guardar todo</button>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function esSiguienteSlot(idx) {
    const ctx = window.APP._escanerActual;
    if (!ctx || !ctx.slots) return false;

    for (let i = 0; i < ctx.slots.length; i++) {
        if (!ctx.slots[i].codigoEscaneado) {
            return i === idx;
        }
    }
    return false;
}

async function cerrarModalEscaner() {
    const ctx = window.APP._escanerActual;

    if (ctx?.camara) {
        try {
            await ctx.camara.stop();
        } catch (e) {}
        ctx.camara = null;
    }

    cerrarModal('modalEscaner');

    if (window.APP.operacionActiva) {
        const modelo = window.APP.modeloActivo || 'MS3';
        cargarMontajesOperacion(window.APP.operacionActiva, modelo);
    }
}

function borrarEscaneoSlot(idx) {
    const ctx = window.APP._escanerActual;
    if (!ctx || !ctx.slots[idx]) return;

    ctx.slots[idx].codigoEscaneado = '';
    ctx.slots[idx].codigoOriginal = '';
    ctx.slots[idx].revision = '';
    ctx.slots[idx].escaneadoPor = '';
    ctx.slots[idx].fechaEscaneo = null;
    ctx.slots[idx].manual = false;

    renderModalEscaner();
}

async function abrirCamaraEscaner(idx) {
    document.getElementById('modalCamaraEscaner')?.remove();

    const ctx = window.APP._escanerActual;
    if (!ctx) return;

    const modal = document.createElement('div');
    modal.id = 'modalCamaraEscaner';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:100000;display:flex;flex-direction:column;';

    modal.innerHTML = `
        <!-- CABECERA -->
        <div style="padding:14px 20px;color:white;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;">
            <div>
                <div style="font-weight:700;font-size:1rem;">📷 Escaneando</div>
                <div style="font-size:0.75rem;opacity:0.8;margin-top:2px;">
                    Apunta al código del componente
                </div>
            </div>
            <button onclick="cerrarCamaraEscaner()" style="
                background:rgba(255,255,255,0.2);border:none;color:white;
                width:38px;height:38px;border-radius:10px;font-size:1.2rem;
                cursor:pointer;display:flex;align-items:center;justify-content:center;
            ">✕</button>
        </div>

        <!-- CÁMARA -->
        <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:10px;">
            <div id="lectorEscaner" style="width:100%;max-width:500px;"></div>
        </div>

        <!-- FOOTER -->
        <div style="padding:16px 20px;text-align:center;color:white;flex-shrink:0;">
            <div id="escanerEstado" style="font-size:0.85rem;opacity:0.9;">
                Buscando código...
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    try {
        if (typeof Html5Qrcode === 'undefined') {
            toast('⚠️ Escáner no disponible', '#ef4444');
            cerrarCamaraEscaner();
            return;
        }

        const lector = new Html5Qrcode('lectorEscaner');

        await lector.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                onCodigoEscaneado(idx, decodedText);
            },
            () => {
            }
        );

        ctx.camara = lector;

    } catch (e) {
        console.error('❌ Error cámara:', e);
        toast('❌ No se pudo activar la cámara', '#ef4444');
        cerrarCamaraEscaner();
    }
}

async function cerrarCamaraEscaner() {
    const ctx = window.APP._escanerActual;

    if (ctx?.camara) {
        try {
            await ctx.camara.stop();
        } catch (e) {}
        ctx.camara = null;
    }

    document.getElementById('modalCamaraEscaner')?.remove();
}

async function onCodigoEscaneado(idx, codigoOriginal) {
    try {
        if (navigator.vibrate) navigator.vibrate(100);
    } catch (e) {}

    await cerrarCamaraEscaner();

    const codigoProcesado = procesarCodigoEscaner(codigoOriginal);

    if (!codigoProcesado) {
        toast('⚠️ El código no es válido', '#f59e0b');
        return;
    }

    const ctx = window.APP._escanerActual;
    const yaExiste = ctx.slots.some((s, i) =>
        i !== idx && s.codigoEscaneado === codigoProcesado
    );

    if (yaExiste) {
        toast('⚠️ Ese código ya está escaneado en otro componente', '#f59e0b', 3000);
        return;
    }

    ctx.slots[idx].codigoEscaneado = codigoProcesado;
    ctx.slots[idx].codigoOriginal = codigoOriginal;
    ctx.slots[idx].escaneadoPor = window.APP.operario?.nombre || 'Operario';
    ctx.slots[idx].fechaEscaneo = new Date().toISOString();
    ctx.slots[idx].manual = false;

    toast(`✅ Escaneado: ${codigoProcesado}`, '#10b981', 2000);

    renderModalEscaner();

    const todos = ctx.slots.every(s => s.codigoEscaneado);
    if (todos) {
        setTimeout(() => {
            guardarEscaneosEscaner();
        }, 500);
    }
}

function abrirModalEscanerManual(idx) {
    document.getElementById('modalEscanerManual')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modalEscanerManual';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;';

    modal.innerHTML = `
        <div style="background:white;border-radius:18px;padding:24px;max-width:420px;width:100%;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;color:#1e293b;font-size:1.05rem;">✍️ Escribir código</h3>
                <button onclick="document.getElementById('modalEscanerManual').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b;">✕</button>
            </div>

            <p style="font-size:0.82rem;color:#64748b;margin:0 0 12px 0;">
                Si la cámara no lee el código, escríbelo aquí.
            </p>

   <div class="form-group">
    <label style="display:block;font-size:0.8rem;font-weight:700;color:#475569;margin-bottom:6px;">
        Código del componente
    </label>
    <input type="text" id="escanerManualInput" placeholder="Ej: BDM12345 67890" maxlength="80"
        style="width:100%;padding:12px 14px;border:2px solid #cbd5e1;border-radius:10px;font-size:1rem;font-family:'SF Mono',Monaco,monospace;text-align:center;letter-spacing:0.05em;"
        onkeydown="if(event.key==='Enter'){event.preventDefault();confirmarEscanerManual(${idx});}">
    <small style="color:#64748b;font-size:0.72rem;display:block;margin-top:6px;">
        El código será procesado con la configuración del escáner.
    </small>
</div>

<div class="form-group" style="margin-top:10px;">
    <label style="display:block;font-size:0.8rem;font-weight:700;color:#475569;margin-bottom:6px;">
        📝 Revisión (opcional)
    </label>
    <input type="text" id="escanerManualRevision" placeholder="Ej: A, R1..." maxlength="20"
        style="width:100%;padding:12px 14px;border:2px solid #cbd5e1;border-radius:10px;font-size:1rem;text-align:center;font-weight:700;">
</div>

            <div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:10px;margin-top:12px;">
                <div style="font-size:0.7rem;color:#047857;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Vista previa</div>
                <div id="escanerManualPreview" style="font-family:'SF Mono',Monaco,monospace;font-size:0.9rem;color:#1e293b;font-weight:700;">
                    Esperando...
                </div>
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;">
                <button onclick="document.getElementById('modalEscanerManual').remove()" style="
                    flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:10px;
                    background:white;color:#64748b;font-weight:700;cursor:pointer;
                    font-family:inherit;
                ">Cancelar</button>
                <button onclick="confirmarEscanerManual(${idx})" style="
                    flex:1;padding:12px;border:none;border-radius:10px;
                    background:#10b981;color:white;font-weight:700;cursor:pointer;
                    font-family:inherit;
                ">✅ Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('escanerManualInput');
    const preview = document.getElementById('escanerManualPreview');

    input.addEventListener('input', () => {
        const procesado = procesarCodigoEscaner(input.value);
        preview.textContent = procesado || 'Esperando...';
    });

    setTimeout(() => input.focus(), 100);
}

async function confirmarEscanerManual(idx) {
    const input = document.getElementById('escanerManualInput');
    const inputRev = document.getElementById('escanerManualRevision');
    const codigoOriginal = input?.value.trim() || '';
    const revision = inputRev?.value.trim() || '';

    if (!codigoOriginal) {
        toast('⚠️ Escribe un código', '#f59e0b');
        return;
    }

    const codigoProcesado = procesarCodigoEscaner(codigoOriginal);

    if (!codigoProcesado) {
        toast('⚠️ El código no es válido', '#f59e0b');
        return;
    }

    const ctx = window.APP._escanerActual;
    const yaExiste = ctx.slots.some((s, i) =>
        i !== idx && s.codigoEscaneado === codigoProcesado
    );

    if (yaExiste) {
        toast('⚠️ Ese código ya está escaneado', '#f59e0b');
        return;
    }

    ctx.slots[idx].codigoEscaneado = codigoProcesado;
    ctx.slots[idx].codigoOriginal = codigoOriginal;
    ctx.slots[idx].revision = revision;
    ctx.slots[idx].escaneadoPor = window.APP.operario?.nombre || 'Operario';
    ctx.slots[idx].fechaEscaneo = new Date().toISOString();
    ctx.slots[idx].manual = true;

    document.getElementById('modalEscanerManual')?.remove();

    toast(`✅ Añadido: ${codigoProcesado}`, '#10b981');

    renderModalEscaner();

    const todos = ctx.slots.every(s => s.codigoEscaneado);
    if (todos) {
        setTimeout(() => guardarEscaneosEscaner(), 500);
    }
}

async function guardarEscaneosEscaner() {
    const ctx = window.APP._escanerActual;
    if (!ctx) return;

    const { operacionId, montajeId, slots, numeroOperacion, montajeNombre } = ctx;

const componentes = slots.map(slot => ({
    materialId: slot.materialId,
    materialNombre: slot.materialNombre,
    codigoEscaneado: slot.codigoEscaneado || '',
    codigoOriginal: slot.codigoOriginal || '',
    revision: slot.revision || '',
    escaneadoPor: slot.escaneadoPor || '',
    fechaEscaneo: slot.fechaEscaneo || null,
    manual: slot.manual || false
}));

    const clave = operacionId + '_' + montajeId;

    const data = {
        operacionId,
        numeroOperacion,
        montajeId,
        montajeNombre,
        operario: window.APP.operario?.nombre || 'Operario',
        fecha: new Date().toISOString(),
        componentes
    };

    mostrarLoading('Guardando escaneos...');
    const ok = await guardarFirebase('componentes_escaneados', clave, data);
    ocultarLoading();

    if (ok) {
        toast('✅ Escaneos guardados', '#10b981');

        if (!window.APP._componentesEscaneados) window.APP._componentesEscaneados = {};
        window.APP._componentesEscaneados[montajeId] = data;

        cerrarModalEscaner();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

function cambiarCodigoSlot(idx, valor) {
    const ctx = window.APP._escanerActual;
    if (!ctx || !ctx.slots[idx]) return;

    ctx.slots[idx].codigoEscaneado = valor;
}

function cambiarRevisionSlot(idx, valor) {
    const ctx = window.APP._escanerActual;
    if (!ctx || !ctx.slots[idx]) return;

    ctx.slots[idx].revision = valor;
}
