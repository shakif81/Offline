(function init() {
    console.log('🚀 Arrancando Linea TRAXX v7.0...');

    inicializarFirebase();
    console.log('✅ Firebase inicializado');

    setupNavegacion();
    console.log('✅ Navegación configurada');

    setupListeners();
    console.log('✅ Listeners registrados');

    cargarOperariosLogin();
    console.log('✅ Lista de operarios cargada');

const filtroEstaciones = document.getElementById('filtroModeloEstaciones');
if (filtroEstaciones) {
    filtroEstaciones.addEventListener('change', () => {
        if (typeof cargarEstaciones === 'function') cargarEstaciones();
    });
}

document.addEventListener('click', (e) => {
    const panel = document.getElementById('panelChatFlotante');
    const fab = document.getElementById('chatFab');

    if (!panel || !window.APP.panelChat?.abierto) return;
    if (panel.style.display === 'none') return;

    if (window.APP._panelChatRecienAbierto && (Date.now() - window.APP._panelChatRecienAbierto) < 300) {
        return;
    }

    if (panel.contains(e.target)) return;
    if (fab && fab.contains(e.target)) return;
    if (e.target.closest('#alertaMensajeChat')) return;

    cerrarPanelChatFlotante();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.APP.operario) {
        if (typeof refrescarBadgeChatFab === 'function') {
            refrescarBadgeChatFab();
        }
    }
});

console.log('✅ App lista');

    console.log('✅ App lista');
})();
