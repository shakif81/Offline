window.APP.configEscaner = {
    cortarHash: true,
    soloNumeros: true,
    quitarComillas: true,
    quitarGuiones: false,
    quitarEspacios: true,
    mayusculas: false,
    conservarGuion: true,
    prefijos: [],
    longitud: 0,
    _cambiosPendientes: false
};

window.APP._camaraPrueba = null;

async function cargarConfigEscaner() {
    try {
        const data = await cargarFirebase('configuracion', true);
        const config = data['escaner'];

    if (config) {
    window.APP.configEscaner = {
        cortarHash: config.cortarHash !== false,
        soloNumeros: config.soloNumeros !== false,
        quitarComillas: config.quitarComillas !== false,
        quitarGuiones: config.quitarGuiones === true,
        quitarEspacios: config.quitarEspacios !== false,
        mayusculas: config.mayusculas === true,
        conservarGuion: config.conservarGuion !== false,
        prefijos: Array.isArray(config.prefijos) ? config.prefijos : [],
        longitud: parseInt(config.longitud) || 0,
        _cambiosPendientes: false
    };
}
    } catch (e) {
        console.warn('⚠️ No se pudo cargar config del escáner:', e);
    }

    renderFormularioConfigEscaner();
}

function renderFormularioConfigEscaner() {
    const c = window.APP.configEscaner;

    const checkSolo = document.getElementById('escSoloNumeros');
    if (checkSolo) checkSolo.checked = c.soloNumeros;

    const checkEsp = document.getElementById('escQuitarEspacios');
    if (checkEsp) checkEsp.checked = c.quitarEspacios;

    const checkHash = document.getElementById('escCortarHash');
    if (checkHash) checkHash.checked = c.cortarHash;

    const checkCom = document.getElementById('escQuitarComillas');
    if (checkCom) checkCom.checked = c.quitarComillas;

    const checkGui = document.getElementById('escQuitarGuiones');
    if (checkGui) checkGui.checked = c.quitarGuiones;

    const checkMay = document.getElementById('escMayusculas');
    if (checkMay) checkMay.checked = c.mayusculas;

const checkCons = document.getElementById('escConservarGuion');
if (checkCons) checkCons.checked = c.conservarGuion;
    const inputLon = document.getElementById('escLongitud');
    if (inputLon) inputLon.value = c.longitud || '';

    renderPrefijosEscaner();

    actualizarEstilosCheckboxesEscaner();
}

function actualizarEstilosCheckboxesEscaner() {
    const checkboxMap = [
    { check: 'escSoloNumeros', label: 'escSoloNumerosLabel', color: '#3b82f6' },
    { check: 'escQuitarEspacios', label: 'escQuitarEspaciosLabel', color: '#10b981' },
    { check: 'escCortarHash', label: 'escCortarHashLabel', color: '#8b5cf6' },
    { check: 'escQuitarComillas', label: 'escQuitarComillasLabel', color: '#f59e0b' },
    { check: 'escQuitarGuiones', label: 'escQuitarGuionesLabel', color: '#ef4444' },
    { check: 'escMayusculas', label: 'escMayusculasLabel', color: '#06b6d4' },
    { check: 'escConservarGuion', label: 'escConservarGuionLabel', color: '#8b5cf6' }
];

    checkboxMap.forEach(({ check, label, color }) => {
        const cb = document.getElementById(check);
        const lb = document.getElementById(label);
        if (!cb || !lb) return;

        if (cb.checked) {
            lb.style.borderColor = color;
            lb.style.background = color + '10';
        } else {
            lb.style.borderColor = '#cbd5e1';
            lb.style.background = 'white';
        }
    });
}

function renderPrefijosEscaner() {
    const cont = document.getElementById('escListaPrefijos');
    if (!cont) return;

    const prefijos = window.APP.configEscaner.prefijos || [];

    if (!prefijos.length) {
        cont.innerHTML = '<span style="font-size:0.75rem;color:#94a3b8;font-style:italic;">Sin prefijos configurados</span>';
        return;
    }

    cont.innerHTML = prefijos.map((p, i) => `
        <span style="display:inline-flex;align-items:center;gap:6px;background:#eef2ff;color:#4338ca;padding:4px 10px;border-radius:99px;font-size:0.78rem;font-weight:700;">
            ${p}
            <button onclick="quitarPrefijoEscaner(${i})" style="background:none;border:none;color:#4338ca;cursor:pointer;font-size:0.9rem;padding:0;line-height:1;font-weight:700;">✕</button>
        </span>
    `).join('');
}

function añadirPrefijoEscaner() {
    const inp = document.getElementById('escNuevoPrefijo');
    if (!inp) return;

    const texto = inp.value.trim();
    if (!texto) {
        toast('⚠️ Escribe un prefijo', '#f59e0b');
        return;
    }

    if (!window.APP.configEscaner.prefijos) {
        window.APP.configEscaner.prefijos = [];
    }

    if (window.APP.configEscaner.prefijos.includes(texto)) {
        toast('⚠️ Ese prefijo ya está', '#f59e0b');
        return;
    }

    window.APP.configEscaner.prefijos.push(texto);
    inp.value = '';
    renderPrefijosEscaner();
    marcarConfigEscanerCambiada();
}

function quitarPrefijoEscaner(idx) {
    window.APP.configEscaner.prefijos.splice(idx, 1);
    renderPrefijosEscaner();
    marcarConfigEscanerCambiada();
}

function marcarConfigEscanerCambiada() {
    window.APP.configEscaner.soloNumeros = document.getElementById('escSoloNumeros')?.checked || false;
    window.APP.configEscaner.quitarEspacios = document.getElementById('escQuitarEspacios')?.checked || false;
    window.APP.configEscaner.cortarHash = document.getElementById('escCortarHash')?.checked || false;
    window.APP.configEscaner.quitarComillas = document.getElementById('escQuitarComillas')?.checked || false;
    window.APP.configEscaner.quitarGuiones = document.getElementById('escQuitarGuiones')?.checked || false;
    window.APP.configEscaner.mayusculas = document.getElementById('escMayusculas')?.checked || false;
    window.APP.configEscaner.conservarGuion = document.getElementById('escConservarGuion')?.checked || false;
    window.APP.configEscaner.longitud = parseInt(document.getElementById('escLongitud')?.value) || 0;

    window.APP.configEscaner._cambiosPendientes = true;

    actualizarEstilosCheckboxesEscaner();

    const estado = document.getElementById('escEstadoGuardado');
    if (estado) {
        estado.textContent = '⚠️ Cambios sin guardar';
        estado.style.color = '#c2410c';
    }

    probarConfigEscaner();
}

function probarConfigEscaner() {
    const inp = document.getElementById('escPruebaCodigo');
    const out = document.getElementById('escPruebaResultado');
    if (!inp || !out) return;

    const codigo = inp.value;
    if (!codigo) {
        out.textContent = 'Esperando código...';
        out.style.color = '#94a3b8';
        return;
    }

    const resultado = procesarCodigoEscaner(codigo);

    out.innerHTML = `
        <div style="color:#94a3b8;font-size:0.72rem;margin-bottom:4px;">Original: ${codigo}</div>
        <div style="color:#047857;font-weight:700;">Resultado: ${resultado || '(vacío)'}</div>
    `;
    out.style.color = '';
}

function procesarPruebaEscaner() {
    const inp = document.getElementById('escanerPruebaInput');
    const out = document.getElementById('escanerPruebaResultado');
    if (!inp || !out) return;

    const codigo = inp.value.trim();
    if (!codigo) {
        toast('⚠️ Escribe un código', '#f59e0b');
        return;
    }

    const resultado = procesarCodigoEscaner(codigo);

    out.innerHTML = `
        <div style="color:#94a3b8;font-size:0.72rem;margin-bottom:4px;">Original: ${codigo}</div>
        <div style="color:#047857;font-weight:700;">Procesado: ${resultado || '(vacío)'}</div>
    `;
}

function procesarCodigoEscaner(codigo) {
    if (!codigo) return '';

    let resultado = String(codigo);

    if (window.APP.configEscaner.conservarGuion && resultado.includes('-')) {
        if (window.APP.configEscaner.mayusculas) {
            resultado = resultado.toUpperCase();
        }
        return resultado.trim();
    }

    const prefijos = window.APP.configEscaner.prefijos || [];
    prefijos.forEach(prefijo => {
        if (prefijo && resultado.startsWith(prefijo)) {
            resultado = resultado.substring(prefijo.length);
        }
    });

if (window.APP.configEscaner.cortarHash) {
    const idxHash = resultado.indexOf('#');
    if (idxHash >= 0) {
        resultado = resultado.substring(idxHash + 1);
    }
}

    if (window.APP.configEscaner.quitarComillas) {
        resultado = resultado.replace(/['"]/g, '');
    }

    if (window.APP.configEscaner.quitarEspacios) {
        resultado = resultado.replace(/\s+/g, '');
    }

    if (window.APP.configEscaner.quitarGuiones) {
        resultado = resultado.replace(/[-_]/g, '');
    }

    if (window.APP.configEscaner.soloNumeros) {
        resultado = resultado.replace(/[^0-9]/g, '');
    }

    if (window.APP.configEscaner.mayusculas) {
        resultado = resultado.toUpperCase();
    }

    const long = parseInt(window.APP.configEscaner.longitud) || 0;
    if (long > 0 && resultado.length > long) {
        resultado = resultado.substring(0, long);
    }

    return resultado.trim();
}

async function guardarConfigEscaner() {
    marcarConfigEscanerCambiada();

    const config = {
    cortarHash: window.APP.configEscaner.cortarHash,
    soloNumeros: window.APP.configEscaner.soloNumeros,
    quitarComillas: window.APP.configEscaner.quitarComillas,
    quitarGuiones: window.APP.configEscaner.quitarGuiones,
    quitarEspacios: window.APP.configEscaner.quitarEspacios,
    mayusculas: window.APP.configEscaner.mayusculas,
    conservarGuion: window.APP.configEscaner.conservarGuion,
    prefijos: window.APP.configEscaner.prefijos || [],
    longitud: window.APP.configEscaner.longitud || 0,
    ultimaActualizacion: new Date().toISOString()
};

    mostrarLoading('Guardando configuración...');
    const ok = await guardarFirebase('configuracion', 'escaner', config);
    ocultarLoading();

    if (ok) {
        window.APP.configEscaner._cambiosPendientes = false;
        toast('✅ Configuración guardada', '#10b981');

        const estado = document.getElementById('escEstadoGuardado');
        if (estado) {
            estado.textContent = '✅ Guardado';
            estado.style.color = '#047857';
            setTimeout(() => {
                estado.textContent = '';
            }, 3000);
        }
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function resetearConfigEscaner() {
    const ok = await confirmar(
        '¿Restaurar la configuración por defecto?',
        { titulo: '↺ Restaurar', tipo: 'warning', okTexto: '↺ Sí, restaurar' }
    );
    if (!ok) return;

    window.APP.configEscaner = {
        cortarHash: true,
        soloNumeros: true,
        quitarComillas: true,
        quitarGuiones: false,
        quitarEspacios: true,
        mayusculas: false,
        prefijos: [],
        longitud: 0,
        _cambiosPendientes: true
    };

    renderFormularioConfigEscaner();
    marcarConfigEscanerCambiada();
    toast('↺ Configuración restaurada', '#f59e0b');
}

async function toggleCamaraPrueba() {
    const btn = document.getElementById('btnToggleCamaraPrueba');
    const cont = document.getElementById('escanerPruebaCamara');

    if (window.APP._camaraPrueba) {
        try {
            await window.APP._camaraPrueba.stop();
        } catch (e) {}
        window.APP._camaraPrueba = null;
        if (cont) cont.innerHTML = '';
        if (btn) btn.textContent = '▶️ Activar cámara';
        return;
    }

    try {
        if (typeof Html5Qrcode === 'undefined') {
            toast('⚠️ Librería de escáner no disponible', '#ef4444');
            return;
        }

        if (cont) {
            cont.innerHTML = '<div id="lectorPrueba" style="width:100%;"></div>';
        }

        const lector = new Html5Qrcode('lectorPrueba');

        await lector.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                const resultado = procesarCodigoEscaner(decodedText);

                toast(`📷 Código: ${resultado}`, '#10b981', 2000);

                const out = document.getElementById('escanerPruebaResultado');
                if (out) {
                    out.innerHTML = `
                        <div style="color:#94a3b8;font-size:0.72rem;margin-bottom:4px;">Original: ${decodedText}</div>
                        <div style="color:#047857;font-weight:700;">Procesado: ${resultado}</div>
                    `;
                }
            },
            () => {}
        );

        window.APP._camaraPrueba = lector;
        if (btn) btn.textContent = '⏹️ Detener cámara';
    } catch (e) {
        console.error('❌ Error activando cámara:', e);
        toast('❌ No se pudo activar la cámara', '#ef4444');
    }
}

async function detenerCamaraPrueba() {
    if (window.APP._camaraPrueba) {
        try {
            await window.APP._camaraPrueba.stop();
        } catch (e) {}
        window.APP._camaraPrueba = null;

        const cont = document.getElementById('escanerPruebaCamara');
        if (cont) cont.innerHTML = '';

        const btn = document.getElementById('btnToggleCamaraPrueba');
        if (btn) btn.textContent = '▶️ Activar cámara';
    }
}
