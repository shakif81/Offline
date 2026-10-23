async function registrarMovimientoKanban(piezaId, opciones) {
    const { tipo, cantidad, motivo = '', comentario = '', contexto = {}, silencioso = false } = opciones;

    if (!piezaId || !tipo || !cantidad || cantidad <= 0) {
        console.warn('⚠️ registrarMovimientoKanban: parámetros inválidos');
        return null;
    }

    try {
        const piezas = await cargarFirebase('piezas_kanban', true);
        const pieza = piezas[piezaId];
        if (!pieza) {
            console.warn('⚠️ Pieza no encontrada:', piezaId);
            return null;
        }

        const stockAntes = pieza.stockActual || 0;
        let stockDespues = stockAntes;

        if (tipo === 'entrada') stockDespues = stockAntes + cantidad;
        else if (tipo === 'salida') stockDespues = Math.max(0, stockAntes - cantidad);
        else if (tipo === 'ajuste') stockDespues = cantidad;

const updates = {
    stockActual: stockDespues,
    ultimaActualizacion: new Date().toISOString()
};

if (tipo === 'entrada' && pieza.mensajeAdmin) {
    updates.mensajeAdmin = '';
    updates.fechaMensajeAdmin = null;
    updates.autorMensajeAdmin = '';
    updates._avisoLimpiadoPor = window.APP.operario?.nombre || 'Admin';
    updates._avisoLimpiadoFecha = new Date().toISOString();
}

await guardarFirebase('piezas_kanban', piezaId, updates);

        const movId = 'mov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const cantidadReal = tipo === 'ajuste' ? (stockDespues - stockAntes) : (tipo === 'entrada' ? cantidad : -cantidad);

        await guardarFirebase('movimientos_kanban', movId, {
            piezaId,
            piezaCodigo: pieza.codigo || '',
            piezaNombre: pieza.nombre || '',

            tipo,
            cantidad: cantidadReal,
            stockAntes,
            stockDespues,
            motivo,
            comentario,

            operario: window.APP.operario?.nombre || 'Sistema',

            operacionId: contexto.operacionId || '',
            numeroOperacion: contexto.numeroOperacion || '',
            montajeId: contexto.montajeId || '',
            montajeNombre: contexto.montajeNombre || '',

            fecha: new Date().toISOString()
        });

        const critico = pieza.stockCritico || 5;
const cruzoCritico = stockAntes > critico && stockDespues <= critico && stockDespues > 0;
const cruzoAgotado = stockAntes > 0 && stockDespues === 0;

if (!silencioso) {
    if (cruzoAgotado) {
        toast(`🚫 "${pieza.nombre}" AGOTADO`, '#ef4444', 4000);
    } else if (cruzoCritico) {
        toast(`⚠️ "${pieza.nombre}" en stock crítico (${stockDespues})`, '#f59e0b', 3500);
    }
}

if (cruzoAgotado || cruzoCritico) {
    try {
        const alertaId = 'kanb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        await guardarFirebase('alertas_kanban', alertaId, {
            tipo: cruzoAgotado ? 'agotado' : 'critico',
            piezaId,
            piezaNombre: pieza.nombre || 'Sin nombre',
            piezaCodigo: pieza.codigo || '',
            stockAntes,
            stockDespues,
            stockCritico: critico,
            motivo,
            comentario,
            operario: window.APP.operario?.nombre || 'Sistema',
            operacionId: contexto.operacionId || '',
            numeroOperacion: contexto.numeroOperacion || '',
            montajeId: contexto.montajeId || '',
            montajeNombre: contexto.montajeNombre || '',
            fecha: new Date().toISOString(),
            leida: false
        });
    } catch (e) {
        console.warn('⚠️ Error creando alerta kanban:', e);
    }
}

        return { stockAntes, stockDespues, movId };
    } catch (e) {
        console.error('❌ Error registrando movimiento:', e);
        return null;
    }
}

async function descontarPiezasKanbanMontaje(montaje, operacionId, historialId, contextoExtra = {}) {
    if (!montaje?.piezasKanban) {
        return { movimientos: 0, faltantes: [], agotados: [] };
    }

    const piezasCat = await cargarFirebase('piezas_kanban', true);
    const items = montaje.piezasKanban.split(',').filter(x => x.trim());

    let movimientos = 0;
    const faltantes = [];
    const agotados = [];

    for (const item of items) {
        const partes = item.trim().split('=');
        const codigo = partes[0];
        const cantidad = parseInt(partes[1]) || 1;
        if (!codigo || cantidad <= 0) continue;

        let piezaId = null;
        let piezaObj = null;
        for (const [pid, p] of Object.entries(piezasCat)) {
            if (p.codigo === codigo || pid === codigo) {
                piezaId = pid;
                piezaObj = p;
                break;
            }
        }

        if (!piezaId) {
            faltantes.push(codigo);
            continue;
        }

        const stockAntes = piezaObj.stockActual || 0;

        const res = await registrarMovimientoKanban(piezaId, {
            tipo: 'salida',
            cantidad,
            motivo: 'Consumo montaje',
            comentario: '',
            contexto: {
                operacionId,
                numeroOperacion: contextoExtra.numeroOperacion || '',
                montajeId: contextoExtra.montajeId || '',
                montajeNombre: montaje.nombre || ''
            },
            silencioso: true
        });

        if (res) {
            movimientos++;
            if (res.stockDespues === 0 && stockAntes > 0) {
                agotados.push(piezaObj.nombre || codigo);
            }
        }
    }

    return { movimientos, faltantes, agotados };
}

async function abrirModalMovimientoKanban(piezaId) {
    const piezas = await cargarFirebase('piezas_kanban', true);
    const pieza = piezas[piezaId];
    if (!pieza) {
        toast('❌ Pieza no encontrada', '#ef4444');
        return;
    }

    document.getElementById('modalMovimientoKanban')?.remove();

    const stockActual = pieza.stockActual || 0;
    const critic = pieza.stockCritico || 5;

    const modal = document.createElement('div');
    modal.id = 'modalMovimientoKanban';
    modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

    let tipo = 'entrada';

    function renderModal() {
        const colorTipo = tipo === 'entrada' ? '#10b981' : tipo === 'salida' ? '#ef4444' : '#f59e0b';
        const textoBoton = tipo === 'entrada' ? '📥 Registrar entrada' : tipo === 'salida' ? '📤 Registrar salida' : '✏️ Ajustar stock';

        const colorStock = stockActual <= 0 ? '#ef4444' : stockActual <= critic ? '#f59e0b' : '#10b981';
        const iconoStock = stockActual <= 0 ? '🚫' : stockActual <= critic ? '⚠️' : '✅';

        modal.innerHTML = `
            <!-- CABECERA (estilo detalle de estación) -->
            <div style="background:white;border-bottom:1px solid #e5e7eb;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                    <div style="width:48px;height:48px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">📊</div>
                    <div style="min-width:0;">
                        <h2 style="margin:0;color:#1e293b;font-size:1.15rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Movimiento de stock</h2>
                        <div style="font-size:0.78rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            <span>${pieza.nombre || 'Sin nombre'}</span>
                            ${pieza.codigo ? `<span style="color:#cbd5e1;">·</span><span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#4338ca;background:#eef2ff;padding:1px 8px;border-radius:99px;font-weight:700;">${pieza.codigo}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button onclick="cerrarModalMovimientoKanban()" style="background:#f1f5f9;border:none;border-radius:10px;width:44px;height:44px;font-size:1.3rem;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
            </div>

            <!-- STOCK ACTUAL (barra resumen) -->
            <div style="background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;">
                <span style="font-size:0.85rem;color:#64748b;font-weight:700;">📦 Stock actual</span>
                <span style="font-size:1.1rem;font-weight:800;color:${colorStock};">
                    ${iconoStock} ${stockActual} uds
                </span>
            </div>

            <!-- CONTENIDO -->
            <div style="flex:1;overflow-y:auto;padding:1.5rem;background:#fafafa;">
                <div style="max-width:600px;margin:0 auto;display:flex;flex-direction:column;gap:16px;">

                    <!-- TIPO DE MOVIMIENTO -->
                    <div style="background:white;border-radius:14px;padding:1.2rem 1.4rem;border:1px solid #e5e7eb;">
                        <label style="display:block;font-size:0.8rem;font-weight:700;color:#1e293b;margin-bottom:12px;">
                            🏷️ Tipo de movimiento
                        </label>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                            ${[
                                { v: 'entrada', icono: '📥', label: 'Entrada', color: '#10b981' },
                                { v: 'salida', icono: '📤', label: 'Salida', color: '#ef4444' },
                                { v: 'ajuste', icono: '✏️', label: 'Ajuste', color: '#f59e0b' }
                            ].map(t => `
                                <button onclick="event.stopPropagation();setTipoMovimiento('${t.v}')"
                                    style="
                                        padding:14px 8px;
                                        border:2px solid ${tipo === t.v ? t.color : '#cbd5e1'};
                                        background:${tipo === t.v ? t.color + '15' : 'white'};
                                        border-radius:12px;
                                        cursor:pointer;
                                        font-family:inherit;
                                        font-weight:700;
                                        color:${tipo === t.v ? t.color : '#64748b'};
                                        display:flex;
                                        flex-direction:column;
                                        align-items:center;
                                        gap:6px;
                                        font-size:0.82rem;
                                        transition:all 0.15s ease;
                                    ">
                                    <span style="font-size:1.5rem;">${t.icono}</span>
                                    <span>${t.label}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- CANTIDAD -->
                    <div style="background:white;border-radius:14px;padding:1.2rem 1.4rem;border:1px solid #e5e7eb;">
                        <label style="display:block;font-size:0.8rem;font-weight:700;color:#1e293b;margin-bottom:8px;">
                            ${tipo === 'ajuste' ? '📏 Nuevo stock total' : '🔢 Cantidad'}
                        </label>
                        <input type="number" id="movKanbanCantidad"
                            value="${tipo === 'ajuste' ? stockActual : ''}"
                            min="0"
                            placeholder="0"
                            style="width:100%;padding:14px;border:2px solid ${colorTipo}40;border-radius:10px;font-size:1.3rem;font-weight:800;text-align:center;font-family:'SF Mono',Monaco,monospace;color:${colorTipo};background:${colorTipo}08;">
                        ${tipo === 'ajuste' ? `
                            <small style="color:#64748b;font-size:0.72rem;display:block;margin-top:6px;">
                                Se establecerá el stock a este valor absoluto.
                            </small>
                        ` : ''}
                    </div>

                    <!-- MOTIVO -->
                    <div style="background:white;border-radius:14px;padding:1.2rem 1.4rem;border:1px solid #e5e7eb;">
                        <label style="display:block;font-size:0.8rem;font-weight:700;color:#1e293b;margin-bottom:8px;">
                            💬 Motivo
                        </label>
                        <select id="movKanbanMotivo"
                            style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:0.9rem;font-family:inherit;font-weight:600;background:white;cursor:pointer;">
                            <option value="Reposición">📦 Reposición</option>
                            <option value="Devolución">↩️ Devolución</option>
                            <option value="Merma">💥 Merma</option>
                            <option value="Ajuste inventario">📋 Ajuste inventario</option>
                            <option value="Consumo manual">🔧 Consumo manual</option>
                            <option value="Otro">❓ Otro</option>
                        </select>
                    </div>

                    <!-- COMENTARIO -->
                    <div style="background:white;border-radius:14px;padding:1.2rem 1.4rem;border:1px solid #e5e7eb;">
                        <label style="display:block;font-size:0.8rem;font-weight:700;color:#1e293b;margin-bottom:8px;">
                            📝 Comentario (opcional)
                        </label>
                        <input type="text" id="movKanbanComentario"
                            placeholder="Ej: Pedido a almacén"
                            maxlength="120"
                            style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:0.88rem;font-family:inherit;">
                    </div>

                    <div style="height:1rem;"></div>
                </div>
            </div>

            <!-- PIE FIJO -->
            <div style="padding:14px 20px;border-top:1px solid #e5e7eb;background:white;flex-shrink:0;display:flex;justify-content:flex-end;gap:10px;box-shadow:0 -1px 3px rgba(0,0,0,0.05);">
                <button onclick="cerrarModalMovimientoKanban()"
                    style="padding:12px 20px;border:1px solid #e5e7eb;border-radius:10px;background:white;color:#64748b;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">
                    Cancelar
                </button>
                <button onclick="confirmarMovimientoKanban('${piezaId}')"
                    style="padding:12px 24px;border:none;border-radius:10px;background:${colorTipo};color:white;font-weight:700;cursor:pointer;font-size:0.9rem;font-family:inherit;display:flex;align-items:center;gap:6px;">
                    ${textoBoton}
                </button>
            </div>
        `;
    }

    window.setTipoMovimiento = function(nuevoTipo) {
        tipo = nuevoTipo;
        renderModal();
    };

    window.cerrarModalMovimientoKanban = function() {
        modal.remove();
        document.body.style.overflow = '';
        delete window.setTipoMovimiento;
        delete window.cerrarModalMovimientoKanban;
        delete window.confirmarMovimientoKanban;
    };

    window.confirmarMovimientoKanban = async function(pid) {
        const cantidadInput = document.getElementById('movKanbanCantidad');
        const motivo = document.getElementById('movKanbanMotivo')?.value || '';
        const comentario = (document.getElementById('movKanbanComentario')?.value || '').trim();

        const cantidad = parseInt(cantidadInput?.value) || 0;

        if (tipo !== 'ajuste' && cantidad <= 0) {
            toast('⚠️ La cantidad debe ser mayor que 0', '#f59e0b');
            return;
        }
        if (tipo === 'ajuste' && cantidad < 0) {
            toast('⚠️ El stock no puede ser negativo', '#f59e0b');
            return;
        }

        window.cerrarModalMovimientoKanban();

        const res = await registrarMovimientoKanban(pid, {
            tipo,
            cantidad,
            motivo,
            comentario
        });

        if (res) {
            toast(`✅ Movimiento registrado · Stock: ${res.stockAntes} → ${res.stockDespues}`, '#10b981', 2500);
            if (typeof cargarAdminPiezas === 'function') cargarAdminPiezas();
        } else {
            toast('❌ Error al registrar movimiento', '#ef4444');
        }
    };

    renderModal();
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('movKanbanCantidad')?.focus(), 100);
}

async function cargarMovimientosKanban() {
    const cont = document.getElementById('movKanbanLista');
    if (!cont) return;

    cont.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const movimientos = await cargarFirebase('movimientos_kanban', true);
    const arr = Object.entries(movimientos);

    const selPieza = document.getElementById('movKanbanFiltroPieza');
    if (selPieza && selPieza.options.length <= 1) {
        const piezasUnicas = {};
        arr.forEach(([id, m]) => {
            if (m.piezaId && !piezasUnicas[m.piezaId]) {
                piezasUnicas[m.piezaId] = m.piezaNombre || m.piezaCodigo || m.piezaId;
            }
        });

        Object.entries(piezasUnicas)
            .sort((a, b) => (a[1] || '').localeCompare(b[1] || ''))
            .forEach(([pid, nombre]) => {
                const opt = document.createElement('option');
                opt.value = pid;
                opt.textContent = `📦 ${nombre}`;
                selPieza.appendChild(opt);
            });
    }

    const selOp = document.getElementById('movKanbanFiltroOperario');
    if (selOp && selOp.options.length <= 1) {
        const operarios = [...new Set(arr.map(([id, m]) => m.operario).filter(Boolean))].sort();
        operarios.forEach(nombre => {
            const opt = document.createElement('option');
            opt.value = nombre;
            opt.textContent = `👤 ${nombre}`;
            selOp.appendChild(opt);
        });
    }

    const busqueda = (document.getElementById('movKanbanBusqueda')?.value || '').toLowerCase().trim();
    const filtroTipo = document.getElementById('movKanbanFiltroTipo')?.value || 'todos';
    const filtroPieza = document.getElementById('movKanbanFiltroPieza')?.value || 'todas';
    const filtroOperario = document.getElementById('movKanbanFiltroOperario')?.value || 'todos';
    const filtroFecha = document.getElementById('movKanbanFiltroFecha')?.value || 'todo';

    let lista = arr.slice();

    if (filtroTipo !== 'todos') {
        lista = lista.filter(([id, m]) => m.tipo === filtroTipo);
    }
    if (filtroPieza !== 'todas') {
        lista = lista.filter(([id, m]) => m.piezaId === filtroPieza);
    }
    if (filtroOperario !== 'todos') {
        lista = lista.filter(([id, m]) => m.operario === filtroOperario);
    }
    if (filtroFecha !== 'todo') {
        const ahora = new Date();
        lista = lista.filter(([id, m]) => {
            if (!m.fecha) return false;
            const f = new Date(m.fecha);
            const diffDias = (ahora - f) / (1000 * 60 * 60 * 24);
            if (filtroFecha === 'hoy') {
                return f.toISOString().split('T')[0] === ahora.toISOString().split('T')[0];
            }
            if (filtroFecha === 'semana') return diffDias <= 7;
            if (filtroFecha === 'mes') return diffDias <= 30;
            return true;
        });
    }
    if (busqueda) {
        lista = lista.filter(([id, m]) => {
            return (m.piezaNombre || '').toLowerCase().includes(busqueda) ||
                   (m.piezaCodigo || '').toLowerCase().includes(busqueda) ||
                   (m.operario || '').toLowerCase().includes(busqueda) ||
                   (m.montajeNombre || '').toLowerCase().includes(busqueda) ||
                   (m.numeroOperacion || '').toLowerCase().includes(busqueda) ||
                   (m.motivo || '').toLowerCase().includes(busqueda);
        });
    }

    lista.sort((a, b) => new Date(b[1].fecha || 0) - new Date(a[1].fecha || 0));

    const ahora = new Date();
    const hoyStr = ahora.toISOString().split('T')[0];

    const total = arr.length;
    const entradasHoy = arr.filter(([id, m]) =>
        m.tipo === 'entrada' && m.fecha && m.fecha.split('T')[0] === hoyStr
    ).length;
    const salidasHoy = arr.filter(([id, m]) =>
        m.tipo === 'salida' && m.fecha && m.fecha.split('T')[0] === hoyStr
    ).length;
    const piezasUnicas = new Set(arr.map(([id, m]) => m.piezaId).filter(Boolean)).size;

    document.getElementById('movKanbanStatTotal').textContent = total;
    document.getElementById('movKanbanStatEntradas').textContent = entradasHoy;
    document.getElementById('movKanbanStatSalidas').textContent = salidasHoy;
    document.getElementById('movKanbanStatPiezas').textContent = piezasUnicas;

    const contador = document.getElementById('movKanbanContador');
    if (contador) {
        contador.textContent = `${lista.length} movimiento${lista.length !== 1 ? 's' : ''}`;
    }

    if (!lista.length) {
        cont.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2rem;margin-bottom:8px;">📭</div>
                <div style="font-weight:600;color:#1e293b;margin-bottom:4px;">Sin movimientos</div>
                <div style="font-size:0.85rem;color:#94a3b8;">
                    ${busqueda || filtroTipo !== 'todos' || filtroPieza !== 'todas' || filtroOperario !== 'todos' || filtroFecha !== 'todo'
                        ? 'Prueba otros filtros'
                        : 'Aparecerán aquí los cambios de stock'}
                </div>
            </div>
        `;
        return;
    }

    cont.innerHTML = lista.map(([id, m]) => {
        const tipo = m.tipo || 'ajuste';
        const esEntrada = tipo === 'entrada';
        const esSalida = tipo === 'salida';

        const color = esEntrada ? '#10b981' : esSalida ? '#ef4444' : '#f59e0b';
        const bgColor = color + '08';
        const borderColor = color + '40';
        const icono = esEntrada ? '📥' : esSalida ? '📤' : '✏️';
        const tipoTexto = esEntrada ? 'ENTRADA' : esSalida ? 'SALIDA' : 'AJUSTE';

        const cantidadMostrar = m.cantidad > 0 ? `+${m.cantidad}` : `${m.cantidad}`;
        const tieneContexto = m.montajeNombre || m.numeroOperacion;
        const fecha = m.fecha ? new Date(m.fecha) : null;
        const fechaTexto = fecha ? fecha.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }) : '—';

        return `
            <div style="background:${bgColor};border:1px solid ${borderColor};border-left:4px solid ${color};border-radius:12px;padding:12px 16px;">

                <!-- CABECERA -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                        <span style="background:${color};color:white;padding:4px 12px;border-radius:99px;font-size:0.72rem;font-weight:800;letter-spacing:0.03em;display:inline-flex;align-items:center;gap:5px;flex-shrink:0;">
                            ${icono} ${tipoTexto}
                        </span>
                        <span style="font-family:'SF Mono',Monaco,monospace;font-size:1rem;font-weight:800;color:${color};flex-shrink:0;">
                            ${cantidadMostrar}
                        </span>
                    </div>
                    <span style="font-size:0.72rem;color:#94a3b8;font-weight:600;white-space:nowrap;">📅 ${fechaTexto}</span>
                </div>

                <!-- PIEZA + STOCK -->
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
                    <div style="flex:1;min-width:180px;">
                        <div style="font-weight:700;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${m.piezaNombre || 'Sin nombre'}
                        </div>
                        ${m.piezaCodigo ? `<div style="font-size:0.72rem;color:#64748b;font-family:'SF Mono',Monaco,monospace;margin-top:2px;">${m.piezaCodigo}</div>` : ''}
                    </div>
                    <div style="background:white;border:1px solid ${borderColor};border-radius:8px;padding:6px 12px;font-family:'SF Mono',Monaco,monospace;font-size:0.82rem;font-weight:700;color:#1e293b;flex-shrink:0;">
                        ${m.stockAntes} <span style="color:#94a3b8;">→</span> <span style="color:${color};">${m.stockDespues}</span>
                    </div>
                </div>

                <!-- INFO -->
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:0.72rem;color:#64748b;font-weight:600;">
                    ${m.motivo ? `<span style="background:${color}18;color:${color};padding:2px 10px;border-radius:99px;font-weight:700;">🏷️ ${m.motivo}</span>` : ''}
                    ${m.operario ? `<span>👤 ${m.operario}</span>` : ''}
                    ${tieneContexto ? `
                        <span style="color:#cbd5e1;">·</span>
                        <span>📦 ${m.montajeNombre || '—'} · Op. ${m.numeroOperacion || '—'}</span>
                    ` : ''}
                </div>

                ${m.comentario ? `
                    <div style="margin-top:8px;background:white;border-left:3px solid ${color};border-radius:6px;padding:8px 12px;font-size:0.75rem;color:#1e293b;font-style:italic;">
                        💬 "${m.comentario}"
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}
