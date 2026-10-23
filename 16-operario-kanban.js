async function cargarKanbanOperario() {
    const container = document.getElementById('kanbanContainer');
    if (!container) return;

    container.innerHTML = '<div class="empty-state">⏳ Cargando piezas Kanban...</div>';

    const piezas = await cargarFirebase('piezas_kanban', true);
const arr = Object.entries(piezas).sort((a, b) => {
    const stockA = a[1].stockActual || 0;
    const stockB = b[1].stockActual || 0;
    const criticoA = a[1].stockCritico || 5;
    const criticoB = b[1].stockCritico || 5;

    const pesoA = stockA === 0 ? 0 : (stockA <= criticoA ? 1 : 2);
    const pesoB = stockB === 0 ? 0 : (stockB <= criticoB ? 1 : 2);

    if (pesoA !== pesoB) return pesoA - pesoB;

    return (a[1].nombre || '').localeCompare(b[1].nombre || '');
});

    if (!arr.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2.5rem;margin-bottom:10px;">📦</div>
                <div>No hay piezas en el Kanban</div>
                <div style="font-size:0.8rem;color:#94a3b8;margin-top:6px;">El admin debe crearlas primero</div>
            </div>`;
        return;
    }

const total = arr.length;
const criticos = arr.filter(([id, p]) => {
    const stock = p.stockActual || 0;
    const critico = p.stockCritico || 5;
    return stock > 0 && stock <= critico;
}).length;
const agotados = arr.filter(([id, p]) => (p.stockActual || 0) === 0).length;

let html = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:1.2rem;">
          <div style="background:linear-gradient(135deg,#fff7ed,white);border:1px solid #fed7aa;border-radius:14px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">⚠️</div>
            <div style="font-size:1.6rem;font-weight:800;color:#b91c1c;line-height:1;">${criticos}</div>
            <div style="font-size:0.72rem;color:#b91c1c;font-weight:600;margin-top:4px;">Stock crítico</div>
        </div>
      <div style="background:linear-gradient(135deg,#fef2f2,white);border:1px solid #fecaca;border-radius:14px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">🚫</div>
            <div style="font-size:1.6rem;font-weight:800;color:#c2410c;line-height:1;">${agotados}</div>
            <div style="font-size:0.72rem;color:#c2410c;font-weight:600;margin-top:4px;">Agotados</div>
        </div>
    </div>

        <div style="margin-bottom:1rem;">
            <input type="text" id="kanbanBusqueda" placeholder="🔍 Buscar pieza por nombre o código..."
                oninput="filtrarKanbanOperario()"
                style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:0.85rem;font-family:inherit;">
        </div>

        <div id="kanbanListaPiezas" style="display:flex;flex-direction:column;gap:8px;">
    `;

    arr.forEach(([id, p]) => {
        const stock = p.stockActual || 0;
        const critico = p.stockCritico || 5;
        const estaCritico = stock <= critico;
        const estaAgotado = stock === 0;
        const color = estaAgotado ? '#ef4444' : estaCritico ? '#f59e0b' : '#10b981';
        const emoji = estaAgotado ? '🚫' : estaCritico ? '⚠️' : '✅';

        const tieneAviso = !!p.mensajeAdmin;
const borderIzq = tieneAviso ? '#f59e0b' : color;

html += `
    <div class="kanban-item" data-busqueda="${(p.nombre + ' ' + (p.codigo||'')).toLowerCase()}"
        style="background:white;border:1px solid #e5e7eb;border-left:4px solid ${borderIzq};border-radius:12px;padding:12px 14px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="width:40px;height:40px;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${emoji}</div>
            <div style="flex:1;min-width:140px;">
                <div style="font-weight:700;font-size:0.9rem;color:#1e293b;">${p.nombre || 'Sin nombre'}</div>
                <div style="font-size:0.72rem;color:#64748b;font-family:'SF Mono',Monaco,monospace;margin-top:2px;">
                    ${p.codigo || '—'} · 📍 ${p.ubicacion || 'Sin ubicación'}
                </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:1.3rem;font-weight:800;color:${color};line-height:1;">${stock}</div>
                <div style="font-size:0.68rem;color:#94a3b8;font-weight:600;">mín: ${critico}</div>
            </div>
        </div>
        <div style="margin-top:10px;display:flex;justify-content:flex-end;">
            <button onclick="abrirModalPiezaDefectuosa('${id}')"
                style="background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:10px;padding:8px 14px;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;">
                🛠️ Pieza defectuosa
            </button>
        </div>
        ${tieneAviso ? `
            <div style="margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;display:flex;align-items:flex-start;gap:8px;">
                <span style="font-size:1rem;flex-shrink:0;">💬</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.7rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">Aviso del admin</div>
                    <div style="font-size:0.82rem;color:#78350f;line-height:1.4;font-weight:500;">${p.mensajeAdmin}</div>
                </div>
            </div>
        ` : ''}
    </div>
`;
    });

    html += '</div>';
    container.innerHTML = html;
}

function filtrarKanbanOperario() {
    const q = (document.getElementById('kanbanBusqueda')?.value || '').toLowerCase().trim();
    document.querySelectorAll('.kanban-item').forEach(el => {
        const coincide = !q || (el.dataset.busqueda || '').includes(q);
        el.style.display = coincide ? 'block' : 'none';
    });
}

async function abrirModalPiezaDefectuosa(piezaId) {
    const piezas = await cargarFirebase('piezas_kanban', true);
    const pieza = piezas[piezaId];
    if (!pieza) {
        toast('❌ Pieza no encontrada', '#ef4444');
        return;
    }

    const stock = pieza.stockActual || 0;
    if (stock <= 0) {
        toast('⚠️ Esta pieza no tiene stock que descontar', '#f59e0b');
        return;
    }

    document.getElementById('modalPiezaDefectuosa')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modalPiezaDefectuosa';
    modal.dataset.piezaId = piezaId;
    modal.dataset.stock = stock;
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
    modal.onclick = (e) => { if (e.target === modal) cerrarModalPiezaDefectuosa(); };

    const tipos = ['Golpe o rotura', 'Medidas incorrectas', 'Soldadura defectuosa', 'Acabado / pintura', 'Material dañado', 'Otro'];

    modal.innerHTML = `
        <div style="background:white;width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom, 0px));max-height:92vh;overflow-y:auto;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px;">
                <div style="min-width:0;">
                    <div style="font-size:1.1rem;font-weight:800;color:#b91c1c;">🛠️ Pieza defectuosa</div>
                    <div style="font-size:0.82rem;color:#475569;margin-top:4px;font-weight:600;">${pieza.nombre || 'Sin nombre'}${pieza.codigo ? ' · ' + pieza.codigo : ''}</div>
                </div>
                <button onclick="cerrarModalPiezaDefectuosa()" style="background:#f1f5f9;border:none;border-radius:10px;width:40px;height:40px;font-size:1.2rem;cursor:pointer;flex-shrink:0;">✕</button>
            </div>

            <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <span style="font-size:0.82rem;color:#64748b;font-weight:700;">📦 Stock actual</span>
                <span style="font-size:1.05rem;font-weight:800;color:#1e293b;">${stock} uds</span>
            </div>

            <label style="display:block;font-size:0.8rem;font-weight:700;color:#1e293b;margin-bottom:6px;">🔢 Cantidad defectuosa</label>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                <button onclick="cambiarCantidadDefectuosa(-1)" style="width:52px;height:52px;border:1px solid #cbd5e1;background:white;border-radius:12px;font-size:1.6rem;font-weight:700;cursor:pointer;">−</button>
                <input type="number" id="defCantidad" value="1" min="1" max="${stock}" inputmode="numeric" oninput="actualizarPreviewDefectuosa()"
                    style="flex:1;min-width:0;height:52px;text-align:center;font-size:1.4rem;font-weight:800;border:2px solid #fecaca;border-radius:12px;font-family:inherit;">
                <button onclick="cambiarCantidadDefectuosa(1)" style="width:52px;height:52px;border:1px solid #cbd5e1;background:white;border-radius:12px;font-size:1.6rem;font-weight:700;cursor:pointer;">+</button>
            </div>

            <label style="display:block;font-size:0.8rem;font-weight:700;color:#1e293b;margin-bottom:6px;">⚠️ Tipo de defecto</label>
            <select id="defTipo" style="width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font-size:0.9rem;font-family:inherit;margin-bottom:14px;background:white;">
                ${tipos.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>

            <label style="display:block;font-size:0.8rem;font-weight:700;color:#1e293b;margin-bottom:6px;">💬 Comentario (opcional)</label>
            <textarea id="defComentario" rows="2" maxlength="200" placeholder="Describe brevemente el defecto"
                style="width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font-size:0.9rem;font-family:inherit;margin-bottom:14px;resize:none;box-sizing:border-box;"></textarea>

            <div id="defPreview" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;font-size:0.85rem;font-weight:700;color:#b91c1c;text-align:center;margin-bottom:16px;"></div>

            <div style="display:flex;gap:10px;">
                <button onclick="cerrarModalPiezaDefectuosa()" style="flex:1;padding:14px;border:1px solid #cbd5e1;background:white;border-radius:12px;font-size:0.9rem;font-weight:700;cursor:pointer;font-family:inherit;color:#475569;">Cancelar</button>
                <button id="defBtnConfirmar" onclick="confirmarPiezaDefectuosa()" style="flex:1.4;padding:14px;border:none;background:#ef4444;color:white;border-radius:12px;font-size:0.9rem;font-weight:800;cursor:pointer;font-family:inherit;">Descontar del stock</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    actualizarPreviewDefectuosa();
}

function cambiarCantidadDefectuosa(delta) {
    const modal = document.getElementById('modalPiezaDefectuosa');
    const input = document.getElementById('defCantidad');
    if (!modal || !input) return;
    const stock = parseInt(modal.dataset.stock) || 1;
    const actual = parseInt(input.value) || 1;
    input.value = Math.min(stock, Math.max(1, actual + delta));
    actualizarPreviewDefectuosa();
}

function actualizarPreviewDefectuosa() {
    const modal = document.getElementById('modalPiezaDefectuosa');
    const preview = document.getElementById('defPreview');
    if (!modal || !preview) return;
    const stock = parseInt(modal.dataset.stock) || 0;
    const cantidad = parseInt(document.getElementById('defCantidad')?.value) || 0;
    if (cantidad <= 0) {
        preview.textContent = 'Indica una cantidad mayor que 0';
    } else if (cantidad > stock) {
        preview.textContent = `Solo hay ${stock} uds en stock`;
    } else {
        preview.textContent = `Stock: ${stock} → ${stock - cantidad}`;
    }
}

function cerrarModalPiezaDefectuosa() {
    document.getElementById('modalPiezaDefectuosa')?.remove();
}

async function confirmarPiezaDefectuosa() {
    const modal = document.getElementById('modalPiezaDefectuosa');
    if (!modal) return;

    const piezaId = modal.dataset.piezaId;
    const stock = parseInt(modal.dataset.stock) || 0;
    const cantidad = parseInt(document.getElementById('defCantidad')?.value) || 0;
    const tipoDefecto = document.getElementById('defTipo')?.value || 'Otro';
    const comentario = (document.getElementById('defComentario')?.value || '').trim();

    if (cantidad <= 0) {
        toast('⚠️ La cantidad debe ser mayor que 0', '#f59e0b');
        return;
    }
    if (cantidad > stock) {
        toast(`⚠️ Solo hay ${stock} uds en stock`, '#f59e0b');
        return;
    }

    const btn = document.getElementById('defBtnConfirmar');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Guardando...';
    }

    const operacionId = window.APP.operacionActiva || '';
    let numeroOperacion = '';
    if (operacionId) {
        try {
            const operaciones = await cargarFirebase('operaciones');
            numeroOperacion = operaciones[operacionId]?.numero || '';
        } catch (e) {}
    }

    const res = await registrarMovimientoKanban(piezaId, {
        tipo: 'salida',
        cantidad,
        motivo: 'Pieza defectuosa',
        comentario: comentario ? `${tipoDefecto} — ${comentario}` : tipoDefecto,
        contexto: { operacionId, numeroOperacion }
    });

    cerrarModalPiezaDefectuosa();

    if (res) {
        toast(`✅ Defectuosa registrada · Stock: ${res.stockAntes} → ${res.stockDespues}`, '#10b981', 2500);
        const busqueda = document.getElementById('kanbanBusqueda')?.value || '';
        await cargarKanbanOperario();
        const inputBusqueda = document.getElementById('kanbanBusqueda');
        if (inputBusqueda && busqueda) {
            inputBusqueda.value = busqueda;
            filtrarKanbanOperario();
        }
    } else {
        toast('❌ Error al registrar la pieza defectuosa', '#ef4444');
    }
}
