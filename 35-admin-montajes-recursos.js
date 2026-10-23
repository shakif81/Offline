function añadirTornilleriaMontaje() {
    const sel = document.getElementById('adminMontajeTornSelector');
    const inp = document.getElementById('adminMontajeTornCantidad');

    if (!sel || !sel.value) {
        toast('⚠️ Selecciona un tipo de tornillería', '#f59e0b');
        return;
    }

    const ref = sel.value;
const opt = sel.options[sel.selectedIndex];
const nombre = opt.dataset.nombre || ref;
const codigo = opt.dataset.codigo || '';
const cantidad = parseInt(inp.value) || 1;

    if (cantidad <= 0) {
        toast('⚠️ La cantidad debe ser mayor que 0', '#f59e0b');
        return;
    }

    const rec = window.APP.adminMontajeActual;

    const existente = rec.tornilleria.find(t => t.ref === ref);
if (existente) {
    existente.cantidad += cantidad;
} else {
    rec.tornilleria.push({ ref, nombre, codigo, cantidad });
}

    sel.value = '';
    inp.value = '1';

    renderTornilleriaMontaje();
    toast('✅ Tornillería añadida', '#10b981', 1500);
}

function renderTornilleriaMontaje() {
    const cont = document.getElementById('adminMontajeTornLista');
    if (!cont) return;

    const rec = window.APP.adminMontajeActual || { tornilleria: [] };
    const items = rec.tornilleria || [];

    if (!items.length) {
        cont.innerHTML = `
            <div style="text-align:center;padding:1rem;color:#94a3b8;font-size:0.8rem;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;">
                Sin tornillería asignada
            </div>
        `;
        actualizarPreviewMontaje();
        return;
    }

    cont.innerHTML = items.map((t, idx) => `
        <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.1rem;">🔩</span>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:0.85rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.nombre}</div>
                ${t.codigo ? `
                    <div style="font-size:0.7rem;color:#7c3aed;font-family:'SF Mono',Monaco,monospace;margin-top:2px;">${t.codigo}</div>
                ` : ''}
            </div>
            <input type="number" value="${t.cantidad}" min="1"
                onchange="cambiarCantidadTornilleria(${idx}, this.value)"
                style="width:70px;padding:6px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.8rem;text-align:center;font-weight:700;color:#6d28d9;font-family:inherit;">
            <button type="button" onclick="quitarTornilleriaMontaje(${idx})"
                style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;width:30px;height:30px;cursor:pointer;color:#b91c1c;font-size:0.9rem;display:flex;align-items:center;justify-content:center;"
                title="Quitar">✕</button>
        </div>
    `).join('');

    actualizarPreviewMontaje();
}

function cambiarCantidadTornilleria(idx, valor) {
    const rec = window.APP.adminMontajeActual;
    if (!rec.tornilleria[idx]) return;
    const cant = parseInt(valor) || 1;
    rec.tornilleria[idx].cantidad = Math.max(1, cant);
}

function quitarTornilleriaMontaje(idx) {
    const rec = window.APP.adminMontajeActual;
    if (!rec.tornilleria[idx]) return;
    rec.tornilleria.splice(idx, 1);
    renderTornilleriaMontaje();
}

function añadirMaterialMontaje() {
    const sel = document.getElementById('adminMontajeMatSelector');
    const inp = document.getElementById('adminMontajeMatCantidad');

    if (!sel || !sel.value) {
        toast('⚠️ Selecciona un material', '#f59e0b');
        return;
    }

    const ref = sel.value;
    const opt = sel.options[sel.selectedIndex];
    const nombre = opt.dataset.nombre || ref;
    const codigo = opt.dataset.codigo || '';
    const requiereEscaneo = opt.dataset.requiereEscaneo === '1';
    const cantidad = parseInt(inp.value) || 1;

    if (cantidad <= 0) {
        toast('⚠️ La cantidad debe ser mayor que 0', '#f59e0b');
        return;
    }

    const rec = window.APP.adminMontajeActual;

    const existente = rec.materiales.find(m => m.ref === ref);
    if (existente) {
        existente.cantidad += cantidad;
    } else {
        rec.materiales.push({ ref, nombre, codigo, requiereEscaneo, cantidad });
    }

    sel.value = '';
    inp.value = '1';

    renderMaterialesMontaje();
    toast('✅ Material añadido', '#10b981', 1500);
}

function renderMaterialesMontaje() {
    const cont = document.getElementById('adminMontajeMatLista');
    if (!cont) return;

    const rec = window.APP.adminMontajeActual || { materiales: [] };
    const items = rec.materiales || [];

    if (!items.length) {
        cont.innerHTML = `
            <div style="text-align:center;padding:1rem;color:#94a3b8;font-size:0.8rem;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;">
                Sin materiales asignados
            </div>
        `;
        actualizarPreviewMontaje();
        return;
    }

    const normales = items.map((m, i) => ({ ...m, idx: i })).filter(m => !m.requiereEscaneo);
    const escaneo = items.map((m, i) => ({ ...m, idx: i })).filter(m => m.requiereEscaneo);

    const renderItem = (m) => `
    <div style="background:${m.requiereEscaneo ? '#eff6ff' : '#fffbf5'};border:1px solid ${m.requiereEscaneo ? '#bfdbfe' : '#fed7aa'};border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.1rem;">${m.requiereEscaneo ? '📷' : '🧪'}</span>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.85rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.nombre}</div>
            ${m.codigo ? `
                <div style="font-size:0.7rem;color:${m.requiereEscaneo ? '#1d4ed8' : '#c2410c'};font-family:'SF Mono',Monaco,monospace;margin-top:2px;">${m.codigo}</div>
            ` : ''}
        </div>
        <input type="number" value="${m.cantidad}" min="1"
            onchange="cambiarCantidadMaterial(${m.idx}, this.value)"
            style="width:70px;padding:6px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.8rem;text-align:center;font-weight:700;color:${m.requiereEscaneo ? '#1d4ed8' : '#f97316'};font-family:inherit;">
        <button type="button" onclick="quitarMaterialMontaje(${m.idx})"
            style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;width:30px;height:30px;cursor:pointer;color:#b91c1c;font-size:0.9rem;display:flex;align-items:center;justify-content:center;"
            title="Quitar">✕</button>
    </div>
`;

    let html = '';

    if (normales.length) {
        html += `
            <div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">
                🧪 Materiales normales (${normales.length})
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
                ${normales.map(renderItem).join('')}
            </div>
        `;
    }

    if (escaneo.length) {
        html += `
            <div style="font-size:0.72rem;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">
                📷 Requieren escaneo (${escaneo.length})
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                ${escaneo.map(renderItem).join('')}
            </div>
        `;
    }

    cont.innerHTML = html;
    actualizarPreviewMontaje();
}

function cambiarCantidadMaterial(idx, valor) {
    const rec = window.APP.adminMontajeActual;
    if (!rec.materiales[idx]) return;
    const cant = parseInt(valor) || 1;
    rec.materiales[idx].cantidad = Math.max(1, cant);
}

function quitarMaterialMontaje(idx) {
    const rec = window.APP.adminMontajeActual;
    if (!rec.materiales[idx]) return;
    rec.materiales.splice(idx, 1);
    renderMaterialesMontaje();
}

function añadirPiezaMontaje() {
    const sel = document.getElementById('adminMontajePiezaSelector');
    const inp = document.getElementById('adminMontajePiezaCantidad');

    if (!sel || !sel.value) {
        toast('⚠️ Selecciona una pieza', '#f59e0b');
        return;
    }

    const opt = sel.options[sel.selectedIndex];
    const codigo = opt.dataset.codigo || sel.value;
    const nombre = opt.dataset.nombre || codigo;
    const cantidad = parseInt(inp.value) || 1;

    if (cantidad <= 0) {
        toast('⚠️ La cantidad debe ser mayor que 0', '#f59e0b');
        return;
    }

    const rec = window.APP.adminMontajeActual;

    const existente = rec.piezas.find(p => p.codigo === codigo);
    if (existente) {
        existente.cantidad += cantidad;
    } else {
        rec.piezas.push({ codigo, nombre, cantidad });
    }

    sel.value = '';
    inp.value = '1';

    renderPiezasMontaje();
    toast('✅ Pieza añadida', '#10b981', 1500);
}

function renderPiezasMontaje() {
    const cont = document.getElementById('adminMontajePiezaLista');
    if (!cont) return;

    const rec = window.APP.adminMontajeActual || { piezas: [] };
    const items = rec.piezas || [];

    if (!items.length) {
        cont.innerHTML = `
            <div style="text-align:center;padding:1rem;color:#94a3b8;font-size:0.8rem;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;">
                Sin piezas Kanban asignadas
            </div>
        `;
        actualizarPreviewMontaje();
        return;
    }

    cont.innerHTML = items.map((p, idx) => `
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.1rem;">🔗</span>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:0.85rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.nombre}</div>
                <div style="font-size:0.7rem;color:#047857;font-family:'SF Mono',Monaco,monospace;margin-top:2px;">${p.codigo}</div>
            </div>
            <input type="number" value="${p.cantidad}" min="1"
                onchange="cambiarCantidadPieza(${idx}, this.value)"
                style="width:70px;padding:6px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.8rem;text-align:center;font-weight:700;color:#047857;font-family:inherit;">
            <button type="button" onclick="quitarPiezaMontaje(${idx})"
                style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;width:30px;height:30px;cursor:pointer;color:#b91c1c;font-size:0.9rem;display:flex;align-items:center;justify-content:center;"
                title="Quitar">✕</button>
        </div>
    `).join('');

    actualizarPreviewMontaje();
}

function cambiarCantidadPieza(idx, valor) {
    const rec = window.APP.adminMontajeActual;
    if (!rec.piezas[idx]) return;
    const cant = parseInt(valor) || 1;
    rec.piezas[idx].cantidad = Math.max(1, cant);
}

function quitarPiezaMontaje(idx) {
    const rec = window.APP.adminMontajeActual;
    if (!rec.piezas[idx]) return;
    rec.piezas.splice(idx, 1);
    renderPiezasMontaje();
}

function añadirPasoMontaje() {
    const inp = document.getElementById('adminMontajeNuevoPaso');
    if (!inp) return;

    const texto = inp.value.trim();
    if (!texto) {
        toast('⚠️ Escribe el texto del paso', '#f59e0b');
        return;
    }

    const rec = window.APP.adminMontajeActual;
    if (!rec.pasos) rec.pasos = [];

    const id = 'paso_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    rec.pasos.push({ id, texto });

    inp.value = '';
    inp.focus();

    renderPasosMontaje();
    toast('✅ Paso añadido', '#10b981', 1200);
}

function renderPasosMontaje() {
    const cont = document.getElementById('adminMontajePasosLista');
    if (!cont) return;

    const rec = window.APP.adminMontajeActual || { pasos: [] };
    const items = rec.pasos || [];

    const count = document.getElementById('adminMontajePasosCount');
    if (count) count.textContent = `(${items.length})`;

    if (!items.length) {
        cont.innerHTML = `
            <div style="text-align:center;padding:1rem;color:#94a3b8;font-size:0.8rem;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;">
                Sin pasos definidos · Añade los que el operario debe confirmar
            </div>
        `;
        return;
    }

    cont.innerHTML = items.map((p, idx) => `
        <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
            <span style="
                background:#6366f1;
                color:white;
                width:26px;
                height:26px;
                border-radius:50%;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:0.75rem;
                font-weight:800;
                flex-shrink:0;
            ">${idx + 1}</span>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:0.85rem;color:#1e293b;">${p.texto}</div>
            </div>
            <button type="button" onclick="moverPasoArriba(${idx})"
                ${idx === 0 ? 'disabled' : ''}
                style="
                    background:white;
                    border:1px solid #cbd5e1;
                    border-radius:6px;
                    width:30px;
                    height:30px;
                    cursor:${idx === 0 ? 'not-allowed' : 'pointer'};
                    color:${idx === 0 ? '#cbd5e1' : '#6366f1'};
                    font-size:0.85rem;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-family:inherit;
                ">▲</button>
            <button type="button" onclick="moverPasoAbajo(${idx})"
                ${idx === items.length - 1 ? 'disabled' : ''}
                style="
                    background:white;
                    border:1px solid #cbd5e1;
                    border-radius:6px;
                    width:30px;
                    height:30px;
                    cursor:${idx === items.length - 1 ? 'not-allowed' : 'pointer'};
                    color:${idx === items.length - 1 ? '#cbd5e1' : '#6366f1'};
                    font-size:0.85rem;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-family:inherit;
                ">▼</button>
            <button type="button" onclick="quitarPasoMontaje(${idx})"
                style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;width:30px;height:30px;cursor:pointer;color:#b91c1c;font-size:0.9rem;display:flex;align-items:center;justify-content:center;"
                title="Quitar">✕</button>
        </div>
    `).join('');
}

function moverPasoArriba(idx) {
    const rec = window.APP.adminMontajeActual;
    if (idx <= 0 || !rec.pasos) return;
    [rec.pasos[idx - 1], rec.pasos[idx]] = [rec.pasos[idx], rec.pasos[idx - 1]];
    renderPasosMontaje();
}

function moverPasoAbajo(idx) {
    const rec = window.APP.adminMontajeActual;
    if (!rec.pasos || idx >= rec.pasos.length - 1) return;
    [rec.pasos[idx + 1], rec.pasos[idx]] = [rec.pasos[idx], rec.pasos[idx + 1]];
    renderPasosMontaje();
}

function quitarPasoMontaje(idx) {
    const rec = window.APP.adminMontajeActual;
    if (!rec.pasos || !rec.pasos[idx]) return;
    rec.pasos.splice(idx, 1);
    renderPasosMontaje();
}

async function duplicarPasosDeOtroMontaje() {
    const montajes = await cargarFirebase('montajes', true);
    const conPasos = Object.entries(montajes).filter(([id, m]) =>
        m.pasos && m.pasos.length > 0
    );

    if (!conPasos.length) {
        alertar('No hay otros montajes con pasos definidos', { tipo: 'info' });
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'modalCopiarPasos';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

    modal.innerHTML = `
        <div style="background:white;border-radius:18px;padding:24px;max-width:480px;width:100%;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;color:#1e293b;font-size:1.05rem;">📋 Copiar pasos de otro montaje</h3>
                <button onclick="document.getElementById('modalCopiarPasos').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b;">✕</button>
            </div>

            <p style="font-size:0.82rem;color:#64748b;margin:0 0 12px 0;">
                Selecciona un montaje. Se <strong>reemplazarán</strong> los pasos actuales.
            </p>

            <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
                ${conPasos.map(([id, m]) => `
                    <button onclick="copiarPasosDe('${id}')"
                        style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;cursor:pointer;text-align:left;font-family:inherit;transition:all 0.15s ease;"
                        onmouseover="this.style.background='#eef2ff';this.style.borderColor='#c7d2fe'"
                        onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e5e7eb'">
                        <div style="font-weight:700;font-size:0.88rem;color:#1e293b;">${m.nombre || 'Sin nombre'}</div>
                        <div style="font-size:0.72rem;color:#6366f1;font-weight:600;margin-top:2px;">
                            📋 ${m.pasos.length} paso${m.pasos.length !== 1 ? 's' : ''}
                        </div>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    window.APP._montajesConPasos = montajes;
}

function copiarPasosDe(montajeId) {
    const montajes = window.APP._montajesConPasos;
    if (!montajes || !montajes[montajeId]) return;

    const m = montajes[montajeId];
    if (!m.pasos) return;

    const nuevosPasos = m.pasos.map(p => ({
        id: 'paso_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        texto: p.texto
    }));

    window.APP.adminMontajeActual.pasos = nuevosPasos;
    renderPasosMontaje();

    document.getElementById('modalCopiarPasos')?.remove();

    toast(`✅ Copiados ${nuevosPasos.length} pasos de "${m.nombre}"`, '#10b981');
}
