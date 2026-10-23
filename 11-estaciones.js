async function calcularRecursosEstacion(estacionId, montajesPrecargados = null) {
    const [montajes, tornilleriaCat, materialesCat, piezasCat] = await Promise.all([
        montajesPrecargados ? Promise.resolve(montajesPrecargados) : cargarFirebase('montajes'),
        cargarFirebase('tornilleria_catalogo'),
        cargarFirebase('materiales_catalogo'),
        cargarFirebase('piezas_kanban')
    ]);

    const montajesEst = Object.entries(montajes).filter(([mid, m]) => m.puntoId === estacionId);

    let totalSeg = 0;
    const tornMap = new Map();
    const matNormalMap = new Map();
    const matEscaneoMap = new Map();
    const piezaMap = new Map();

    montajesEst.forEach(([mid, m]) => {
        totalSeg += Math.round((parseFloat(m.tiempoHoras) || 0) * 3600);

        if (m.tornilleria) {
            m.tornilleria.split('||').forEach(item => {
                const [ref, cant] = item.trim().split('=');
                if (!ref) return;
                const cantidad = parseInt(cant) || 1;
                tornMap.set(ref, (tornMap.get(ref) || 0) + cantidad);
            });
        }

        if (m.materialesNecesarios) {
            m.materialesNecesarios.split('||').forEach(item => {
                const partes = item.trim().split('=');
                const matId = partes[0];
                if (!matId) return;

                const cant = parseInt(partes[1]) || 1;

                let cat = materialesCat[matId];
                if (!cat) {
                    cat = Object.values(materialesCat).find(mm =>
                        mm.codigo === matId || mm.nombre === matId
                    );
                }

                const requiereEscaneo = cat?.requiereEscaneo === true;

                if (requiereEscaneo) {
                    matEscaneoMap.set(matId, (matEscaneoMap.get(matId) || 0) + cant);
                } else {
                    matNormalMap.set(matId, (matNormalMap.get(matId) || 0) + cant);
                }
            });
        }

        if (m.piezasKanban) {
            m.piezasKanban.split(',').forEach(item => {
                const [codigo, cant] = item.trim().split('=');
                if (!codigo) return;
                const cantidad = parseInt(cant) || 1;
                piezaMap.set(codigo, (piezaMap.get(codigo) || 0) + cantidad);
            });
        }
    });

    const resolverMaterial = (matId) => {
        let cat = materialesCat[matId];
        if (!cat) {
            cat = Object.values(materialesCat).find(mm =>
                mm.codigo === matId || mm.nombre === matId
            );
        }
        return {
            ref: matId,
            nombre: cat?.nombre || '⚠️ ' + matId,
            codigo: cat?.codigo || '',
            ubicacion: cat?.ubicacion || '',
            cantidad: 0
        };
    };

    const tornArr = Array.from(tornMap.entries()).map(([ref, cantidad]) => {
    let cat = null;
    for (const [catId, item] of Object.entries(tornilleriaCat)) {
        if (catId === ref || item.codigo === ref || item.nombre === ref) {
            cat = item;
            break;
        }
    }
    return {
        ref,
        nombre: cat?.nombre || ref,
        codigo: cat?.codigo || '',
        tipo: cat?.tipo || 'Otro',
        ubicacion: cat?.ubicacion || '',
        cantidad
    };
}).sort((a, b) => {
    const ordenTipo = { 'Arandela': 1, 'Tornillo': 2, 'Tuerca': 3, 'Otro': 4 };
    const ta = ordenTipo[a.tipo] || 5;
    const tb = ordenTipo[b.tipo] || 5;
    if (ta !== tb) return ta - tb;
    return compararTornilleriaNatural(a.nombre, b.nombre);
});

    const matNormalArr = Array.from(matNormalMap.entries()).map(([matId, cantidad]) => {
        const item = resolverMaterial(matId);
        item.cantidad = cantidad;
        return item;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));

    const matEscaneoArr = Array.from(matEscaneoMap.entries()).map(([matId, cantidad]) => {
        const item = resolverMaterial(matId);
        item.cantidad = cantidad;
        return item;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));

    const piezaArr = Array.from(piezaMap.entries()).map(([codigo, cantidad]) => {
        let cat = Object.values(piezasCat).find(p => p.codigo === codigo);
        if (!cat) cat = piezasCat[codigo];
        return {
            codigo,
            nombre: cat?.nombre || codigo,
            ubicacion: cat?.ubicacion || '',
            cantidad
        };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));

    const tornTotalUds = tornArr.reduce((a, t) => a + t.cantidad, 0);
    const matNormalUds = matNormalArr.reduce((a, m) => a + m.cantidad, 0);
    const matEscaneoUds = matEscaneoArr.reduce((a, m) => a + m.cantidad, 0);
    const piezaTotalUds = piezaArr.reduce((a, p) => a + p.cantidad, 0);

    return {
        totalMontajes: montajesEst.length,
        totalSeg,
        tornilleria: {
            totalTipos: tornArr.length,
            totalUnidades: tornTotalUds,
            items: tornArr
        },
        materiales: {
            totalTipos: matNormalArr.length,
            totalUnidades: matNormalUds,
            items: matNormalArr
        },
        materialesEscaneo: {
            totalTipos: matEscaneoArr.length,
            totalUnidades: matEscaneoUds,
            items: matEscaneoArr
        },
        piezasKanban: {
            totalTipos: piezaArr.length,
            totalUnidades: piezaTotalUds,
            items: piezaArr
        }
    };
}

async function cargarEstaciones() {
    const grid = document.getElementById('estacionesGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">⏳ Cargando estaciones...</div>';

    const [estaciones, montajes] = await Promise.all([
        cargarFirebase('estaciones'),
        cargarFirebase('montajes')
    ]);

    const filtro = document.getElementById('filtroModeloEstaciones')?.value || 'todos';
    const filtradas = Object.entries(estaciones)
        .filter(([id, e]) => filtro === 'todos' ? true : e.modelo === filtro)
        .sort((a, b) => {
            const numA = parseInt((a[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            const numB = parseInt((b[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            return numA - numB;
        });

    if (!filtradas.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No hay estaciones para este filtro</div>';
        return;
    }

const recursosPorEstacion = {};
await Promise.all(filtradas.map(async ([id]) => {
    recursosPorEstacion[id] = await calcularRecursosEstacion(id, montajes);
}));

grid.innerHTML = filtradas.map(([id, est]) => {
    const color = est.color || '#10b981';
    const colorBg = color + '18';
    const colorBorder = color + '50';

    const rec = recursosPorEstacion[id];
    const numMontajes = rec.totalMontajes;
    const horas = (rec.totalSeg / 3600).toFixed(2);

    const modeloIcono = est.modelo === 'MS3' ? '🔷' : '🔶';

const totalMatTipos = rec.materiales.totalTipos + rec.materialesEscaneo.totalTipos;
const totalMatUds = rec.materiales.totalUnidades + rec.materialesEscaneo.totalUnidades;

const contadores = [
    numMontajes > 0 && { icono: '📦', valor: `${numMontajes} montaje${numMontajes !== 1 ? 's' : ''}` },
    rec.totalSeg > 0 && { icono: '⏱️', valor: `${horas}h` },
    rec.tornilleria.totalTipos > 0 && { icono: '🔩', valor: `${rec.tornilleria.totalUnidades} torn.` },
    totalMatTipos > 0 && { icono: '🧪', valor: `${totalMatUds} mat.` },
    rec.materialesEscaneo.totalTipos > 0 && { icono: '📷', valor: `${rec.materialesEscaneo.totalUnidades} esc.` },
    rec.piezasKanban.totalTipos > 0 && { icono: '🔗', valor: `${rec.piezasKanban.totalUnidades} piez.` }
].filter(Boolean);

    return `
            <div class="estacion-card"
                 onclick="mostrarDetalleEstacion('${id}', '${encodeURIComponent(est.nombre || '')}', '${est.modelo || 'MS3'}')"
                 style="
                    background: white;
                    border-radius: 14px;
                    padding: 0;
                    border: 1px solid ${colorBorder};
                    border-left: 4px solid ${color};
                    cursor: pointer;
                    transition: all 0.2s ease;
                    overflow: hidden;
                    position: relative;
                 "
                 onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 20px ${color}22';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='';">

                <!-- CABECERA -->
                <div style="display:flex;align-items:center;gap:12px;padding:14px 14px 10px 14px;">
                    <div style="
                        width: 44px;
                        height: 44px;
                        background: ${colorBg};
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.4rem;
                        flex-shrink: 0;
                    ">🏭</div>
                    <div style="flex:1;min-width:0;">
                        <div style="
                            font-weight: 700;
                            color: #1e293b;
                            font-size: 0.95rem;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                            line-height: 1.2;
                        ">${est.nombre || 'Sin nombre'}</div>
                        <div style="
                            font-size: 0.72rem;
                            color: ${color};
                            font-weight: 700;
                            display: flex;
                            align-items: center;
                            gap: 5px;
                            margin-top: 3px;
                        ">
                            <span>${modeloIcono} ${est.modelo || 'MS3'}</span>
                        </div>
                    </div>
                </div>

                <!-- DESCRIPCIÓN -->
                <div style="padding: 0 14px 12px 14px;">
                    <div style="
                        font-size: 0.75rem;
                        color: #64748b;
                        min-height: 18px;
                        line-height: 1.3;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                    ">${est.descripcion || '<span style="color:#cbd5e1;font-style:italic;">Sin descripción</span>'}</div>
                </div>

                      <!-- CONTADORES (grid de recursos) -->
            <div style="
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 6px;
                padding: 10px 14px;
                background: ${colorBg};
                border-top: 1px solid ${colorBorder};
            ">
                ${contadores.length === 0 ? `
                    <div style="grid-column: 1/-1; text-align: center; font-size: 0.75rem; color: ${color}; opacity: 0.6; font-style: italic;">
                        Sin recursos asignados
                    </div>
                ` : contadores.map(c => `
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        font-size: 0.72rem;
                        color: ${color};
                        font-weight: 700;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    ">
                        <span style="font-size: 0.85rem; flex-shrink: 0;">${c.icono}</span>
                        <span style="overflow: hidden; text-overflow: ellipsis;">${c.valor}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}).join('');
}

async function mostrarDetalleEstacion(estacionId, nombreEncoded, modelo) {
    const nombre = decodeURIComponent(nombreEncoded);
    window.APP.estacionDetalleId = estacionId;

    const montajes = await cargarFirebase('montajes');

    const montajesEstacion = Object.entries(montajes)
        .filter(([mid, m]) => m.puntoId === estacionId)
        .sort((a, b) => (parseInt(a[1].orden) || 0) - (parseInt(b[1].orden) || 0));

    const tiempoTotalSeg = montajesEstacion.reduce((a, [mid, m]) => a + Math.round((parseFloat(m.tiempoHoras) || 0) * 3600), 0);
    const horas = (tiempoTotalSeg / 3600).toFixed(2);

const estaciones = await cargarFirebase('estaciones');
const colorCustom = estaciones[estacionId]?.color || (modelo === 'MS3' ? '#10b981' : '#3b82f6');

const colorModelo = {
    bg: colorCustom + '18',
    border: colorCustom + '50',
    text: colorCustom,
    dot: colorCustom
};

    const modal = document.createElement('div');
    modal.id = 'modalDetalleEstacion';
    modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

    modal.innerHTML = `
        <div style="background:white;border-bottom:1px solid #e5e7eb;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                <div style="width:48px;height:48px;background:${colorModelo.bg};border:1px solid ${colorModelo.border};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">📍</div>
                <div style="min-width:0;">
                    <h2 style="margin:0;color:#1e293b;font-size:1.15rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nombre}</h2>
                    <div style="font-size:0.78rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="color:${colorModelo.text};font-weight:700;background:${colorModelo.bg};padding:1px 8px;border-radius:99px;font-size:0.72rem;">${modelo}</span>
                        <span style="color:#cbd5e1;">·</span>
                        <span>${montajesEstacion.length} montaje${montajesEstacion.length !== 1 ? 's' : ''}</span>
                        <span style="color:#cbd5e1;">·</span>
                        <span>${horas}h</span>
                    </div>
                </div>
            </div>
            <button onclick="cerrarModal('modalDetalleEstacion')" style="background:#f1f5f9;border:none;border-radius:10px;width:44px;height:44px;font-size:1.3rem;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
        </div>

        <div style="flex:1;overflow-y:auto;padding:1.5rem;background:#fafafa;">
            <div style="max-width:900px;margin:0 auto;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:1rem;">
                    <div style="background:linear-gradient(135deg,${colorModelo.bg},white);border:1px solid ${colorModelo.border};border-radius:14px;padding:1.2rem;text-align:center;">
                        <div style="font-size:1.6rem;margin-bottom:6px;">📦</div>
                        <div style="font-size:2rem;font-weight:800;color:${colorModelo.text};line-height:1;">${montajesEstacion.length}</div>
                        <div style="font-size:0.72rem;color:${colorModelo.text};font-weight:600;margin-top:6px;opacity:0.8;">Montajes</div>
                    </div>
                    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:1.2rem;text-align:center;">
                        <div style="font-size:1.6rem;margin-bottom:6px;">⏱️</div>
                        <div style="font-size:2rem;font-weight:800;color:#1e293b;line-height:1;">${horas}</div>
                        <div style="font-size:0.72rem;color:#64748b;font-weight:600;margin-top:6px;">Horas totales</div>
                    </div>
                </div>

          <!-- ═══════════════════════════════════════════
     RESUMEN DE RECURSOS DE LA ESTACIÓN
     ═══════════════════════════════════════════ -->
<div id="resumenRecursosEstacion_${estacionId}" style="margin-bottom:1rem;">
    <div style="text-align:center;padding:1.5rem;color:#94a3b8;font-size:0.85rem;">
        ⏳ Calculando recursos...
    </div>
</div>

                    ${montajesEstacion.length === 0 ? `
                        <div style="text-align:center;padding:2rem 1rem;color:#94a3b8;">
                            <div style="font-size:2rem;margin-bottom:8px;">📭</div>
                            <div style="font-size:0.85rem;">No hay montajes en esta estación</div>
                        </div>
                    ` : `
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            ${montajesEstacion.map(([mid, m]) => {
                                const h = parseFloat(m.tiempoHoras) || 0;
                                return `
                                    <div onclick="abrirDetalleDesdeEstacion('${mid}')"
                                        style="background:#f8fafc;border:1px solid #e5e7eb;border-left:3px solid ${colorModelo.dot};border-radius:10px;padding:12px 14px;cursor:pointer;transition:all 0.15s ease;"
                                        onmouseover="this.style.background='#f1f5f9'"
                                        onmouseout="this.style.background='#f8fafc'">
                                        <div style="display:flex;align-items:center;gap:12px;">
                                            <div style="font-size:1.5rem;flex-shrink:0;">${m.icono || '📦'}</div>
                                            <div style="flex:1;min-width:0;">
                                                <div style="font-weight:600;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.orden || ''}. ${m.nombre || 'Sin nombre'}</div>
                                                ${m.descripcion ? `<div style="font-size:0.75rem;color:#64748b;margin-top:2px;">${m.descripcion}</div>` : ''}
                                            </div>
                                            <div style="text-align:right;flex-shrink:0;">
                                                <div style="font-weight:700;font-size:0.9rem;color:#1e293b;">${h.toFixed(2)}h</div>
                                                <div style="font-size:1rem;color:#94a3b8;">→</div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
                <div style="height:2rem;"></div>
            </div>
        </div>
    `;

        document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    renderResumenRecursosEstacion(estacionId, colorModelo);
}

async function renderResumenRecursosEstacion(estacionId, colorModelo) {
    const cont = document.getElementById('resumenRecursosEstacion_' + estacionId);
    if (!cont) return;

    const rec = await calcularRecursosEstacion(estacionId);

    if (rec.totalMontajes === 0) {
        cont.innerHTML = `
            <div style="background:white;border-radius:12px;padding:2rem 1rem;border:1px dashed #cbd5e1;text-align:center;color:#94a3b8;">
                <div style="font-size:2rem;margin-bottom:8px;">📭</div>
                <div style="font-size:0.85rem;">Sin montajes asignados a esta estación</div>
            </div>
        `;
        return;
    }

    const color = colorModelo.dot;
    const colorBg = colorModelo.bg;
    const colorBorder = colorModelo.border;

    const renderSeccion = (icono, titulo, subtitulo, items, colorSeccion) => {
        if (items.length === 0) return '';
        return `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 1.2rem 1.4rem;
                border: 1px solid #e5e7eb;
                border-left: 4px solid ${colorSeccion};
                margin-bottom: 0.75rem;
            ">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                    <span style="font-size:1.1rem;">${icono}</span>
                    <span style="font-weight:700;font-size:0.95rem;color:${colorSeccion};">${titulo}</span>
                    <span style="
                        background: ${colorSeccion}18;
                        color: ${colorSeccion};
                        padding: 2px 10px;
                        border-radius: 99px;
                        font-size: 0.7rem;
                        font-weight: 700;
                        margin-left: auto;
                    ">${subtitulo}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${items.map(item => `
                        <div style="
                            background: #f8fafc;
                            border-radius: 8px;
                            padding: 8px 12px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            flex-wrap: wrap;
                            font-size: 0.82rem;
                        ">
                        <div style="flex:1;min-width:0;">
  <div style="font-weight:600;color:#1e293b;">
    ${item.nombre}
    ${item.codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#64748b;font-weight:400;">(${item.codigo})</span>` : ''}
</div>
    ${item.ubicacion ? `<div style="font-size:0.7rem;color:#64748b;margin-top:2px;">📍 ${item.ubicacion}</div>` : ''}
</div>
                            <span style="
                                background: ${colorSeccion}18;
                                color: ${colorSeccion};
                                padding: 3px 10px;
                                border-radius: 99px;
                                font-size: 0.75rem;
                                font-weight: 700;
                                flex-shrink: 0;
                            ">×${item.cantidad}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    const totalMatTipos = rec.materiales.totalTipos + rec.materialesEscaneo.totalTipos;
    const totalMatUds = rec.materiales.totalUnidades + rec.materialesEscaneo.totalUnidades;

    let seccionMateriales = '';

    if (totalMatTipos > 0) {
        seccionMateriales = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 1.2rem 1.4rem;
                border: 1px solid #e5e7eb;
                border-left: 4px solid #f97316;
                margin-bottom: 0.75rem;
            ">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                    <span style="font-size:1.1rem;">🧪</span>
                    <span style="font-weight:700;font-size:0.95rem;color:#c2410c;">Materiales y componentes</span>
                    <span style="
                        background: #f9731618;
                        color: #f97316;
                        padding: 2px 10px;
                        border-radius: 99px;
                        font-size: 0.7rem;
                        font-weight: 700;
                        margin-left: auto;
                    ">${totalMatTipos} tipos · ${totalMatUds} uds</span>
                </div>

                ${rec.materiales.totalTipos > 0 ? `
                    <div style="
                        font-size: 0.72rem;
                        font-weight: 700;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin: 0 0 6px 2px;
                    ">📦 Materiales normales (${rec.materiales.totalTipos})</div>
                    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
                        ${rec.materiales.items.map(item => `
                            <div style="
                                background: #fffbf5;
                                border-radius: 8px;
                                padding: 8px 12px;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                flex-wrap: wrap;
                                font-size: 0.82rem;
                            ">
                          <div style="flex:1;min-width:0;">
  <div style="font-weight:600;color:#1e293b;">
    ${item.nombre}
    ${item.codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#64748b;font-weight:400;">(${item.codigo})</span>` : ''}
</div>
    ${item.ubicacion ? `<div style="font-size:0.7rem;color:#64748b;margin-top:2px;">📍 ${item.ubicacion}</div>` : ''}
</div>
<span style="
    background: #f9731618;
    color: #f97316;
    padding: 3px 10px;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
">×${item.cantidad}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                ${rec.materialesEscaneo.totalTipos > 0 ? `
                    <div style="
                        font-size: 0.72rem;
                        font-weight: 700;
                        color: #1d4ed8;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin: 0 0 6px 2px;
                    ">📷 Requieren escaneo (${rec.materialesEscaneo.totalTipos})</div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        ${rec.materialesEscaneo.items.map(item => `
                            <div style="
                                background: #eff6ff;
                                border-radius: 8px;
                                padding: 8px 12px;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                flex-wrap: wrap;
                                font-size: 0.82rem;
                                border-left: 3px solid #3b82f6;
                            ">
                                <span style="font-size:1rem;">📷</span>
                               <div style="flex:1;min-width:0;">
    <div style="font-weight:600;color:#1e293b;">
    ${item.nombre}
    ${item.codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#64748b;font-weight:400;">(${item.codigo})</span>` : ''}
</div>
    ${item.ubicacion ? `<div style="font-size:0.7rem;color:#64748b;margin-top:2px;">📍 ${item.ubicacion}</div>` : ''}
</div>
<span style="
    background: #1d4ed818;
    color: #1d4ed8;
    padding: 3px 10px;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
">×${item.cantidad}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    cont.innerHTML = `
        <div style="
            background: linear-gradient(135deg, ${colorBg}, white);
            border-radius: 14px;
            padding: 1rem 1.2rem;
            margin-bottom: 0.75rem;
            border: 1px solid ${colorBorder};
            border-left: 4px solid ${color};
        ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="font-size:1.2rem;">📊</span>
                <span style="font-weight:800;font-size:1rem;color:${color};">Recursos totales de la estación</span>
            </div>
            <div style="font-size:0.78rem;color:${color};font-weight:600;opacity:0.85;">
                Suma de los ${rec.totalMontajes} montaje${rec.totalMontajes !== 1 ? 's' : ''} que componen esta estación.
            </div>
        </div>

        ${renderSeccionTornilleriaRecursos(rec.tornilleria)}

        ${seccionMateriales}

        ${renderSeccion('🔗', 'Piezas Kanban', `${rec.piezasKanban.totalTipos} tipos · ${rec.piezasKanban.totalUnidades} uds`, rec.piezasKanban.items, '#10b981')}

        ${rec.tornilleria.totalTipos === 0 && totalMatTipos === 0 && rec.piezasKanban.totalTipos === 0 ? `
            <div style="background:white;border-radius:12px;padding:1.5rem;border:1px dashed #cbd5e1;text-align:center;color:#94a3b8;font-size:0.85rem;">
                Los montajes de esta estación no tienen recursos asignados todavía.
            </div>
        ` : ''}
    `;
}

function renderSeccionTornilleriaRecursos(tornData) {
    if (!tornData || tornData.totalTipos === 0) return '';

    const items = tornData.items || [];
    const ordenTipos = ['Arandela', 'Tornillo', 'Tuerca', 'Otro'];
    const iconosTipo = { 'Arandela': '🔘', 'Tornillo': '🔩', 'Tuerca': '⚙️', 'Otro': '📦' };

    const grupos = {};
    items.forEach(it => {
        const tipo = it.tipo || 'Otro';
        if (!grupos[tipo]) grupos[tipo] = [];
        grupos[tipo].push(it);
    });

    let contenido = '';
    ordenTipos.forEach(tipo => {
        const grupo = grupos[tipo];
        if (!grupo || !grupo.length) return;

        const icono = iconosTipo[tipo] || '📦';
        const udsGrupo = grupo.reduce((a, i) => a + (i.cantidad || 0), 0);

        contenido += `
            <div style="
                font-size: 0.72rem;
                font-weight: 700;
                color: #6d28d9;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin: 0 0 6px 2px;
                display: flex;
                align-items: center;
                gap: 6px;
            ">
                <span>${icono}</span>
                <span>${tipo}s</span>
                <span style="
                    background:#ede9fe;
                    color:#6d28d9;
                    padding:1px 8px;
                    border-radius:99px;
                    font-size:0.65rem;
                    font-weight:800;
                ">${grupo.length} · ${udsGrupo} uds</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
                ${grupo.map(item => `
                    <div style="
                        background: #faf5ff;
                        border-radius: 8px;
                        padding: 8px 12px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        flex-wrap: wrap;
                        font-size: 0.82rem;
                    ">
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;color:#1e293b;">
                                ${item.nombre}
                                ${item.codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#64748b;font-weight:400;">(${item.codigo})</span>` : ''}
                            </div>
                            ${item.ubicacion ? `<div style="font-size:0.7rem;color:#64748b;margin-top:2px;">📍 ${item.ubicacion}</div>` : ''}
                        </div>
                        <span style="
                            background:#ede9fe;
                            color:#6d28d9;
                            padding:3px 10px;
                            border-radius:99px;
                            font-size:0.75rem;
                            font-weight:700;
                            flex-shrink:0;
                        ">×${item.cantidad}</span>
                    </div>
                `).join('')}
            </div>
        `;
    });

    return `
        <div style="
            background:white;
            border-radius:12px;
            padding:1.2rem 1.4rem;
            border:1px solid #e5e7eb;
            border-left:4px solid #8b5cf6;
            margin-bottom:0.75rem;
        ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                <span style="font-size:1.1rem;">🔩</span>
                <span style="font-weight:700;font-size:0.95rem;color:#6d28d9;">Tornillería</span>
                <span style="
                    background:#8b5cf618;
                    color:#8b5cf6;
                    padding:2px 10px;
                    border-radius:99px;
                    font-size:0.7rem;
                    font-weight:700;
                    margin-left:auto;
                ">${tornData.totalTipos} tipos · ${tornData.totalUnidades} uds</span>
            </div>
            ${contenido}
        </div>
    `;
}

async function abrirDetalleDesdeEstacion(montajeId) {
    const overlay = document.createElement('div');
    overlay.id = 'transicionModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:#fafafa;z-index:99998;';
    document.body.appendChild(overlay);

    try {
        const montajes = await cargarFirebase('montajes');
        const m = montajes[montajeId];
        if (!m) {
            overlay.remove();
            toast('❌ Montaje no encontrado', '#ef4444');
            return;
        }
    } catch(e) {
        overlay.remove();
        return;
    }

    await mostrarDetalleMontaje(montajeId);

    const modalEstacion = document.getElementById('modalDetalleEstacion');
    if (modalEstacion) modalEstacion.remove();

    overlay.remove();
    document.body.style.overflow = 'hidden';
}
