const COLORES_OPERARIO = [
    { valor: '#607d8b', nombre: 'Gris' },
    { valor: '#3b82f6', nombre: 'Azul' },
    { valor: '#10b981', nombre: 'Verde' },
    { valor: '#f59e0b', nombre: 'Naranja' },
    { valor: '#ef4444', nombre: 'Rojo' },
    { valor: '#8b5cf6', nombre: 'Morado' },
    { valor: '#ec4899', nombre: 'Rosa' },
    { valor: '#14b8a6', nombre: 'Turquesa' },
    { valor: '#f97316', nombre: 'Naranja oscuro' },
    { valor: '#1e293b', nombre: 'Negro' }
];

async function cargarAdminOperarios() {
    const container = document.getElementById('adminOperariosList');
    if (!container) return;

    container.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const operarios = await cargarFirebase('operarios', true);
    const busqueda = (document.getElementById('adminOperariosBusqueda')?.value || '').toLowerCase().trim();

    let arr = Object.entries(operarios);

    if (busqueda) {
        arr = arr.filter(([id, op]) =>
            (op.nombre || '').toLowerCase().includes(busqueda) ||
            (op.puesto || '').toLowerCase().includes(busqueda)
        );
    }

    arr.sort((a, b) => (a[1].nombre || '').localeCompare(b[1].nombre || ''));

    if (!arr.length) {
        container.innerHTML = `
            <div class="empty-state">
                ${busqueda ? '🔍 Sin resultados para "' + busqueda + '"' : '📭 No hay operarios. Crea el primero.'}
            </div>
        `;
        return;
    }

    container.innerHTML = arr.map(([id, op]) => {
        const tienePin = !!(op.pinHash || op.pin);
        const esAdmin = (op.puesto || '').toLowerCase().includes('admin');
        const esSupervisor = (op.puesto || '').toLowerCase().includes('supervisor');

        let puestoIcono = '👤';
        let puestoColor = '#64748b';
        if (esAdmin) { puestoIcono = '⚙️'; puestoColor = '#ef4444'; }
        else if (esSupervisor) { puestoIcono = '👨‍💼'; puestoColor = '#8b5cf6'; }

        return `
            <div class="list-item" onclick="editarOperarioAdmin('${id}')"
                style="display:flex;align-items:center;gap:12px;padding:12px;cursor:pointer;transition:all 0.15s ease;"
                onmouseover="this.style.borderColor='var(--secondary)'"
                onmouseout="this.style.borderColor='var(--gray-200)'">
                <div style="width:40px;height:40px;border-radius:50%;background:${op.color || '#607d8b'};color:white;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${op.icono || '👤'}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${op.nombre || 'Sin nombre'}</div>
                    <div style="font-size:0.72rem;color:${puestoColor};font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;">
                        <span>${puestoIcono} ${op.puesto || 'operario'}</span>
                        ${tienePin ? '<span style="color:#10b981;">· 🔒</span>' : '<span style="color:#f59e0b;">· ⚠️ sin PIN</span>'}
                    </div>
                </div>
                <div style="font-size:1.2rem;color:#cbd5e1;">→</div>
            </div>
        `;
    }).join('');
}

function rellenarSelectorColores(colorSeleccionado) {
    const container = document.getElementById('adminOperarioColorPicker');
    if (!container) return;

    container.innerHTML = COLORES_OPERARIO.map(c => `
        <div onclick="seleccionarColorOperario('${c.valor}')"
            style="width:32px;height:32px;border-radius:50%;background:${c.valor};cursor:pointer;border:3px solid ${c.valor === colorSeleccionado ? 'white' : 'transparent'};box-shadow:0 0 0 ${c.valor === colorSeleccionado ? '2px ' + c.valor : '0'};transition:all 0.15s ease;"
            title="${c.nombre}"></div>
    `).join('');
}

function seleccionarColorOperario(color) {
    window.APP.adminOperarioColorSeleccionado = color;
    rellenarSelectorColores(color);
}

function mostrarFormNuevoOperario() {
    document.getElementById('adminOperariosForm').style.display = 'block';
    document.getElementById('adminOperarioFormTitulo').textContent = 'Nuevo Operario';

    document.getElementById('adminOperarioId').value = '';
    document.getElementById('adminOperarioNombre').value = '';
    document.getElementById('adminOperarioPuesto').value = 'operario';
    document.getElementById('adminOperarioPin').value = '';
    document.getElementById('adminOperarioPin').placeholder = 'PIN (opcional)';
    document.getElementById('btnEliminarOperario').style.display = 'none';

    window.APP.adminOperarioColorSeleccionado = '#607d8b';
    rellenarSelectorColores('#607d8b');

    document.getElementById('adminOperariosForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('adminOperarioNombre').focus();
}

function editarOperarioAdmin(id) {
    cargarFirebase('operarios').then(ops => {
        const op = ops[id];
        if (!op) return;

        document.getElementById('adminOperariosForm').style.display = 'block';
        document.getElementById('adminOperarioFormTitulo').textContent = 'Editar Operario';

        document.getElementById('adminOperarioId').value = id;
        document.getElementById('adminOperarioNombre').value = op.nombre || '';
        document.getElementById('adminOperarioPuesto').value = op.puesto || 'operario';
        document.getElementById('adminOperarioPin').value = '';
        document.getElementById('adminOperarioPin').placeholder =
            (op.pinHash || op.pin) ? 'Dejar vacío para no cambiar' : 'PIN (opcional)';

        document.getElementById('btnEliminarOperario').style.display = 'inline-flex';

        const color = op.color || '#607d8b';
        window.APP.adminOperarioColorSeleccionado = color;
        rellenarSelectorColores(color);

        document.getElementById('adminOperariosForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function cerrarFormOperario() {
    document.getElementById('adminOperariosForm').style.display = 'none';
    document.getElementById('adminOperarioId').value = '';
    document.getElementById('adminOperarioNombre').value = '';
    document.getElementById('adminOperarioPin').value = '';
    document.getElementById('adminOperarioPuesto').value = 'operario';
    document.getElementById('btnEliminarOperario').style.display = 'none';
}

async function guardarOperarioAdmin() {
    const id = document.getElementById('adminOperarioId').value || 'op_' + Date.now();
    const nombre = document.getElementById('adminOperarioNombre').value.trim();
    const puesto = document.getElementById('adminOperarioPuesto').value;
    const pin = document.getElementById('adminOperarioPin').value;
    const color = window.APP.adminOperarioColorSeleccionado || '#607d8b';

    if (!nombre) { alertar('El nombre es obligatorio', { tipo: 'warning' }); return; }
    if (nombre.length < 2) { alertar('El nombre es demasiado corto', { tipo: 'warning' }); return; }
    if (pin && (pin.length < 3 || pin.length > 6)) { alertar('El PIN debe tener entre 3 y 6 dígitos', { tipo: 'warning' }); return; }
    if (pin && !/^\d+$/.test(pin)) { alertar('El PIN solo puede contener números', { tipo: 'warning' }); return; }

    const operarios = await cargarFirebase('operarios');
    const duplicado = Object.entries(operarios).find(([oid, op]) =>
        oid !== id && (op.nombre || '').toLowerCase() === nombre.toLowerCase()
    );
    if (duplicado) { alertar(`Ya existe un operario con el nombre "${nombre}"`, { tipo: 'warning' }); return; }

    const data = { nombre, puesto, color, icono: '👤' };

    if (pin) {
        data.pinHash = await hashPin(pin);
        data.pin = '';
    }

    mostrarLoading('Guardando operario...');
    const ok = await guardarFirebase('operarios', id, data);
    ocultarLoading();

    if (ok) {
        toast('✅ Operario guardado', '#10b981');
        cerrarFormOperario();
        cargarAdminOperarios();
        if (typeof cargarOperariosLogin === 'function') cargarOperariosLogin();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function eliminarOperarioAdmin() {
    const id = document.getElementById('adminOperarioId').value;
    if (!id) return;

    const nombre = document.getElementById('adminOperarioNombre').value || 'este operario';

    const ok = await confirmar(
        `¿Eliminar a "${nombre}"?\n\nEsta acción no se puede deshacer.`,
        { titulo: '🗑️ Eliminar operario', tipo: 'danger', okTexto: '🗑️ Eliminar' }
    );
    if (!ok) return;

    mostrarLoading('Eliminando...');
    const eliminado = await eliminarFirebase('operarios', id);
    ocultarLoading();

    if (eliminado) {
        toast('🗑️ Operario eliminado', '#10b981');
        cerrarFormOperario();
        cargarAdminOperarios();
        if (typeof cargarOperariosLogin === 'function') cargarOperariosLogin();
    } else {
        toast('❌ Error al eliminar', '#ef4444');
    }
}
