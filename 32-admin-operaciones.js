async function cargarAdminOperaciones() {
    const container = document.getElementById('adminOperacionesList');
    const contador = document.getElementById('adminOperacionesContador');
    if (!container) return;

    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">⏳ Cargando...</div>';

    const [operaciones, montajes] = await Promise.all([
        cargarFirebase('operaciones', true),
        cargarFirebase('montajes')
    ]);

    const busqueda = (document.getElementById('adminOperacionesBusqueda')?.value || '').toLowerCase().trim();
    const filtro = document.getElementById('filtroModeloAdminOperaciones')?.value || 'todos';

    let arr = Object.entries(operaciones);

    if (filtro !== 'todos') arr = arr.filter(([id, o]) => o.modelo === filtro);
    if (busqueda) {
        arr = arr.filter(([id, o]) =>
            String(o.numero || '').toLowerCase().includes(busqueda) ||
            (o.descripcion || '').toLowerCase().includes(busqueda)
        );
    }

    arr.sort((a, b) => String(b[1].numero || '').localeCompare(String(a[1].numero || ''), undefined, { numeric: true }));

    if (contador) contador.textContent = `${arr.length} operación${arr.length !== 1 ? 'es' : ''}`;

    if (!arr.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                ${busqueda ? '🔍 Sin resultados para "' + busqueda + '"' : '📭 No hay operaciones. Crea la primera.'}
            </div>
        `;
        return;
    }

    const colores = {
        MS3: { bg: '#ecfdf5', border: '#a7f3d0', accent: '#10b981', text: '#047857', icono: '🔷' },
        DC3: { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', icono: '🔶' }
    };

    container.innerHTML = arr.map(([id, op]) => {
        const p = colores[op.modelo] || colores.MS3;
        const numMontajes = Object.values(montajes).filter(m => m.modelo === op.modelo).length;

        return `
            <div onclick="editarOperacionAdmin('${id}')"
                style="background:${p.bg};border:1px solid ${p.border};border-left:4px solid ${p.accent};border-radius:14px;padding:14px 16px;cursor:pointer;transition:all 0.2s ease;position:relative;overflow:hidden;"
                onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px ${p.accent}22';"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='';">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <span style="background:white;color:${p.text};padding:4px 10px;border-radius:8px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;gap:4px;border:1px solid ${p.border};">${p.icono} ${op.modelo || 'MS3'}</span>
                    <button onclick="event.stopPropagation();duplicarOperacionAdmin('${id}')"
                        style="background:white;border:1px solid ${p.border};border-radius:6px;padding:4px 8px;font-size:0.7rem;color:${p.text};cursor:pointer;font-family:inherit;font-weight:600;"
                        onmouseover="this.style.background='${p.bg}'" onmouseout="this.style.background='white'">📋 Copiar</button>
                </div>

                <div style="font-weight:800;font-size:1.5rem;color:${p.text};font-family:'SF Mono', Monaco, monospace;letter-spacing:-0.02em;line-height:1.1;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${op.numero || '—'}</div>

                ${op.descripcion ? `
                    <div style="font-size:0.78rem;color:${p.text};opacity:0.85;font-weight:500;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${op.descripcion}</div>
                ` : `
                    <div style="font-size:0.78rem;color:${p.text};opacity:0.5;font-style:italic;">Sin descripción</div>
                `}

                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;margin-top:10px;border-top:1px solid ${p.border};">
                    <span style="font-size:0.72rem;color:${p.text};opacity:0.7;font-weight:600;display:flex;align-items:center;gap:4px;">📦 ${numMontajes} montaje${numMontajes !== 1 ? 's' : ''}</span>
                    <span style="font-size:1rem;color:${p.accent};opacity:0.6;">→</span>
                </div>
            </div>
        `;
    }).join('');
}

function mostrarFormNuevaOperacion() {
    document.getElementById('adminOperacionesForm').style.display = 'block';
    document.getElementById('adminOperacionFormTitulo').textContent = 'Nueva Operación';

    document.getElementById('adminOperacionId').value = '';
    document.getElementById('adminOperacionNumero').value = '';
    document.getElementById('adminOperacionDescripcion').value = '';
    document.getElementById('radioOpModeloMS3').checked = true;
    document.getElementById('btnEliminarOperacion').style.display = 'none';

    actualizarEstilosRadiosOperacion();
    actualizarPreviewOperacion();

    document.getElementById('adminOperacionesForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('adminOperacionNumero').focus(), 300);
}

function editarOperacionAdmin(id) {
    cargarFirebase('operaciones').then(ops => {
        const op = ops[id];
        if (!op) return;

        document.getElementById('adminOperacionesForm').style.display = 'block';
        document.getElementById('adminOperacionFormTitulo').textContent = 'Editar Operación';

        document.getElementById('adminOperacionId').value = id;
        document.getElementById('adminOperacionNumero').value = op.numero || '';
        document.getElementById('adminOperacionDescripcion').value = op.descripcion || '';

        if (op.modelo === 'DC3') document.getElementById('radioOpModeloDC3').checked = true;
        else document.getElementById('radioOpModeloMS3').checked = true;

        document.getElementById('btnEliminarOperacion').style.display = 'inline-flex';

        actualizarEstilosRadiosOperacion();
        actualizarPreviewOperacion();

        document.getElementById('adminOperacionesForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function cerrarFormOperacion() {
    document.getElementById('adminOperacionesForm').style.display = 'none';
    document.getElementById('adminOperacionId').value = '';
    document.getElementById('adminOperacionNumero').value = '';
    document.getElementById('adminOperacionDescripcion').value = '';
    document.getElementById('radioOpModeloMS3').checked = true;
    document.getElementById('btnEliminarOperacion').style.display = 'none';
}

function actualizarEstilosRadiosOperacion() {
    const ms3Checked = document.getElementById('radioOpModeloMS3')?.checked;
    const dc3Checked = document.getElementById('radioOpModeloDC3')?.checked;

    const labelMS3 = document.getElementById('radioOpModeloMS3Label');
    const labelDC3 = document.getElementById('radioOpModeloDC3Label');

    if (labelMS3) {
        if (ms3Checked) {
            labelMS3.style.borderColor = '#10b981';
            labelMS3.style.background = '#ecfdf5';
            labelMS3.style.color = '#047857';
        } else {
            labelMS3.style.borderColor = '#cbd5e1';
            labelMS3.style.background = 'white';
            labelMS3.style.color = '#64748b';
        }
    }

    if (labelDC3) {
        if (dc3Checked) {
            labelDC3.style.borderColor = '#3b82f6';
            labelDC3.style.background = '#eff6ff';
            labelDC3.style.color = '#1d4ed8';
        } else {
            labelDC3.style.borderColor = '#cbd5e1';
            labelDC3.style.background = 'white';
            labelDC3.style.color = '#64748b';
        }
    }
}

function actualizarPreviewOperacion() {
    actualizarEstilosRadiosOperacion();

    const preview = document.getElementById('adminOperacionPreview');
    if (!preview) return;

    const numero = document.getElementById('adminOperacionNumero')?.value || '—';
    const descripcion = document.getElementById('adminOperacionDescripcion')?.value || '';
    const modelo = document.getElementById('radioOpModeloDC3')?.checked ? 'DC3' : 'MS3';

    const colores = {
        MS3: { bg: '#ecfdf5', border: '#a7f3d0', accent: '#10b981', text: '#047857', icono: '🔷' },
        DC3: { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', icono: '🔶' }
    };
    const p = colores[modelo];

    preview.innerHTML = `
        <div style="width:40px;height:40px;background:${p.bg};border:1px solid ${p.border};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${p.icono}</div>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:1.1rem;color:${p.text};font-family:'SF Mono', Monaco, monospace;letter-spacing:-0.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${numero}</div>
            <div style="font-size:0.75rem;color:${p.text};font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;opacity:0.85;">
                <span>${modelo}</span>
                ${descripcion ? `<span style="color:#cbd5e1;">·</span><span style="opacity:0.7;font-weight:400;">${descripcion}</span>` : ''}
            </div>
        </div>
    `;
}

async function guardarOperacionAdmin() {
    const id = document.getElementById('adminOperacionId').value || 'op_' + Date.now();
    const numero = document.getElementById('adminOperacionNumero').value.trim();
    const descripcion = document.getElementById('adminOperacionDescripcion').value.trim();
    const modelo = document.getElementById('radioOpModeloDC3').checked ? 'DC3' : 'MS3';

    if (!numero) {
        alertar('El número de operación es obligatorio', { tipo: 'warning' });
        document.getElementById('adminOperacionNumero').focus();
        return;
    }

    const operaciones = await cargarFirebase('operaciones');
    const duplicado = Object.entries(operaciones).find(([oid, o]) =>
        oid !== id && o.modelo === modelo && String(o.numero || '').trim() === numero
    );
    if (duplicado) {
        alertar(`Ya existe una operación "${numero}" en el modelo ${modelo}`, { tipo: 'warning' });
        return;
    }

    mostrarLoading('Guardando operación...');
    const ok = await guardarFirebase('operaciones', id, { numero, descripcion, modelo });
    ocultarLoading();

    if (ok) {
        toast('✅ Operación guardada', '#10b981');
        cerrarFormOperacion();
        cargarAdminOperaciones();
        if (typeof cargarOperaciones === 'function') cargarOperaciones();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function duplicarOperacionAdmin(id) {
    const operaciones = await cargarFirebase('operaciones');
    const op = operaciones[id];
    if (!op) return;

    const numeroOriginal = op.numero || '—';
    const nuevoNumero = await preguntar(
        `Duplicar operación "${numeroOriginal}"\n\nEscribe el número de la nueva operación:`,
        `${numeroOriginal}-copia`
    );
    if (!nuevoNumero) return;

    const numeroLimpio = nuevoNumero.trim();
    if (!numeroLimpio) { alertar('El número no puede estar vacío', { tipo: 'warning' }); return; }

    const duplicado = Object.values(operaciones).find(o =>
        o.modelo === op.modelo && String(o.numero || '').trim() === numeroLimpio
    );
    if (duplicado) { alertar(`Ya existe la operación "${numeroLimpio}" en ${op.modelo}`, { tipo: 'warning' }); return; }

    const nuevoId = 'op_' + Date.now();

    mostrarLoading('Duplicando operación...');
    const ok = await guardarFirebase('operaciones', nuevoId, {
        numero: numeroLimpio,
        descripcion: op.descripcion || '',
        modelo: op.modelo || 'MS3'
    });
    ocultarLoading();

    if (ok) {
        toast(`✅ Operación duplicada: ${numeroLimpio}`, '#10b981');
        cargarAdminOperaciones();
    } else {
        toast('❌ Error al duplicar', '#ef4444');
    }
}

async function eliminarOperacionAdmin() {
    const id = document.getElementById('adminOperacionId').value;
    if (!id) return;

    const numero = document.getElementById('adminOperacionNumero').value || 'esta operación';

    const historial = await cargarFirebase('historial_montajes');
    const registrosOperacion = Object.values(historial).filter(h => h.operacionId === id);

    if (registrosOperacion.length > 0) {
        const ok = await confirmar(
            `⚠️ La operación "${numero}" tiene ${registrosOperacion.length} registro(s) de montajes completados.\n\nSi la eliminas, esos registros quedarán huérfanos.\n\n¿Estás seguro?`,
            { titulo: '⚠️ Eliminar con historial', tipo: 'danger', okTexto: '🗑️ Eliminar de todas formas' }
        );
        if (!ok) return;
    } else {
        const ok = await confirmar(
            `¿Eliminar la operación "${numero}"?\n\nEsta acción no se puede deshacer.`,
            { titulo: '🗑️ Eliminar operación', tipo: 'danger', okTexto: '??️ Eliminar' }
        );
        if (!ok) return;
    }

    mostrarLoading('Eliminando...');
    const eliminado = await eliminarFirebase('operaciones', id);
    ocultarLoading();

    if (eliminado) {
        toast('🗑️ Operación eliminada', '#10b981');
        cerrarFormOperacion();
        cargarAdminOperaciones();
        if (typeof cargarOperaciones === 'function') cargarOperaciones();
    } else {
        toast('❌ Error al eliminar', '#ef4444');
    }
}
