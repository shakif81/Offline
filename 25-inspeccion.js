window.APP._inspeccionAdmin = {
    operacionId: null,
    puntos: []
};

async function iniciarInspeccion() {
    const sel = document.getElementById('inspeccionOperacionSelect');
    if (!sel) return;

    const operaciones = await cargarFirebase('operaciones', true);
    const arr = Object.entries(operaciones).sort((a, b) =>
        String(b[1].numero || '').localeCompare(String(a[1].numero || ''), undefined, { numeric: true })
    );

    const valorActual = sel.value;
    sel.innerHTML = '<option value="">— Selecciona una operación —</option>';
    arr.forEach(([id, op]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `${op.modelo === 'MS3' ? '🔷' : '🔶'} Op. ${op.numero} (${op.modelo || 'MS3'})`;
        sel.appendChild(opt);
    });

    if (valorActual) sel.value = valorActual;
}

async function cargarInspeccionOperacion() {
    const operacionId = document.getElementById('inspeccionOperacionSelect')?.value;
    const cont = document.getElementById('inspeccionContenido');
    if (!cont) return;

    if (!operacionId) {
        cont.innerHTML = '<div class="empty-state">👆 Selecciona una operación para empezar</div>';
        return;
    }

    cont.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const [operaciones, inspecciones] = await Promise.all([
        cargarFirebase('operaciones'),
        cargarFirebase('inspecciones_caldereria', true)
    ]);

    const op = operaciones[operacionId];
    if (!op) {
        cont.innerHTML = '<div class="empty-state">⚠️ Operación no encontrada</div>';
        return;
    }

    const insp = inspecciones[operacionId];

    if (insp) {
        window.APP._inspeccionAdmin = {
            operacionId,
            puntos: (insp.puntos || []).map(p => ({ ...p }))
        };
    } else {
        window.APP._inspeccionAdmin = {
            operacionId,
            puntos: []
        };
    }

    renderFormularioInspeccionAdmin();
}

function renderFormularioInspeccionAdmin() {
    const cont = document.getElementById('inspeccionContenido');
    if (!cont) return;

    const opId = window.APP._inspeccionAdmin.operacionId;
    const puntos = window.APP._inspeccionAdmin.puntos;

    const totalPuntos = puntos.length;
const aplicadas = puntos.filter(p => p.correccion?.aplicada).length;
const pendientes = totalPuntos - aplicadas;

    cont.innerHTML = `
        <!-- CABECERA -->
        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:1rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                <div style="font-weight:700;color:#1e293b;font-size:0.95rem;">
                    📋 Puntos de inspección
                </div>
                <div style="display:flex;gap:6px;font-size:0.72rem;font-weight:700;flex-wrap:wrap;">
    <span style="background:#fef2f2;color:#b91c1c;padding:3px 10px;border-radius:99px;">⚠️ ${totalPuntos} incidencia${totalPuntos !== 1 ? 's' : ''}</span>
    ${aplicadas > 0 ? `<span style="background:#ecfdf5;color:#047857;padding:3px 10px;border-radius:99px;">✅ ${aplicadas} corregida${aplicadas !== 1 ? 's' : ''}</span>` : ''}
    ${pendientes > 0 ? `<span style="background:#fff7ed;color:#c2410c;padding:3px 10px;border-radius:99px;">⏳ ${pendientes} pendiente${pendientes !== 1 ? 's' : ''}</span>` : ''}
</div>
            </div>

         <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <input type="text" id="inspNuevoPuntoTexto" placeholder="Escribe la incidencia o corrección..." maxlength="200" style="flex:1;min-width:200px;padding:10px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.85rem;font-family:inherit;" onkeydown="if(event.key==='Enter'){event.preventDefault();añadirPuntoInspeccion();}">
    <button type="button" onclick="añadirPuntoInspeccion()" style="
        padding:10px 20px;
        border:none;
        border-radius:8px;
        background:#ef4444;
        color:white;
        font-weight:700;
        font-size:0.82rem;
        cursor:pointer;
        font-family:inherit;
        display:flex;
        align-items:center;
        gap:6px;
    ">⚠️ Añadir incidencia</button>
</div>

        <!-- LISTA DE PUNTOS -->
        <div id="inspListaPuntos" style="display:flex;flex-direction:column;gap:8px;margin-bottom:1rem;">
            ${puntos.length === 0 ? `
                <div class="empty-state">
                    <div style="font-size:1.5rem;margin-bottom:6px;">📝</div>
                    <div style="font-weight:600;color:#1e293b;font-size:0.9rem;margin-bottom:4px;">Aún no hay puntos</div>
                    <div style="font-size:0.78rem;color:#94a3b8;">Escribe arriba el primer punto y pulsa ✅ o ⚠️</div>
                </div>
            ` : puntos.map((p, idx) => renderPuntoAdmin(p, idx)).join('')}
        </div>

        <!-- BOTONES -->
        ${puntos.length > 0 ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:1rem;border-top:1px solid #e5e7eb;">
                <button onclick="guardarInspeccionAdmin()" style="
                    flex:1;
                    min-width:150px;
                    padding:12px 20px;
                    border:none;
                    border-radius:10px;
                    background:#10b981;
                    color:white;
                    font-weight:700;
                    font-size:0.88rem;
                    cursor:pointer;
                    font-family:inherit;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:6px;
                ">💾 Guardar Inspección</button>
                ${inspExiste(opId) ? `
                    <button onclick="eliminarInspeccionAdmin()" style="
                        padding:12px 20px;
                        border:1px solid #fecaca;
                        border-radius:10px;
                        background:#fef2f2;
                        color:#b91c1c;
                        font-weight:700;
                        font-size:0.85rem;
                        cursor:pointer;
                        font-family:inherit;
                    ">🗑️ Eliminar</button>
                ` : ''}
            </div>
        ` : ''}
    `;
}

function renderPuntoAdmin(punto, idx) {
    const correccion = punto.correccion || {};
    const aplicada = correccion.aplicada === true;

    const colorBorde = aplicada ? '#10b981' : '#ef4444';
    const colorFondo = aplicada ? '#ecfdf5' : '#fef2f2';
    const icono = aplicada ? '✅' : '⚠️';

    return `
        <div style="background:${colorFondo};border:1px solid ${colorBorde}44;border-left:4px solid ${colorBorde};border-radius:10px;padding:12px 14px;">
            <div style="display:flex;align-items:flex-start;gap:10px;">
                <span style="font-size:1.1rem;flex-shrink:0;">${icono}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.85rem;color:#1e293b;line-height:1.4;">
                        ${punto.texto}
                    </div>
                    ${aplicada ? `
                        <div style="font-size:0.72rem;color:#047857;font-weight:700;margin-top:6px;display:inline-flex;align-items:center;gap:4px;background:#ecfdf5;padding:3px 10px;border-radius:99px;border:1px solid #a7f3d0;">
                            ✅ Corregida por ${correccion.aplicadaPor || '—'}
                            ${correccion.fechaAplicada ? ` · ${new Date(correccion.fechaAplicada).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                        </div>
                    ` : `
                        <div style="font-size:0.72rem;color:#b91c1c;font-weight:700;margin-top:6px;display:inline-flex;align-items:center;gap:4px;background:white;padding:3px 10px;border-radius:99px;border:1px solid #fecaca;">
                            ⏳ Pendiente de corregir
                        </div>
                    `}
                </div>
                <button type="button" onclick="editarPuntoInspeccion(${idx})"
                    style="background:white;border:1px solid #cbd5e1;border-radius:6px;width:30px;height:30px;cursor:pointer;color:#1d4ed8;font-size:0.85rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;"
                    title="Editar">✏️</button>
                <button type="button" onclick="quitarPuntoInspeccion(${idx})"
                    style="background:white;border:1px solid #cbd5e1;border-radius:6px;width:30px;height:30px;cursor:pointer;color:#64748b;font-size:0.85rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;"
                    title="Quitar">✕</button>
            </div>
        </div>
    `;
}

function inspExiste(operacionId) {
    const cache = window.APP.fbCache['inspecciones_caldereria'];
    if (!cache) return false;
    return !!cache.data[operacionId];
}

function añadirPuntoInspeccion() {
    const inp = document.getElementById('inspNuevoPuntoTexto');
    if (!inp) return;

    const texto = inp.value.trim();
    if (!texto) {
        toast('⚠️ Escribe la incidencia', '#f59e0b');
        return;
    }

    const punto = {
        id: 'pt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        texto,
        estado: 'falla',
        correccion: {
            aplicada: false,
            aplicadaPor: '',
            fechaAplicada: null
        }
    };

    window.APP._inspeccionAdmin.puntos.push(punto);
    inp.value = '';
    inp.focus();

    renderFormularioInspeccionAdmin();
    toast('⚠️ Incidencia añadida', '#ef4444', 1200);
}

async function editarPuntoInspeccion(idx) {
    const punto = window.APP._inspeccionAdmin.puntos[idx];
    if (!punto) return;

    const nuevoTexto = await preguntar(
        'Edita la incidencia:',
        punto.texto || ''
    );

    if (nuevoTexto === null) return;
    if (!nuevoTexto.trim()) {
        toast('⚠️ El texto no puede estar vacío', '#f59e0b');
        return;
    }

    punto.texto = nuevoTexto.trim();
    renderFormularioInspeccionAdmin();
    toast('✏️ Incidencia actualizada', '#10b981', 1200);
}

function quitarPuntoInspeccion(idx) {
    if (!window.APP._inspeccionAdmin.puntos[idx]) return;
    window.APP._inspeccionAdmin.puntos.splice(idx, 1);
    renderFormularioInspeccionAdmin();
}

async function guardarInspeccionAdmin() {
    const opId = window.APP._inspeccionAdmin.operacionId;
    if (!opId) return;

    const puntos = window.APP._inspeccionAdmin.puntos || [];

    if (!puntos.length) {
        alertar('Añade al menos un punto antes de guardar', { tipo: 'warning' });
        return;
    }

    const operaciones = await cargarFirebase('operaciones');
    const op = operaciones[opId];

    const inspecciones = await cargarFirebase('inspecciones_caldereria', true);
    const anterior = inspecciones[opId] || { puntos: [] };

    const puntosConEstado = puntos.map(p => {
    const ant = anterior.puntos?.find(ap => ap.id === p.id);

    const nuevoPunto = { ...p, estado: 'falla' };

    if (ant?.correccion?.aplicada) {
        nuevoPunto.correccion = ant.correccion;
    } else if (!nuevoPunto.correccion) {
        nuevoPunto.correccion = {
            aplicada: false,
            aplicadaPor: '',
            fechaAplicada: null
        };
    }

    return nuevoPunto;
});

    const data = {
        operacionId: opId,
        numeroOperacion: op?.numero || '—',
        modelo: op?.modelo || 'MS3',
        inspector: window.APP.operario?.nombre || 'Admin',
        fecha: anterior.fecha || new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString(),
        puntos: puntosConEstado
    };

    mostrarLoading('Guardando inspección...');
    const ok = await guardarFirebase('inspecciones_caldereria', opId, data);
    ocultarLoading();

    if (ok) {
        toast('✅ Inspección guardada', '#10b981');
        cargarInspeccionOperacion();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function eliminarInspeccionAdmin() {
    const opId = window.APP._inspeccionAdmin.operacionId;
    if (!opId) return;

    const ok = await confirmar(
        '¿Eliminar la inspección de esta operación?\n\nEl operario ya no verá los avisos.',
        { titulo: '🗑️ Eliminar inspección', tipo: 'danger', okTexto: '🗑️ Eliminar' }
    );
    if (!ok) return;

    await eliminarFirebase('inspecciones_caldereria', opId);
    window.APP._inspeccionAdmin.puntos = [];

    toast('🗑️ Inspección eliminada', '#10b981');
    renderFormularioInspeccionAdmin();
}

async function mostrarAvisoInspeccionCaldereria(operacionId) {
    document.getElementById('avisoInspCaldereria')?.remove();

    const inspecciones = await cargarFirebase('inspecciones_caldereria', true);
    const insp = inspecciones[operacionId];

    if (!insp) return;

    const puntos = insp.puntos || [];
    const fallas = puntos.filter(p => p.estado === 'falla');
    const fallasPendientes = fallas.filter(p => !p.correccion?.aplicada);

    if (fallas.length === 0) return;

    const todasCorregidas = fallasPendientes.length === 0;

    const aviso = document.createElement('div');
    aviso.id = 'avisoInspCaldereria';
    aviso.style.cssText = todasCorregidas
        ? `
            background: linear-gradient(135deg, #ecfdf5, #d1fae5);
            border: 2px solid #a7f3d0;
            border-left: 5px solid #10b981;
            border-radius: 12px;
            padding: 14px 18px;
            margin-bottom: 1rem;
        `
        : `
            background: linear-gradient(135deg, #fff7ed, #ffedd5);
            border: 2px solid #fed7aa;
            border-left: 5px solid #f97316;
            border-radius: 12px;
            padding: 14px 18px;
            margin-bottom: 1rem;
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
        `;

    aviso.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:${puntos.length ? '12px' : '0'};">
            <span style="font-size:1.5rem;">${todasCorregidas ? '✅' : '⚠️'}</span>
            <div style="flex:1;">
                <div style="font-weight:800;color:${todasCorregidas ? '#047857' : '#c2410c'};font-size:0.95rem;">
                    ${todasCorregidas ? 'Inspección de calderería OK' : 'Correcciones de calderería pendientes'}
                </div>
                <div style="font-size:0.75rem;color:${todasCorregidas ? '#059669' : '#9a3412'};margin-top:2px;">
                    ${todasCorregidas
                        ? `Todas las correcciones han sido aplicadas`
                        : `${fallasPendientes.length} falla${fallasPendientes.length > 1 ? 's' : ''} por corregir · Inspector: ${insp.inspector || '—'}`
                    }
                </div>
            </div>
        </div>
        ${fallas.length ? `
            <div style="display:flex;flex-direction:column;gap:6px;">
                ${fallas.map(p => {
                    const aplicada = p.correccion?.aplicada === true;
                    return `
                        <div style="background:white;border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;border:1px solid ${aplicada ? '#a7f3d0' : '#fed7aa'};">
                            <span style="font-size:1rem;">${aplicada ? '✅' : '⚠️'}</span>
                            <div style="flex:1;font-size:0.82rem;color:#1e293b;font-weight:600;line-height:1.4;">
                                ${p.texto}
                            </div>
                        ${aplicada ? `
    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
        <span style="font-size:0.68rem;color:#047857;font-weight:700;background:#ecfdf5;padding:3px 10px;border-radius:99px;">
            ✅ Corregida
        </span>
        <span style="font-size:0.65rem;color:#059669;font-weight:600;">
            ${p.correccion?.aplicadaPor || ''}
        </span>
    </div>
` : `
    <button onclick="marcarCorreccionAplicada('${operacionId}', '${p.id}')"
        style="
            padding:8px 14px;
            border:none;
            border-radius:8px;
            background:#10b981;
            color:white;
            font-size:0.75rem;
            font-weight:700;
            cursor:pointer;
            font-family:inherit;
            flex-shrink:0;
            display:flex;
            align-items:center;
            gap:4px;
        ">
        🔧 Corregir
    </button>
`}
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}
    `;

    const montajesList = document.getElementById('montajesList');
    if (montajesList && montajesList.parentNode) {
        montajesList.parentNode.insertBefore(aviso, montajesList);
    }
}

async function marcarCorreccionAplicada(operacionId, puntoId) {
    const ok = await confirmar(
        '¿Marcar esta corrección como realizada?',
        { titulo: '✅ Confirmar corrección', tipo: 'success', okTexto: '✅ Sí, corregida' }
    );
    if (!ok) return;

    try {
        const inspecciones = await cargarFirebase('inspecciones_caldereria', true);
        const insp = inspecciones[operacionId];
        if (!insp) return;

        const punto = insp.puntos.find(p => p.id === puntoId);
        if (!punto) return;

        if (!punto.correccion) punto.correccion = {};
        punto.correccion.aplicada = true;
        punto.correccion.aplicadaPor = window.APP.operario?.nombre || 'Operario';
        punto.correccion.fechaAplicada = new Date().toISOString();

        insp.ultimaActualizacion = new Date().toISOString();

        await guardarFirebase('inspecciones_caldereria', operacionId, insp);

        toast('✅ Corrección marcada como aplicada', '#10b981');

        mostrarAvisoInspeccionCaldereria(operacionId);
    } catch (e) {
        console.error('❌ Error:', e);
        toast('❌ Error al guardar', '#ef4444');
    }
}
