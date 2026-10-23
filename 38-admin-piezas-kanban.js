async function abrirModalAvisoPieza(piezaId) {
    const piezas = await cargarFirebase('piezas_kanban', true);
    const pieza = piezas[piezaId];
    if (!pieza) {
        toast('❌ Pieza no encontrada', '#ef4444');
        return;
    }

    document.getElementById('modalAvisoPieza')?.remove();

    const mensajeActual = pieza.mensajeAdmin || '';
    const tieneAviso = !!mensajeActual;

    const modal = document.createElement('div');
    modal.id = 'modalAvisoPieza';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

    modal.innerHTML = `
        <div style="background:white;border-radius:18px;max-width:480px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">

            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:16px 20px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                        <span style="font-size:1.5rem;">💬</span>
                        <div style="min-width:0;">
                            <div style="font-weight:800;font-size:1rem;">Aviso en la pieza</div>
                            <div style="font-size:0.75rem;opacity:0.9;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                ${pieza.nombre || 'Sin nombre'}
                            </div>
                        </div>
                    </div>
                    <button onclick="cerrarModalAvisoPieza()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:36px;height:36px;border-radius:10px;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
                </div>
            </div>

            <div style="padding:16px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;">

                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;font-size:0.8rem;color:#92400e;line-height:1.5;">
                    💡 El operario verá este mensaje en la tarjeta de la pieza y en los montajes que la usen.<br>
                    Ej: <em>"Pedido a almacén · llega el 20/10"</em>
                </div>

                <div>
                    <label style="display:block;font-size:0.8rem;font-weight:700;color:#475569;margin-bottom:6px;">
                        Mensaje
                    </label>
                    <textarea id="avisoPiezaTexto" rows="4" maxlength="200"
                        placeholder="Escribe el aviso..."
                        style="width:100%;padding:12px 14px;border:2px solid #cbd5e1;border-radius:10px;font-size:0.9rem;font-family:inherit;resize:vertical;line-height:1.5;">${mensajeActual}</textarea>
                    <small style="color:#64748b;font-size:0.7rem;display:block;margin-top:4px;">
                        Máximo 200 caracteres.
                    </small>
                </div>

            </div>

            <div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;">
                <button onclick="cerrarModalAvisoPieza()"
                    style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:white;color:#64748b;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;min-width:120px;">
                    Cancelar
                </button>
                ${tieneAviso ? `
                    <button onclick="eliminarAvisoPieza('${piezaId}')"
                        style="padding:12px 16px;border:1px solid #fecaca;border-radius:10px;background:#fef2f2;color:#b91c1c;font-weight:700;cursor:pointer;font-size:0.82rem;font-family:inherit;">
                        🗑️ Quitar
                    </button>
                ` : ''}
                <button onclick="guardarAvisoPieza('${piezaId}')"
                    style="flex:2;padding:12px;border:none;border-radius:10px;background:#f59e0b;color:white;font-weight:700;cursor:pointer;font-size:0.9rem;font-family:inherit;min-width:140px;">
                    💾 Guardar aviso
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    window.cerrarModalAvisoPieza = function() {
        modal.remove();
        document.body.style.overflow = '';
        delete window.cerrarModalAvisoPieza;
        delete window.guardarAvisoPieza;
        delete window.eliminarAvisoPieza;
    };

    window.guardarAvisoPieza = async function(pid) {
        const texto = (document.getElementById('avisoPiezaTexto')?.value || '').trim();
        if (!texto) {
            toast('⚠️ Escribe un mensaje', '#f59e0b');
            return;
        }

        mostrarLoading('Guardando aviso...');
        await guardarFirebase('piezas_kanban', pid, {
            mensajeAdmin: texto,
            fechaMensajeAdmin: new Date().toISOString(),
            autorMensajeAdmin: window.APP.operario?.nombre || 'Admin'
        });
        ocultarLoading();

        toast('✅ Aviso guardado', '#10b981');
        window.cerrarModalAvisoPieza();
        if (typeof cargarAdminPiezas === 'function') cargarAdminPiezas();
    };

    window.eliminarAvisoPieza = async function(pid) {
        const ok = await confirmar(
            '¿Quitar el aviso de esta pieza?',
            { titulo: '🗑️ Quitar aviso', tipo: 'warning', okTexto: '🗑️ Quitar' }
        );
        if (!ok) return;

        mostrarLoading('Quitando aviso...');
        await guardarFirebase('piezas_kanban', pid, {
            mensajeAdmin: '',
            fechaMensajeAdmin: null,
            autorMensajeAdmin: ''
        });
        ocultarLoading();

        toast('🗑️ Aviso eliminado', '#10b981');
        window.cerrarModalAvisoPieza();
        if (typeof cargarAdminPiezas === 'function') cargarAdminPiezas();
    };

    setTimeout(() => document.getElementById('avisoPiezaTexto')?.focus(), 100);
}

async function cargarAdminPiezas() {
    const container = document.getElementById('adminPiezasList');
    const contador = document.getElementById('adminPiezasContador');
    if (!container) return;

    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">⏳ Cargando...</div>';

    const piezas = await cargarFirebase('piezas_kanban', true);
    const busqueda = (document.getElementById('adminPiezasBusqueda')?.value || '').toLowerCase().trim();
    const filtroStock = document.getElementById('filtroStockAdminPiezas')?.value || 'todos';

    let arr = Object.entries(piezas);

    if (filtroStock !== 'todos') {
        arr = arr.filter(([id, p]) => {
            const stock = p.stockActual ?? 0;
            const critico = p.stockCritico ?? 5;
            if (filtroStock === 'criticos') return stock <= critico && stock > 0;
            if (filtroStock === 'agotados') return stock === 0;
            if (filtroStock === 'ok') return stock > critico;
            return true;
        });
    }

    if (busqueda) {
        arr = arr.filter(([id, p]) =>
            (p.nombre || '').toLowerCase().includes(busqueda) ||
            (p.codigo || '').toLowerCase().includes(busqueda) ||
            (p.ubicacion || '').toLowerCase().includes(busqueda)
        );
    }

arr.sort((a, b) => {
    const stockA = a[1].stockActual || 0;
    const stockB = b[1].stockActual || 0;
    const criticoA = a[1].stockCritico || 5;
    const criticoB = b[1].stockCritico || 5;

    const pesoA = stockA === 0 ? 0 : (stockA <= criticoA ? 1 : 2);
    const pesoB = stockB === 0 ? 0 : (stockB <= criticoB ? 1 : 2);

    if (pesoA !== pesoB) return pesoA - pesoB;

    return (a[1].nombre || '').localeCompare(b[1].nombre || '');
});

    if (contador) contador.textContent = `${arr.length} pieza${arr.length !== 1 ? 's' : ''}`;

    if (!arr.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                ${busqueda ? '🔍 Sin resultados para "' + busqueda + '"' : '📭 No hay piezas. Crea la primera.'}
            </div>
        `;
        return;
    }

    container.innerHTML = arr.map(([id, p]) => {
        const stock = p.stockActual ?? 0;
        const critico = p.stockCritico ?? 5;
        const estaAgotado = stock === 0;
        const estaCritico = stock <= critico && stock > 0;
        const estaOk = stock > critico;

        let color, colorBg, colorBorder, iconoStock;
        if (estaAgotado) {
            color = '#ef4444'; colorBg = color + '10'; colorBorder = color + '50'; iconoStock = '🚫';
        } else if (estaCritico) {
            color = '#f59e0b'; colorBg = color + '10'; colorBorder = color + '50'; iconoStock = '⚠️';
        } else {
            color = '#10b981'; colorBg = color + '10'; colorBorder = color + '50'; iconoStock = '✅';
        }

        return `
       <div data-pieza-id="${id}"
    onclick="editarPiezaAdmin('${id}')"
    style="background:white;border:1px solid ${colorBorder};border-left:4px solid ${color};border-radius:14px;padding:14px 16px;cursor:pointer;transition:all 0.2s ease;position:relative;overflow:hidden;"
                onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px ${color}22';"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='';">

           <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
    <span style="background:${colorBg};color:${color};padding:4px 8px;border-radius:8px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;gap:4px;border:1px solid ${colorBorder};">
        ${iconoStock} ${stock} uds
    </span>
    ${p.mensajeAdmin ? `
        <span title="Aviso activo" style="background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:8px;font-size:0.65rem;font-weight:800;border:1px solid #fde68a;display:inline-flex;align-items:center;gap:3px;">
            💬 Aviso
        </span>
    ` : ''}
</div>>
 <div style="display:flex;gap:4px;flex-wrap:wrap;">
    <button onclick="event.stopPropagation();abrirModalAvisoPieza('${id}')"
        style="background:${p.mensajeAdmin ? '#fef3c7' : 'white'};border:1px solid ${p.mensajeAdmin ? '#fde68a' : '#cbd5e1'};border-radius:6px;padding:4px 10px;font-size:0.72rem;color:${p.mensajeAdmin ? '#92400e' : '#64748b'};cursor:pointer;font-family:inherit;font-weight:700;"
        onmouseover="this.style.background='${p.mensajeAdmin ? '#fde68a' : '#f1f5f9'}'" onmouseout="this.style.background='${p.mensajeAdmin ? '#fef3c7' : 'white'}'"
        title="${p.mensajeAdmin ? 'Aviso activo · Pulsa para editar' : 'Añadir aviso'}">💬${p.mensajeAdmin ? ' ✓' : ''}</button>
    <button onclick="event.stopPropagation();abrirModalMovimientoKanban('${id}')"
        style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:4px 10px;font-size:0.72rem;color:#4338ca;cursor:pointer;font-family:inherit;font-weight:700;"
        onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='#eef2ff'"
        title="Registrar movimiento">📊</button>
    <button onclick="event.stopPropagation();duplicarPiezaAdmin('${id}')"
        style="background:white;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.7rem;color:#64748b;cursor:pointer;font-family:inherit;font-weight:600;"
        onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">📋</button>
</div>
</div>

                <div style="font-weight:700;font-size:0.95rem;color:#1e293b;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🔗 ${p.nombre || 'Sin nombre'}</div>

                ${p.codigo ? `
                    <div style="font-size:0.75rem;color:${color};font-family:'SF Mono',Monaco,monospace;font-weight:600;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.codigo}</div>
                ` : `
                    <div style="font-size:0.75rem;color:#cbd5e1;font-style:italic;margin-bottom:8px;">Sin código</div>
                `}

                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid #f1f5f9;">
                    <span style="font-size:0.72rem;color:${p.ubicacion ? '#64748b' : '#94a3b8'};font-weight:600;display:flex;align-items:center;gap:4px;">📍 ${p.ubicacion || 'Sin ubicación'}</span>
                    <span style="font-size:0.7rem;color:${color};font-weight:700;">mín: ${critico}</span>
                </div>
            </div>
        `;
    }).join('');
}

function mostrarFormNuevaPieza() {
    document.getElementById('adminPiezasForm').style.display = 'block';
    document.getElementById('adminPiezaFormTitulo').textContent = 'Nueva Pieza';

    document.getElementById('adminPiezaId').value = '';
    document.getElementById('adminPiezaNombre').value = '';
    document.getElementById('adminPiezaCodigo').value = '';
    document.getElementById('adminPiezaUbicacion').value = '';
    document.getElementById('adminPiezaStockActual').value = '0';
    document.getElementById('adminPiezaStockCritico').value = '5';
    document.getElementById('btnEliminarPieza').style.display = 'none';

    actualizarPreviewPieza();

    document.getElementById('adminPiezasForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('adminPiezaNombre').focus(), 300);
}

function editarPiezaAdmin(id) {
    cargarFirebase('piezas_kanban').then(piezas => {
        const p = piezas[id];
        if (!p) return;

        document.getElementById('adminPiezasForm').style.display = 'block';
        document.getElementById('adminPiezaFormTitulo').textContent = 'Editar Pieza';

        document.getElementById('adminPiezaId').value = id;
        document.getElementById('adminPiezaNombre').value = p.nombre || '';
        document.getElementById('adminPiezaCodigo').value = p.codigo || '';
        document.getElementById('adminPiezaUbicacion').value = p.ubicacion || '';
        document.getElementById('adminPiezaStockActual').value = p.stockActual ?? 0;
        document.getElementById('adminPiezaStockCritico').value = p.stockCritico ?? 5;

        document.getElementById('btnEliminarPieza').style.display = 'inline-flex';

        actualizarPreviewPieza();

        document.getElementById('adminPiezasForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function cerrarFormPieza() {
    document.getElementById('adminPiezasForm').style.display = 'none';
    document.getElementById('adminPiezaId').value = '';
    document.getElementById('adminPiezaNombre').value = '';
    document.getElementById('adminPiezaCodigo').value = '';
    document.getElementById('adminPiezaUbicacion').value = '';
    document.getElementById('adminPiezaStockActual').value = '0';
    document.getElementById('adminPiezaStockCritico').value = '5';
    document.getElementById('btnEliminarPieza').style.display = 'none';
}

function actualizarPreviewPieza() {
    const preview = document.getElementById('adminPiezaPreview');
    if (!preview) return;

    const nombre = document.getElementById('adminPiezaNombre')?.value || 'Sin nombre';
    const codigo = document.getElementById('adminPiezaCodigo')?.value || '';
    const ubicacion = document.getElementById('adminPiezaUbicacion')?.value || '';
    const stock = parseInt(document.getElementById('adminPiezaStockActual')?.value) || 0;
    const critico = parseInt(document.getElementById('adminPiezaStockCritico')?.value) || 5;

    const estaAgotado = stock === 0;
    const estaCritico = stock <= critico && stock > 0;
    const estaOk = stock > critico;

    let color, iconoStock;
    if (estaAgotado) { color = '#ef4444'; iconoStock = '🚫'; }
    else if (estaCritico) { color = '#f59e0b'; iconoStock = '⚠️'; }
    else { color = '#10b981'; iconoStock = '✅'; }

    preview.innerHTML = `
        <div style="width:40px;height:40px;background:${color}15;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">🔗</div>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${nombre}
                ${codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#64748b;font-weight:400;">(${codigo})</span>` : ''}
            </div>
            <div style="font-size:0.75rem;color:${color};font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap;">
                <span>${iconoStock} ${stock} uds</span>
                <span style="color:#cbd5e1;">·</span>
                <span style="color:#64748b;font-weight:400;">mín: ${critico}</span>
                ${ubicacion ? `<span style="color:#cbd5e1;">·</span><span style="color:#64748b;font-weight:400;">📍 ${ubicacion}</span>` : ''}
            </div>
        </div>
    `;
}

async function guardarPiezaAdmin() {
    const id = document.getElementById('adminPiezaId').value || 'pieza_' + Date.now();
    const nombre = document.getElementById('adminPiezaNombre').value.trim();
    const codigo = document.getElementById('adminPiezaCodigo').value.trim();
    const ubicacion = document.getElementById('adminPiezaUbicacion').value.trim();
    const stockActual = parseInt(document.getElementById('adminPiezaStockActual').value) || 0;
    const stockCritico = parseInt(document.getElementById('adminPiezaStockCritico').value) || 0;

    if (!nombre) { alertar('El nombre es obligatorio', { tipo: 'warning' }); return; }
    if (!codigo) { alertar('El código es obligatorio', { tipo: 'warning' }); return; }
    if (nombre.length < 2) { alertar('El nombre es demasiado corto', { tipo: 'warning' }); return; }

const piezas = await cargarFirebase('piezas_kanban');

const duplicadoCodigo = Object.entries(piezas).find(([oid, p]) =>
    oid !== id && (p.codigo || '').toLowerCase().trim() === codigo.toLowerCase().trim()
);
if (duplicadoCodigo) {
    alertar(
        `⚠️ Ya existe una pieza con el código "${codigo}".\n\nPieza existente: "${duplicadoCodigo[1].nombre}"`,
        { titulo: '🔍 Código duplicado', tipo: 'warning' }
    );
    return;
}

const duplicadoNombre = Object.entries(piezas).find(([oid, p]) =>
    oid !== id && (p.nombre || '').toLowerCase().trim() === nombre.toLowerCase().trim()
);
if (duplicadoNombre) {
    const ok = await confirmar(
        `⚠️ Ya existe una pieza con el nombre "${nombre}" (código: ${duplicadoNombre[1].codigo || '—'}).\n\n¿Quieres crearla igualmente?`,
        { titulo: '🔍 Nombre duplicado', tipo: 'warning', okTexto: '💾 Crear igual' }
    );
    if (!ok) return;
}

    const data = {
        nombre: nombre,
        codigo: codigo,
        ubicacion: ubicacion,
        stockActual: stockActual,
        stockCritico: stockCritico
    };

    mostrarLoading('Guardando pieza...');
    const ok = await guardarFirebase('piezas_kanban', id, data);
    ocultarLoading();

    if (ok) {
        toast('✅ Pieza guardada', '#10b981');
        cerrarFormPieza();
        cargarAdminPiezas();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function duplicarPiezaAdmin(id) {
    const piezas = await cargarFirebase('piezas_kanban');
    const p = piezas[id];
    if (!p) return;

    const nombreOriginal = p.nombre || 'Sin nombre';
    const nuevoNombre = await preguntar(
        `Duplicar pieza "${nombreOriginal}"\n\nEscribe el nombre de la nueva pieza:`,
        `${nombreOriginal} (copia)`
    );
    if (!nuevoNombre) return;

    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) { alertar('El nombre no puede estar vacío', { tipo: 'warning' }); return; }

    const nuevoId = 'pieza_' + Date.now();

    mostrarLoading('Duplicando pieza...');
    const ok = await guardarFirebase('piezas_kanban', nuevoId, {
        nombre: nombreLimpio,
        codigo: (p.codigo || '') + '-COPIA',
        ubicacion: p.ubicacion || '',
        stockActual: 0,
        stockCritico: p.stockCritico ?? 5
    });
    ocultarLoading();

    if (ok) {
        toast(`✅ Pieza duplicada: ${nombreLimpio}`, '#10b981');
        cargarAdminPiezas();
    } else {
        toast('❌ Error al duplicar', '#ef4444');
    }
}

async function eliminarPiezaAdmin() {
    const id = document.getElementById('adminPiezaId').value;
    if (!id) return;

    const nombre = document.getElementById('adminPiezaNombre').value || 'esta pieza';

    const montajes = await cargarFirebase('montajes');
    const montajesQueLaUsan = Object.values(montajes).filter(m => {
        if (!m.piezasKanban) return false;
        return m.piezasKanban.split(',').some(item => {
            const cod = item.trim().split('=')[0];
            return cod === document.getElementById('adminPiezaCodigo').value;
        });
    });

    if (montajesQueLaUsan.length > 0) {
        const ok = await confirmar(
            `⚠️ "${nombre}" está siendo usada en ${montajesQueLaUsan.length} montaje(s).\n\nSi la eliminas, esos montajes quedarán sin nombre para esa pieza.\n\n¿Estás seguro?`,
            { titulo: '⚠️ Eliminar pieza usada', tipo: 'danger', okTexto: '🗑️ Eliminar de todas formas' }
        );
        if (!ok) return;
    } else {
        const ok = await confirmar(
            `¿Eliminar la pieza "${nombre}"?\n\nEsta acción no se puede deshacer.`,
            { titulo: '🗑️ Eliminar pieza', tipo: 'danger', okTexto: '🗑️ Eliminar' }
        );
        if (!ok) return;
    }

    mostrarLoading('Eliminando...');
    const eliminado = await eliminarFirebase('piezas_kanban', id);
    ocultarLoading();

    if (eliminado) {
        toast('🗑️ Pieza eliminada', '#10b981');
        cerrarFormPieza();
        cargarAdminPiezas();
    } else {
        toast('❌ Error al eliminar', '#ef4444');
    }
}
