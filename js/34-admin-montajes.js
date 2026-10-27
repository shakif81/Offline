window.APP.adminMontajeActual = {
    tornilleria: [],
    materiales: [],
    piezas: [],
    pasos: []
};

async function cargarAdminMontajes() {
    const container = document.getElementById('adminMontajesList');
    const contador = document.getElementById('adminMontajesContador');
    if (!container) return;

    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">⏳ Cargando...</div>';

    const [montajes, estaciones] = await Promise.all([
        cargarFirebase('montajes', true),
        cargarFirebase('estaciones')
    ]);

    const selEst = document.getElementById('filtroEstacionAdminMontajes');
    if (selEst && selEst.options.length <= 1) {
        Object.entries(estaciones)
            .sort((a, b) => (a[1].nombre || '').localeCompare(b[1].nombre || ''))
            .forEach(([id, e]) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = `📍 ${e.nombre} (${e.modelo})`;
                selEst.appendChild(opt);
            });
    }

    const busqueda = (document.getElementById('adminMontajesBusqueda')?.value || '').toLowerCase().trim();
    const filtroModelo = document.getElementById('filtroModeloAdminMontajes')?.value || 'todos';
    const filtroEstacion = document.getElementById('filtroEstacionAdminMontajes')?.value || 'todas';

    let arr = Object.entries(montajes);

    if (filtroModelo !== 'todos') {
        arr = arr.filter(([id, m]) => m.modelo === filtroModelo);
    }
    if (filtroEstacion !== 'todas') {
        arr = arr.filter(([id, m]) => m.puntoId === filtroEstacion);
    }
    if (busqueda) {
        arr = arr.filter(([id, m]) =>
            (m.nombre || '').toLowerCase().includes(busqueda) ||
            (m.descripcion || '').toLowerCase().includes(busqueda)
        );
    }

    arr.sort((a, b) => {
        const estA = estaciones[a[1].puntoId]?.nombre || '';
        const estB = estaciones[b[1].puntoId]?.nombre || '';
        if (estA !== estB) return estA.localeCompare(estB);
        return (parseInt(a[1].orden) || 0) - (parseInt(b[1].orden) || 0);
    });

    if (contador) contador.textContent = `${arr.length} montaje${arr.length !== 1 ? 's' : ''}`;

    if (!arr.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                ${busqueda ? '🔍 Sin resultados para "' + busqueda + '"' : '📭 No hay montajes. Crea el primero.'}
            </div>
        `;
        return;
    }

    container.innerHTML = arr.map(([id, mon]) => {
        const est = estaciones[mon.puntoId];
        const modelo = mon.modelo || 'MS3';
        const esMS3 = modelo === 'MS3';
        const color = esMS3 ? '#10b981' : '#3b82f6';
        const colorBg = color + '10';
        const colorBorder = color + '50';
        const icono = mon.icono || '📦';

        const numTorn = mon.tornilleria ? mon.tornilleria.split('||').filter(x => x.trim()).length : 0;
        const numMat = mon.materialesNecesarios ? mon.materialesNecesarios.split('||').filter(x => x.trim()).length : 0;
        const numPiezas = mon.piezasKanban ? mon.piezasKanban.split(',').filter(x => x.trim()).length : 0;

        return `
            <div onclick="editarMontajeAdmin('${id}')"
                style="background:white;border:1px solid ${colorBorder};border-left:4px solid ${color};border-radius:14px;padding:14px 16px;cursor:pointer;transition:all 0.2s ease;position:relative;overflow:hidden;"
                onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px ${color}22';"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='';">

                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:1.2rem;">${icono}</span>
                        <span style="background:${colorBg};color:${color};padding:3px 8px;border-radius:8px;font-size:0.68rem;font-weight:700;border:1px solid ${colorBorder};">Orden ${mon.orden || '—'}</span>
                    </div>
                    <button onclick="event.stopPropagation();duplicarMontajeAdmin('${id}')"
                        style="background:white;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.7rem;color:#64748b;cursor:pointer;font-family:inherit;font-weight:600;"
                        onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">📋 Copiar</button>
                </div>

                <div style="font-weight:700;font-size:1rem;color:#1e293b;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${mon.nombre || 'Sin nombre'}</div>

                ${mon.descripcion ? `
                    <div style="font-size:0.75rem;color:#64748b;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${mon.descripcion}</div>
                ` : ''}

                <div style="font-size:0.72rem;color:${color};font-weight:600;display:flex;align-items:center;gap:4px;margin-bottom:8px;">
                    📍 ${est?.nombre || 'Estación desconocida'} · ⏱️ ${mon.tiempoHoras || 0}h${mon.esTQC ? ' · 🔍 TQC' : ''}${mon.operarioAsignado === 'operario1' ? ' · 👷 Operario 1' : mon.operarioAsignado === 'operario2' ? ' · 👷 Operario 2' : ''}
                </div>

                ${(() => {
                    const textoDep = (mon.dependeDe || '').trim();
                    if (!mon.dependeDeId && !textoDep) return '';
                    const depId = typeof resolverDependeDe === 'function' ? resolverDependeDe(mon, montajes) : null;
                    return depId
                        ? `<div style="font-size:0.72rem;color:#92400e;font-weight:700;margin-bottom:8px;">🔒 Depende de: ${montajes[depId].nombre}</div>`
                        : `<div style="font-size:0.72rem;color:#b91c1c;font-weight:700;margin-bottom:8px;line-height:1.35;">⚠️ Dependencia sin resolver: «${textoDep || mon.dependeDeId}». Edítalo y elige el montaje en la lista.</div>`;
                })()}

                <div style="display:flex;gap:6px;padding-top:10px;border-top:1px solid #f1f5f9;flex-wrap:wrap;">
                    ${numTorn > 0 ? `<span style="font-size:0.68rem;color:#8b5cf6;font-weight:700;">🔩 ${numTorn}</span>` : ''}
                    ${numMat > 0 ? `<span style="font-size:0.68rem;color:#f97316;font-weight:700;">🧪 ${numMat}</span>` : ''}
                    ${numPiezas > 0 ? `<span style="font-size:0.68rem;color:#10b981;font-weight:700;">🔗 ${numPiezas}</span>` : ''}
                    ${(numTorn + numMat + numPiezas) === 0 ? `<span style="font-size:0.68rem;color:#cbd5e1;font-style:italic;">Sin recursos asignados</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function mostrarFormNuevoMontaje() {
window.APP.adminMontajeActual = { tornilleria: [], materiales: [], piezas: [], pasos: [] };

    document.getElementById('adminMontajesForm').style.display = 'block';
    document.getElementById('adminMontajeFormTitulo').textContent = 'Nuevo Montaje';

    document.getElementById('adminMontajeId').value = '';
    document.getElementById('adminMontajeNombre').value = '';
    document.getElementById('adminMontajeOrden').value = '';
    document.getElementById('adminMontajeTiempo').value = '';
    document.getElementById('adminMontajeIcono').value = '';
    document.getElementById('adminMontajeDescripcion').value = '';
    await prepararSelectDependenciaMontaje(null);
    document.getElementById('adminMontajeDependeDe').value = '';
    const selOperarioNuevo = document.getElementById('adminMontajeOperario');
    if (selOperarioNuevo) selOperarioNuevo.value = '';
    const chkTQCNuevo = document.getElementById('adminMontajeEsTQC');
    if (chkTQCNuevo) chkTQCNuevo.checked = false;
    document.getElementById('adminMontajePares').value = '';
    document.getElementById('adminMontajeInstrucciones').value = '';
    document.getElementById('adminMontajeVideo').value = '';
    prepararUIAdjuntosMontaje();
    const textoPdfsNuevo = document.getElementById('adminMontajePdfs');
    if (textoPdfsNuevo) textoPdfsNuevo.value = '';
    const textoFotosNuevo = document.getElementById('adminMontajeFotos');
    if (textoFotosNuevo) textoFotosNuevo.value = '';
    limpiarAdjuntosMontaje();

    document.getElementById('btnEliminarMontaje').style.display = 'none';

await cargarSelectoresMontaje();
renderTornilleriaMontaje();
renderMaterialesMontaje();
renderPiezasMontaje();
renderPasosMontaje();

    document.getElementById('adminMontajesForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('adminMontajeNombre').focus(), 300);
}

async function editarMontajeAdmin(id) {
    const montajes = await cargarFirebase('montajes');
    const mon = montajes[id];
    if (!mon) return;

    window.APP.adminMontajeActual = {
        tornilleria: [],
        materiales: [],
        piezas: []
    };

    if (mon.tornilleria) {
        const catTorn = await cargarFirebase('tornilleria_catalogo');
        mon.tornilleria.split('||').forEach(item => {
            const [ref, cant] = item.trim().split('=');
            if (!ref) return;
            let cat = null;
            for (const [catId, c] of Object.entries(catTorn)) {
                if (catId === ref || c.codigo === ref || c.nombre === ref) { cat = c; break; }
            }
            window.APP.adminMontajeActual.tornilleria.push({
                ref,
                nombre: cat?.nombre || ref,
                cantidad: parseInt(cant) || 1
            });
        });
    }

    if (mon.materialesNecesarios) {
        const catMat = await cargarFirebase('materiales_catalogo');
        mon.materialesNecesarios.split('||').forEach(item => {
            const partes = item.trim().split('=');
            const ref = partes[0];
            if (!ref) return;
            const cant = parseInt(partes[1]) || 1;
            const nombreEmb = partes[2] ? decodeURIComponent(partes[2]) : '';
            const codigoEmb = partes[3] ? decodeURIComponent(partes[3]) : '';

            let cat = catMat[ref];
            if (!cat) {
                cat = Object.values(catMat).find(m =>
                    m.codigo === ref || m.nombre === ref
                );
            }

            window.APP.adminMontajeActual.materiales.push({
                ref,
                nombre: cat?.nombre || nombreEmb || ref,
                codigo: cat?.codigo || codigoEmb || '',
                requiereEscaneo: cat?.requiereEscaneo === true,
                cantidad: cant
            });
        });
    }

    if (mon.piezasKanban) {
        const catPiezas = await cargarFirebase('piezas_kanban');
        mon.piezasKanban.split(',').forEach(item => {
            const [codigo, cant] = item.trim().split('=');
            if (!codigo) return;
            let cat = Object.values(catPiezas).find(p => p.codigo === codigo);
            if (!cat) cat = catPiezas[codigo];
            window.APP.adminMontajeActual.piezas.push({
                codigo,
                nombre: cat?.nombre || codigo,
                cantidad: parseInt(cant) || 1
            });
        });
    }

if (mon.pasos && Array.isArray(mon.pasos)) {
    window.APP.adminMontajeActual.pasos = mon.pasos.map(p => ({
        id: p.id || 'paso_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        texto: p.texto || ''
    }));
}

    document.getElementById('adminMontajesForm').style.display = 'block';
    document.getElementById('adminMontajeFormTitulo').textContent = 'Editar Montaje';

    document.getElementById('adminMontajeId').value = id;
    document.getElementById('adminMontajeNombre').value = mon.nombre || '';
    document.getElementById('adminMontajeOrden').value = mon.orden || '';
    document.getElementById('adminMontajeTiempo').value = mon.tiempoHoras || '';
    document.getElementById('adminMontajeIcono').value = mon.icono || '';
    document.getElementById('adminMontajeDescripcion').value = mon.descripcion || '';
    await prepararSelectDependenciaMontaje(id);
    document.getElementById('adminMontajeDependeDe').value = typeof resolverDependeDe === 'function' ? (resolverDependeDe(mon, montajes) || '') : '';
    const selOperarioEditar = document.getElementById('adminMontajeOperario');
    if (selOperarioEditar) selOperarioEditar.value = mon.operarioAsignado || '';
    const chkTQCEditar = document.getElementById('adminMontajeEsTQC');
    if (chkTQCEditar) chkTQCEditar.checked = !!mon.esTQC;
    document.getElementById('adminMontajePares').value = mon.paresRequeridos || '';
    document.getElementById('adminMontajeInstrucciones').value = mon.instrucciones || '';
    document.getElementById('adminMontajeVideo').value = mon.videoInstrucciones || '';

    prepararUIAdjuntosMontaje();
    cargarAdjuntosMontaje(mon);

    document.getElementById('btnEliminarMontaje').style.display = 'inline-flex';

    await cargarSelectoresMontaje();

    const selEst = document.getElementById('adminMontajeEstacion');
    if (selEst) selEst.value = mon.puntoId || '';

    renderTornilleriaMontaje();
renderMaterialesMontaje();
renderPiezasMontaje();
renderPasosMontaje();

    document.getElementById('adminMontajesForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cerrarFormMontaje() {
    document.getElementById('adminMontajesForm').style.display = 'none';
    document.getElementById('adminMontajeId').value = '';
    window.APP.adminMontajeActual = { tornilleria: [], materiales: [], piezas: [], pasos: [] };
}

async function guardarMontajeAdmin() {
    const id = document.getElementById('adminMontajeId').value || 'mont_' + Date.now();
    const nombre = document.getElementById('adminMontajeNombre').value.trim();
    const orden = document.getElementById('adminMontajeOrden').value;
    const tiempo = parseFloat(document.getElementById('adminMontajeTiempo').value) || 0;
    const icono = document.getElementById('adminMontajeIcono').value.trim();
    const descripcion = document.getElementById('adminMontajeDescripcion').value.trim();
    const campoDepende = document.getElementById('adminMontajeDependeDe');
    const dependeEsLista = campoDepende.tagName === 'SELECT';
    const dependeDeId = dependeEsLista ? campoDepende.value : '';
    const montajesTodos = await cargarFirebase('montajes');
    const dependeDe = dependeEsLista ? (montajesTodos[dependeDeId]?.nombre || '') : campoDepende.value.trim();

    let cursor = dependeDeId;
    for (let saltos = 0; cursor && saltos < 50; saltos++) {
        if (cursor === id) {
            alertar('Dependencia circular: ese montaje ya depende de este.', { tipo: 'warning' });
            return;
        }
        cursor = typeof resolverDependeDe === 'function' ? resolverDependeDe(montajesTodos[cursor] || {}, montajesTodos) : null;
    }
    const estacionId = document.getElementById('adminMontajeEstacion').value;
    const pares = document.getElementById('adminMontajePares').value.trim();
    const instrucciones = document.getElementById('adminMontajeInstrucciones').value;
    const video = document.getElementById('adminMontajeVideo').value.trim();
    const pdfsTexto = (document.getElementById('adminMontajePdfs')?.value || '').trim();
    const fotosTexto = (document.getElementById('adminMontajeFotos')?.value || '').trim();
    const usaSubida = !!document.getElementById('adminMontajePdfsLista');

    if (!nombre) { alertar('El nombre es obligatorio', { tipo: 'warning' }); return; }
    if (!orden) { alertar('El orden es obligatorio', { tipo: 'warning' }); return; }
    if (tiempo <= 0) { alertar('El tiempo debe ser mayor que 0', { tipo: 'warning' }); return; }
    if (!estacionId) { alertar('Debes seleccionar una estación', { tipo: 'warning' }); return; }

    const estaciones = await cargarFirebase('estaciones');
    const est = estaciones[estacionId];
    if (!est) { alertar('Estación no encontrada', { tipo: 'danger' }); return; }
    const modelo = est.modelo || 'MS3';

    const rec = window.APP.adminMontajeActual;

    const tornilleriaStr = rec.tornilleria.map(t => `${t.ref}=${t.cantidad}`).join('||');

    const materialesStr = rec.materiales.map(m =>
        `${m.ref}=${m.cantidad}=${encodeURIComponent(m.nombre)}=${encodeURIComponent(m.codigo)}`
    ).join('||');

    const piezasStr = rec.piezas.map(p => `${p.codigo}=${p.cantidad}`).join(',');

    const pdfs = usaSubida
        ? adjuntosMontaje().pdfs.map(p => ({ url: p.url, nombre: p.nombre || 'Documento.pdf', tamaño: p.tamaño || null }))
        : (pdfsTexto ? pdfsTexto.split('\n').map(l => l.trim()).filter(l => l) : []);
    const fotos = usaSubida
        ? adjuntosMontaje().fotos.slice()
        : (fotosTexto ? fotosTexto.split('\n').map(l => l.trim()).filter(l => l) : []);

const pasos = (rec.pasos || []).map(p => ({
    id: p.id,
    texto: p.texto
}));

const data = {
    nombre: nombre,
    orden: String(orden),
    tiempoHoras: tiempo,
    icono: icono,
    descripcion: descripcion,
    dependeDe: dependeDe,
    dependeDeId: dependeDeId,
    puntoId: estacionId,
    modelo: modelo,
    paresRequeridos: pares,
    tornilleria: tornilleriaStr,
    materialesNecesarios: materialesStr,
    piezasKanban: piezasStr,
    instrucciones: instrucciones,
    videoInstrucciones: video,
    instruccionesPdfs: pdfs,
    instruccionesFotos: fotos,
    pasos: pasos
};

const selOperarioGuardar = document.getElementById('adminMontajeOperario');
if (selOperarioGuardar) data.operarioAsignado = selOperarioGuardar.value;

const chkTQCGuardar = document.getElementById('adminMontajeEsTQC');
if (chkTQCGuardar) data.esTQC = chkTQCGuardar.checked;

    mostrarLoading('Guardando montaje...');
    const ok = await guardarFirebase('montajes', id, data);
    ocultarLoading();

    if (ok) {
        toast('✅ Montaje guardado', '#10b981');
        cerrarFormMontaje();
        cargarAdminMontajes();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function eliminarMontajeAdmin() {
    const id = document.getElementById('adminMontajeId').value;
    if (!id) return;

    const nombre = document.getElementById('adminMontajeNombre').value || 'este montaje';

    const ok = await confirmar(
        `¿Eliminar el montaje "${nombre}"?\n\nEsta acción no se puede deshacer.`,
        { titulo: '🗑️ Eliminar montaje', tipo: 'danger', okTexto: '🗑️ Eliminar' }
    );
    if (!ok) return;

    mostrarLoading('Eliminando...');
    const eliminado = await eliminarFirebase('montajes', id);
    ocultarLoading();

    if (eliminado) {
        toast('🗑️ Montaje eliminado', '#10b981');
        cerrarFormMontaje();
        cargarAdminMontajes();
    } else {
        toast('❌ Error al eliminar', '#ef4444');
    }
}

async function duplicarMontajeAdmin(id) {
    const montajes = await cargarFirebase('montajes');
    const mon = montajes[id];
    if (!mon) return;

    const nombreOriginal = mon.nombre || 'Sin nombre';
    const nuevoNombre = await preguntar(
        `Duplicar montaje "${nombreOriginal}"\n\nEscribe el nombre del nuevo montaje:`,
        `${nombreOriginal} (copia)`
    );
    if (!nuevoNombre) return;

    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) { alertar('El nombre no puede estar vacío', { tipo: 'warning' }); return; }

    const nuevoId = 'mont_' + Date.now();

    mostrarLoading('Duplicando montaje...');
    const ok = await guardarFirebase('montajes', nuevoId, {
        ...mon,
        nombre: nombreLimpio,
        orden: String(parseInt(mon.orden) + 1 || 1)
    });
    ocultarLoading();

    if (ok) {
        toast(`✅ Montaje duplicado: ${nombreLimpio}`, '#10b981');
        cargarAdminMontajes();
    } else {
        toast('❌ Error al duplicar', '#ef4444');
    }
}

async function cargarSelectoresMontaje() {
    const [estaciones, tornilleriaCat, materialesCat, piezasCat] = await Promise.all([
        cargarFirebase('estaciones', true),
        cargarFirebase('tornilleria_catalogo', true),
        cargarFirebase('materiales_catalogo', true),
        cargarFirebase('piezas_kanban', true)
    ]);

    const selEst = document.getElementById('adminMontajeEstacion');
    if (selEst) {
        const valorActual = selEst.value;
        selEst.innerHTML = '<option value="">— Selecciona una estación —</option>';

        const arrEst = Object.entries(estaciones).sort((a, b) => {
            if (a[1].modelo !== b[1].modelo) return a[1].modelo === 'MS3' ? -1 : 1;
            const numA = parseInt((a[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            const numB = parseInt((b[1].nombre || '').match(/(\d+)/)?.[0] || '99');
            return numA - numB;
        });

        arrEst.forEach(([id, e]) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `${e.modelo === 'MS3' ? '🔷' : '🔶'} ${e.nombre || 'Sin nombre'} (${e.modelo})`;
            selEst.appendChild(opt);
        });

        if (valorActual) selEst.value = valorActual;
    }

const selTorn = document.getElementById('adminMontajeTornSelector');
if (selTorn) {
    selTorn.innerHTML = '<option value="">— Selecciona tornillería —</option>';

    const ordenTipo = ['Arandela', 'Tornillo', 'Tuerca', 'Otro'];
    const iconosTipo = { 'Arandela': '🔘', 'Tornillo': '🔩', 'Tuerca': '⚙️', 'Otro': '📦' };

    const grupos = {};
    Object.entries(tornilleriaCat).forEach(([id, t]) => {
        const tipo = t.tipo || 'Otro';
        if (!grupos[tipo]) grupos[tipo] = [];
        grupos[tipo].push([id, t]);
    });

    ordenTipo.forEach(tipo => {
        if (!grupos[tipo]) return;
        grupos[tipo].sort((a, b) => compararTornilleriaNatural(a[1].nombre, b[1].nombre));
    });

    ordenTipo.forEach(tipo => {
        const items = grupos[tipo];
        if (!items || !items.length) return;

        const optgroup = document.createElement('optgroup');
        optgroup.label = `${iconosTipo[tipo] || '📦'} ${tipo.toUpperCase()}S`;

        items.forEach(([id, t]) => {
            const opt = document.createElement('option');
            opt.value = id;
            const ubic = t.ubicacion ? ` · 📍 ${t.ubicacion}` : '';
            const codigo = t.codigo ? ` (${t.codigo})` : '';
            opt.textContent = `${t.nombre || 'Sin nombre'}${codigo}${ubic}`;
            opt.dataset.ref = id;
            opt.dataset.nombre = t.nombre || id;
            opt.dataset.codigo = t.codigo || '';
            optgroup.appendChild(opt);
        });

        selTorn.appendChild(optgroup);
    });
}

    const selMat = document.getElementById('adminMontajeMatSelector');
    if (selMat) {
        selMat.innerHTML = '<option value="">— Selecciona material —</option>';

        const arrMat = Object.entries(materialesCat).sort((a, b) =>
            (a[1].nombre || '').localeCompare(b[1].nombre || '')
        );

        arrMat.forEach(([id, m]) => {
            const opt = document.createElement('option');
            opt.value = id;
            const icono = m.requiereEscaneo ? '📷' : '🧪';
            const codigo = m.codigo ? ` (${m.codigo})` : '';
            opt.textContent = `${icono} ${m.nombre || 'Sin nombre'}${codigo}`;
            opt.dataset.ref = id;
            opt.dataset.nombre = m.nombre || id;
            opt.dataset.codigo = m.codigo || '';
            opt.dataset.requiereEscaneo = m.requiereEscaneo ? '1' : '0';
            selMat.appendChild(opt);
        });
    }

    const selPieza = document.getElementById('adminMontajePiezaSelector');
    if (selPieza) {
        selPieza.innerHTML = '<option value="">— Selecciona pieza —</option>';

        const arrPiezas = Object.entries(piezasCat).sort((a, b) =>
            (a[1].nombre || '').localeCompare(b[1].nombre || '')
        );

        arrPiezas.forEach(([id, p]) => {
            const opt = document.createElement('option');
            const codigo = p.codigo || id;
            const ubic = p.ubicacion ? ` · 📍 ${p.ubicacion}` : '';
            opt.value = codigo;
            opt.textContent = `🔗 ${p.nombre || codigo} (${codigo})${ubic}`;
            opt.dataset.codigo = codigo;
            opt.dataset.nombre = p.nombre || codigo;
            selPieza.appendChild(opt);
        });
    }
}

function onCambioEstacionMontaje() {
    actualizarPreviewMontaje();
}

function actualizarPreviewMontaje() {
    const rec = window.APP.adminMontajeActual || { tornilleria: [], materiales: [], piezas: [] };

    const elTorn = document.getElementById('adminMontajeTornCount');
    if (elTorn) elTorn.textContent = `(${rec.tornilleria.length})`;

    const elMat = document.getElementById('adminMontajeMatCount');
    if (elMat) elMat.textContent = `(${rec.materiales.length})`;

    const elPieza = document.getElementById('adminMontajePiezaCount');
    if (elPieza) elPieza.textContent = `(${rec.piezas.length})`;
}

function prepararUIAdjuntosMontaje() {
    if (document.getElementById('adminMontajePdfsLista')) return;

    const textoPdfs = document.getElementById('adminMontajePdfs');
    const textoFotos = document.getElementById('adminMontajeFotos');
    const grupoPdfs = textoPdfs?.closest('.form-group');
    const grupoFotos = textoFotos?.closest('.form-group');
    if (!grupoPdfs || !grupoFotos) return;

    const entradaUrl = (tipo, id) => `
        <input type="text" id="${id}" placeholder="o pega una URL" style="flex:1;min-width:140px;padding:0.5rem;border:1px solid var(--gray-300);border-radius:6px;font-size:0.8rem;font-family:inherit;">
        <button type="button" class="btn btn-sm" onclick="añadirUrlAdjuntoMontaje('${tipo}')">Añadir</button>`;

    grupoPdfs.innerHTML = `
        <label>📄 PDFs</label>
        <div id="adminMontajePdfsLista" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;"></div>
        <input type="file" id="adminMontajePdfsArchivo" accept="application/pdf" multiple style="display:none;" onchange="subirAdjuntosMontaje('pdfs', this)">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('adminMontajePdfsArchivo').click()">⬆️ Subir PDF</button>
            ${entradaUrl('pdfs', 'adminMontajePdfsUrl')}
        </div>
        <textarea id="adminMontajePdfs" style="display:none;"></textarea>
    `;

    grupoFotos.innerHTML = `
        <label>🖼️ Fotos</label>
        <div id="adminMontajeFotosLista" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;"></div>
        <input type="file" id="adminMontajeFotosArchivo" accept="image/*" multiple style="display:none;" onchange="subirAdjuntosMontaje('fotos', this)">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('adminMontajeFotosArchivo').click()">⬆️ Subir foto</button>
            ${entradaUrl('fotos', 'adminMontajeFotosUrl')}
        </div>
        <textarea id="adminMontajeFotos" style="display:none;"></textarea>
    `;
}

function adjuntosMontaje() {
    if (!window.APP.adminMontajeAdjuntos) window.APP.adminMontajeAdjuntos = { pdfs: [], fotos: [] };
    return window.APP.adminMontajeAdjuntos;
}

function nombreDesdeUrlAdjunto(url) {
    try {
        return decodeURIComponent(String(url).split('?')[0].split('/').pop()) || 'Documento.pdf';
    } catch (e) {
        return 'Documento.pdf';
    }
}

function limpiarAdjuntosMontaje() {
    const adj = adjuntosMontaje();
    adj.pdfs = [];
    adj.fotos = [];
    renderAdjuntosMontaje();
}

function cargarAdjuntosMontaje(mon) {
    const adj = adjuntosMontaje();
    adj.pdfs = (Array.isArray(mon.instruccionesPdfs) ? mon.instruccionesPdfs : []).map(p =>
        typeof p === 'string' ? { url: p, nombre: nombreDesdeUrlAdjunto(p) } : p
    );
    adj.fotos = (Array.isArray(mon.instruccionesFotos) ? mon.instruccionesFotos : []).map(f =>
        typeof f === 'string' ? f : f.url
    );

    const textoPdfs = document.getElementById('adminMontajePdfs');
    if (textoPdfs) textoPdfs.value = adj.pdfs.map(p => p.url).join('\n');
    const textoFotos = document.getElementById('adminMontajeFotos');
    if (textoFotos) textoFotos.value = adj.fotos.join('\n');

    renderAdjuntosMontaje();
}

function renderAdjuntosMontaje() {
    const adj = adjuntosMontaje();

    const contPdfs = document.getElementById('adminMontajePdfsLista');
    if (contPdfs) {
        contPdfs.innerHTML = adj.pdfs.length ? adj.pdfs.map((p, i) => `
            <div style="display:flex;align-items:center;gap:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:8px 10px;">
                <span style="font-size:1.3rem;">📄</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.8rem;color:#991b1b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.nombre || 'Documento.pdf'}</div>
                    ${p.tamaño ? `<div style="font-size:0.68rem;color:#b91c1c;">${(p.tamaño / 1024).toFixed(0)} KB</div>` : ''}
                </div>
                <button type="button" onclick="quitarAdjuntoMontaje('pdfs', ${i})" style="background:white;border:1px solid #fecaca;border-radius:8px;width:32px;height:32px;cursor:pointer;color:#b91c1c;font-size:0.9rem;">✕</button>
            </div>
        `).join('') : '<div style="font-size:0.75rem;color:#94a3b8;">Sin PDFs</div>';
    }

    const contFotos = document.getElementById('adminMontajeFotosLista');
    if (contFotos) {
        contFotos.innerHTML = adj.fotos.length ? adj.fotos.map((url, i) => `
            <div style="position:relative;width:88px;height:88px;">
                <img src="${url}" onclick="verFotoGrande('${url}')" style="width:88px;height:88px;object-fit:cover;border-radius:10px;border:1px solid #e5e7eb;cursor:pointer;">
                <button type="button" onclick="quitarAdjuntoMontaje('fotos', ${i})" style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:white;border:2px solid white;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:0.7rem;line-height:1;">✕</button>
            </div>
        `).join('') : '<div style="font-size:0.75rem;color:#94a3b8;">Sin fotos</div>';
    }
}

function quitarAdjuntoMontaje(tipo, indice) {
    adjuntosMontaje()[tipo].splice(indice, 1);
    renderAdjuntosMontaje();
}

function añadirUrlAdjuntoMontaje(tipo) {
    const input = document.getElementById(tipo === 'pdfs' ? 'adminMontajePdfsUrl' : 'adminMontajeFotosUrl');
    const url = (input?.value || '').trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
        toast('⚠️ La URL debe empezar por http:// o https://', '#f59e0b');
        return;
    }
    if (tipo === 'pdfs') adjuntosMontaje().pdfs.push({ url, nombre: nombreDesdeUrlAdjunto(url) });
    else adjuntosMontaje().fotos.push(url);
    input.value = '';
    renderAdjuntosMontaje();
}

async function comprimirImagenAdjunto(archivo, maxLado = 1600, calidad = 0.82) {
    if (!archivo.type.startsWith('image/') || archivo.type === 'image/gif') return archivo;
    try {
        const imagen = await createImageBitmap(archivo);
        const escala = Math.min(1, maxLado / Math.max(imagen.width, imagen.height));
        if (escala === 1 && archivo.size < 1.5 * 1024 * 1024) {
            imagen.close?.();
            return archivo;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(imagen.width * escala);
        canvas.height = Math.round(imagen.height * escala);
        canvas.getContext('2d').drawImage(imagen, 0, 0, canvas.width, canvas.height);
        imagen.close?.();
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', calidad));
        if (!blob || blob.size >= archivo.size) return archivo;
        return new File([blob], archivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch (e) {
        return archivo;
    }
}

async function subirAdjuntosMontaje(tipo, input) {
    const archivos = [...(input.files || [])];
    input.value = '';
    if (!archivos.length) return;

    const esPdf = tipo === 'pdfs';
    const adj = adjuntosMontaje();
    let subidos = 0;

    for (let archivo of archivos) {
        if (esPdf && archivo.type !== 'application/pdf') {
            toast(`⚠️ ${archivo.name} no es un PDF`, '#f59e0b');
            continue;
        }
        if (!esPdf && !archivo.type.startsWith('image/')) {
            toast(`⚠️ ${archivo.name} no es una imagen`, '#f59e0b');
            continue;
        }
        if (!esPdf) archivo = await comprimirImagenAdjunto(archivo);
        if (archivo.size > 10 * 1024 * 1024) {
            toast(`⚠️ ${archivo.name} supera los 10 MB`, '#f59e0b');
            continue;
        }

        mostrarLoading(`Subiendo ${archivo.name}...`);
        const url = await subirACloudinary(archivo);
        ocultarLoading();

        if (!url) {
            toast(`❌ No se pudo subir ${archivo.name}`, '#ef4444');
            continue;
        }
        if (esPdf) adj.pdfs.push({ url, nombre: archivo.name, tamaño: archivo.size });
        else adj.fotos.push(url);
        subidos++;
    }

    renderAdjuntosMontaje();
    if (subidos) {
        toast(`✅ ${subidos} archivo${subidos !== 1 ? 's' : ''} subido${subidos !== 1 ? 's' : ''} · pulsa Guardar Montaje`, '#10b981', 3500);
    }
}

async function prepararSelectDependenciaMontaje(idActual) {
    const campo = document.getElementById('adminMontajeDependeDe');
    if (!campo) return;

    const [montajes, estaciones] = await Promise.all([
        cargarFirebase('montajes'),
        cargarFirebase('estaciones')
    ]);

    const opciones = Object.entries(montajes)
        .filter(([id]) => id !== idActual)
        .sort((a, b) => {
            const modelo = (a[1].modelo || '').localeCompare(b[1].modelo || '');
            if (modelo) return modelo;
            const estacion = (estaciones[a[1].puntoId]?.nombre || '').localeCompare(estaciones[b[1].puntoId]?.nombre || '', 'es', { numeric: true });
            if (estacion) return estacion;
            return (parseInt(a[1].orden) || 0) - (parseInt(b[1].orden) || 0);
        });

    let lista = campo;
    if (campo.tagName !== 'SELECT') {
        lista = document.createElement('select');
        lista.id = 'adminMontajeDependeDe';
        lista.style.cssText = 'width:100%;padding:0.55rem;border:1px solid var(--gray-300);border-radius:6px;font-size:0.82rem;font-family:inherit;';
        campo.replaceWith(lista);
    }

    lista.innerHTML = '<option value="">— Ninguno —</option>' + opciones.map(([id, m]) =>
        `<option value="${id}">${m.modelo || ''} · ${estaciones[m.puntoId]?.nombre || 'Sin estación'} · ${m.orden || '?'}. ${m.nombre || 'Sin nombre'}</option>`
    ).join('');

    const ayuda = lista.parentElement?.querySelector('small');
    if (ayuda) ayuda.textContent = 'Si este montaje solo se puede hacer después de otro. El operario recibe un aviso cuando ese montaje termina.';
}
