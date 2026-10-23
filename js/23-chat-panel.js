window.APP.panelChat = {
    abierto: false,
    conversacionId: null,
    otroOperario: null,
    listener: null
};

window.APP._panelChatRecienAbierto = 0;

function togglePanelChatFlotante() {
    if (window.APP.panelChat.abierto) {
        cerrarPanelChatFlotante();
    } else {
        abrirPanelChatFlotante();
    }
}

async function abrirPanelChatFlotante() {
    const panel = document.getElementById('panelChatFlotante');
    if (!panel) return;
    if (!window.APP.operario) return;

    if (window.APP._cerrarAlertaMensaje) {
        window.APP._cerrarAlertaMensaje();
        window.APP._cerrarAlertaMensaje = null;
    }

    if (window.APP.panelChat.listener) {
        window.APP.panelChat.listener();
        window.APP.panelChat.listener = null;
    }
    window.APP.panelChat.conversacionId = null;
    window.APP.panelChat.otroOperario = null;

    const cabecera = document.getElementById('panelChatCabecera');
    if (cabecera) {
        cabecera.innerHTML = `
            <span style="font-size:1.2rem;">💬</span>
            <span style="font-weight:700;font-size:0.9rem;">Chat</span>
        `;
    }

    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    window.APP.panelChat.abierto = true;
    window.APP._panelChatRecienAbierto = Date.now();

    const cont = document.getElementById('panelChatContenido');
    if (cont) {
        cont.style.display = 'flex';
        cont.style.flexDirection = 'column';
        cont.style.flex = '1';
        cont.style.minHeight = '0';
        cont.style.overflow = 'hidden';
        cont.innerHTML = '<div style="padding:30px 20px;text-align:center;color:#94a3b8;font-size:0.8rem;">⏳ Cargando chats...</div>';
    }

    actualizarBadgeChatFab(0);

    try {
        await renderPanelChatLista();
    } catch (e) {
        console.error('❌ Error:', e);
        if (cont) {
            cont.innerHTML = `
                <div style="padding:30px 20px;text-align:center;">
                    <div style="font-size:2rem;margin-bottom:8px;">⚠️</div>
                    <div style="color:#b91c1c;font-size:0.85rem;font-weight:600;">Error al cargar</div>
                    <div style="color:#94a3b8;font-size:0.75rem;margin-top:4px;">${e.message || ''}</div>
                </div>
            `;
        }
    }
}

function cerrarPanelChatFlotante() {
    const panel = document.getElementById('panelChatFlotante');
    if (!panel) return;

    panel.style.display = 'none';
    window.APP.panelChat.abierto = false;

    if (window.APP.panelChat.listener) {
        window.APP.panelChat.listener();
        window.APP.panelChat.listener = null;
    }

    window.APP.panelChat.conversacionId = null;
    window.APP.panelChat.otroOperario = null;

    const cabecera = document.getElementById('panelChatCabecera');
    if (cabecera) {
        cabecera.innerHTML = `
            <span style="font-size:1.2rem;">💬</span>
            <span style="font-weight:700;font-size:0.9rem;">Chat</span>
        `;
    }
}

async function renderPanelChatLista() {
    const cont = document.getElementById('panelChatContenido');
    if (!cont) return;

    const cabecera = document.getElementById('panelChatCabecera');
    if (cabecera) {
        cabecera.innerHTML = `
            <span style="font-size:1.2rem;">💬</span>
            <span style="font-weight:700;font-size:0.9rem;">Chat</span>
        `;
    }

    cont.innerHTML = '<div style="padding:30px 20px;text-align:center;color:#94a3b8;font-size:0.8rem;">⏳ Cargando...</div>';

    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) {
        cont.innerHTML = '<div style="padding:30px 20px;text-align:center;color:#94a3b8;font-size:0.8rem;">⚠️ Sin sesión activa</div>';
        return;
    }

    const [conversaciones, operarios] = await Promise.all([
        cargarFirebase('conversaciones', true),
        cargarFirebase('operarios')
    ]);

    const misChats = Object.entries(conversaciones)
        .filter(([id, c]) => c.participantes && c.participantes.includes(miNombre))
        .sort((a, b) => new Date(b[1].ultimaFecha || 0) - new Date(a[1].ultimaFecha || 0));

    let html = `
        <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;flex-shrink:0;">
            <button onclick="event.stopPropagation(); abrirModalNuevoChat()" style="
                width:100%;padding:8px;
                border:1px dashed #cbd5e1;border-radius:8px;
                background:#f8fafc;color:#475569;
                font-weight:600;font-size:0.78rem;
                cursor:pointer;font-family:inherit;
                display:flex;align-items:center;justify-content:center;gap:6px;
            ">➕ Nuevo chat</button>
        </div>
    `;

    if (!misChats.length) {
        html += `
            <div style="padding:40px 20px;text-align:center;">
                <div style="font-size:2.2rem;margin-bottom:8px;">💬</div>
                <div style="font-weight:600;color:#1e293b;font-size:0.85rem;margin-bottom:4px;">Sin conversaciones</div>
                <div style="font-size:0.75rem;color:#94a3b8;">Empieza un chat nuevo</div>
            </div>
        `;
        cont.innerHTML = html;
        return;
    }

    html += '<div style="flex:1;overflow-y:auto;">';

    misChats.forEach(([id, c]) => {
        const otro = c.participantes.find(p => p !== miNombre) || '—';
        const noLeidos = c.noLeidos?.[miNombre] || 0;
        const fecha = c.ultimaFecha ? formatearFechaChat(c.ultimaFecha) : '';

        const otroOp = Object.values(operarios).find(op => op.nombre === otro);
        const colorAvatar = otroOp?.color || '#607d8b';
        const iconoAvatar = otroOp?.icono || '👤';

        html += `
            <div onclick="event.stopPropagation(); abrirConversacionEnPanel('${id}')"
                style="
                    background:${noLeidos > 0 ? '#eff6ff' : 'white'};
                    border-bottom:1px solid #f1f5f9;
                    padding:10px 12px;cursor:pointer;
                    display:flex;align-items:center;gap:10px;
                    transition:background 0.15s ease;
                "
                onmouseover="this.style.background='#f8fafc'"
                onmouseout="this.style.background='${noLeidos > 0 ? '#eff6ff' : 'white'}'">

                <div style="
                    width:40px;height:40px;border-radius:50%;
                    background:${colorAvatar};color:white;
                    display:flex;align-items:center;justify-content:center;
                    font-size:1rem;flex-shrink:0;
                ">${iconoAvatar}</div>

                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:2px;">
                        <div style="font-weight:600;font-size:0.82rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${otro}
                        </div>
                        <div style="font-size:0.66rem;color:#94a3b8;font-weight:600;white-space:nowrap;flex-shrink:0;">
                            ${fecha}
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                        <div style="
                            font-size:0.72rem;
                            color:${noLeidos > 0 ? '#1e40af' : '#64748b'};
                            font-weight:${noLeidos > 0 ? '600' : '400'};
                            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;
                        ">
                            ${c.ultimoMensaje || 'Sin mensajes'}
                        </div>
                        ${noLeidos > 0 ? `
                            <span style="background:#3b82f6;color:white;min-width:18px;height:18px;border-radius:99px;padding:0 5px;font-size:0.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${noLeidos}</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    cont.innerHTML = html;
}

async function abrirConversacionEnPanel(conversacionId) {
    const cont = document.getElementById('panelChatContenido');
    const cabecera = document.getElementById('panelChatCabecera');
    if (!cont || !cabecera) return;

    if (window.APP._cerrarAlertaMensaje) {
        window.APP._cerrarAlertaMensaje();
        window.APP._cerrarAlertaMensaje = null;
    }

    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) return;

    cont.innerHTML = '<div style="padding:30px 20px;text-align:center;color:#94a3b8;font-size:0.8rem;">⏳ Cargando...</div>';

    const conversaciones = await cargarFirebase('conversaciones', true);
    const conv = conversaciones[conversacionId];
    if (!conv) {
        toast('❌ Conversación no encontrada', '#ef4444');
        renderPanelChatLista();
        return;
    }

    const otroNombre = conv.participantes.find(p => p !== miNombre) || '—';
    const operarios = await cargarFirebase('operarios');
    const otroOp = Object.values(operarios).find(op => op.nombre === otroNombre);

    window.APP.panelChat.conversacionId = conversacionId;
    window.APP.panelChat.otroOperario = otroNombre;

    await marcarConversacionComoLeida(conversacionId);

    cabecera.innerHTML = `
        <button onclick="event.stopPropagation(); renderPanelChatLista()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:30px;height:30px;border-radius:8px;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">←</button>

        <div style="width:32px;height:32px;border-radius:50%;background:${otroOp?.color || '#607d8b'};display:flex;align-items:center;justify-content:center;font-size:0.95rem;flex-shrink:0;">
            ${otroOp?.icono || '👤'}
        </div>

        <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${otroNombre}</div>
        </div>

        <button onclick="event.stopPropagation(); borrarConversacionDesdePanel('${conversacionId}')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:30px;height:30px;border-radius:8px;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;" title="Borrar">🗑️</button>
    `;

    cont.innerHTML = `
        <div id="panelChatMensajes" style="flex:1;overflow-y:auto;padding:12px;background:#f8fafc;display:flex;flex-direction:column;gap:4px;">
            <div style="text-align:center;color:#94a3b8;font-size:0.8rem;padding:20px;">⏳ Cargando mensajes...</div>
        </div>

        <div style="background:white;border-top:1px solid #e5e7eb;padding:8px;display:flex;gap:6px;align-items:flex-end;flex-shrink:0;">
            <input type="file" id="panelChatFotoInput" accept="image/*" style="display:none;" onchange="subirFotoChatPanel(this)">
            <button onclick="event.stopPropagation(); document.getElementById('panelChatFotoInput').click()" style="background:#f1f5f9;border:1px solid #e5e7eb;color:#64748b;width:34px;height:34px;border-radius:8px;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">📷</button>

            <textarea id="panelChatInputTexto" placeholder="Escribe..." rows="1"
                style="flex:1;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.82rem;font-family:inherit;resize:none;max-height:80px;min-height:34px;line-height:1.3;"
                onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();enviarMensajeChatPanel();}"
                oninput="ajustarAlturaInputChat(this)"></textarea>

            <button onclick="event.stopPropagation(); enviarMensajeChatPanel()" style="background:#10b981;border:none;color:white;width:34px;height:34px;border-radius:8px;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">➤</button>
        </div>
    `;

    cargarMensajesPanelTiempoReal(conversacionId);
}

function cargarMensajesPanelTiempoReal(conversacionId) {
    const db = window.APP.db;
    if (!db) return;

    const miNombre = window.APP.operario?.nombre;

    if (window.APP.panelChat.listener) {
        window.APP.panelChat.listener();
        window.APP.panelChat.listener = null;
    }

    const unsub = db.collection('mensajes')
        .where('conversacionId', '==', conversacionId)
        .onSnapshot(snap => {
            const mensajes = [];
            snap.forEach(doc => mensajes.push({ id: doc.id, ...doc.data() }));
            mensajes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
            renderMensajesPanel(mensajes, miNombre);
        }, err => console.error('❌ Error:', err));

    window.APP.panelChat.listener = unsub;
}

function renderMensajesPanel(mensajes, miNombre) {
    const cont = document.getElementById('panelChatMensajes');
    if (!cont) return;

    if (!mensajes.length) {
        cont.innerHTML = `
            <div style="text-align:center;padding:30px 16px;color:#94a3b8;font-size:0.78rem;">
                <div style="font-size:1.6rem;margin-bottom:6px;">💬</div>
                <div>Sin mensajes todavía</div>
            </div>
        `;
        return;
    }

    let html = '';
    let fechaAnterior = '';

    mensajes.forEach(m => {
        const esMio = m.emisor === miNombre;
        const fecha = new Date(m.fecha);
        const fechaDia = fecha.toDateString();

        if (fechaDia !== fechaAnterior) {
            fechaAnterior = fechaDia;
            const hoy = new Date().toDateString();
            const ayer = new Date(Date.now() - 86400000).toDateString();
            let etiqueta = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            if (fechaDia === hoy) etiqueta = 'Hoy';
            else if (fechaDia === ayer) etiqueta = 'Ayer';

            html += `
                <div style="text-align:center;margin:10px 0 4px 0;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">
                    ${etiqueta}
                </div>
            `;
        }

        const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        html += `
            <div style="display:flex;justify-content:${esMio ? 'flex-end' : 'flex-start'};margin-bottom:2px;">
                <div style="
                    max-width:80%;padding:7px 11px;
                    border-radius:${esMio ? '12px 12px 3px 12px' : '12px 12px 12px 3px'};
                    background:${esMio ? 'linear-gradient(135deg,#2d74da,#1a365d)' : 'white'};
                    color:${esMio ? 'white' : '#1e293b'};
                    box-shadow:0 1px 3px rgba(0,0,0,0.08);
                    border:${esMio ? 'none' : '1px solid #e5e7eb'};
                ">
                    ${m.fotoUrl ? `
                        <img src="${m.fotoUrl}" onclick="verFotoGrande('${m.fotoUrl}')" style="max-width:100%;max-height:180px;border-radius:8px;margin-bottom:${m.texto ? '5px' : '0'};cursor:pointer;display:block;">
                    ` : ''}
                    ${m.texto ? `
                        <div style="font-size:0.8rem;line-height:1.35;word-wrap:break-word;white-space:pre-wrap;">${escapeHtmlChat(m.texto)}</div>
                    ` : ''}
                    <div style="font-size:0.6rem;margin-top:2px;text-align:right;opacity:${esMio ? '0.8' : '0.6'};">
                        ${hora}${esMio && m.leido ? ' ✓✓' : ''}
                    </div>
                </div>
            </div>
        `;
    });

    cont.innerHTML = html;
    setTimeout(() => { cont.scrollTop = cont.scrollHeight; }, 50);
}

async function enviarMensajeChatPanel(fotoUrl = null) {
    const conversacionId = window.APP.panelChat.conversacionId;
    const otroNombre = window.APP.panelChat.otroOperario;
    const miNombre = window.APP.operario?.nombre;

    if (!conversacionId || !miNombre || !otroNombre) return;

    const input = document.getElementById('panelChatInputTexto');
    const texto = input?.value.trim() || '';

    if (!texto && !fotoUrl) {
        toast('⚠️ Escribe algo o adjunta una foto', '#f59e0b');
        return;
    }

    if (input) {
        input.value = '';
        ajustarAlturaInputChat(input);
    }

    const mensajeId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    try {
        await guardarFirebase('mensajes', mensajeId, {
            conversacionId,
            emisor: miNombre,
            receptor: otroNombre,
            texto: texto || '',
            fotoUrl: fotoUrl || '',
            fecha: new Date().toISOString(),
            leido: false
        });

        const conversaciones = await cargarFirebase('conversaciones', true);
        const conv = conversaciones[conversacionId] || {};
        const noLeidos = conv.noLeidos || {};
        noLeidos[otroNombre] = (noLeidos[otroNombre] || 0) + 1;
        noLeidos[miNombre] = 0;

        await guardarFirebase('conversaciones', conversacionId, {
            ...conv,
            ultimoMensaje: texto ? (texto.length > 50 ? texto.substring(0, 50) + '…' : texto) : '📷 Foto',
            ultimaFecha: new Date().toISOString(),
            noLeidos
        });
    } catch (e) {
        console.error('❌ Error enviando (panel):', e);
        toast('❌ Error al enviar', '#ef4444');
    }
}

async function subirFotoChatPanel(input) {
    const file = input?.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        toast('⚠️ La foto es demasiado grande (máx 5MB)', '#f59e0b');
        input.value = '';
        return;
    }

    mostrarLoading('Subiendo foto...');

    try {
        const url = await subirACloudinary(file);
        if (!url) throw new Error('Error');
        await enviarMensajeChatPanel(url);
        toast('📷 Foto enviada', '#10b981');
    } catch (e) {
        console.error('❌ Error:', e);
        toast('❌ Error al subir la foto', '#ef4444');
    } finally {
        ocultarLoading();
        input.value = '';
    }
}

async function borrarConversacionDesdePanel(conversacionId) {
    const ok = await confirmar(
        '¿Borrar esta conversación?',
        { titulo: '🗑️ Borrar', tipo: 'danger', okTexto: '🗑️ Borrar' }
    );
    if (!ok) return;

    mostrarLoading('Borrando...');

    try {
        const db = window.APP.db;
        if (!db) throw new Error('Sin conexión');

        const snap = await db.collection('mensajes')
            .where('conversacionId', '==', conversacionId)
            .get();

        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await esperarEscritura(batch.commit());

        await eliminarFirebase('conversaciones', conversacionId);
        ocultarLoading();
        toast('🗑️ Borrada', '#10b981');
        renderPanelChatLista();
    } catch (e) {
        ocultarLoading();
        console.error('❌ Error:', e);
        toast('❌ Error al borrar', '#ef4444');
    }
}

function mostrarAlertaMensaje(msg) {
    document.getElementById('alertaMensajeChat')?.remove();

    const alerta = document.createElement('div');
    alerta.id = 'alertaMensajeChat';
    alerta.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border-radius: 16px;
    max-width: 400px;
    width: calc(100% - 40px);
    max-height: calc(100vh - 100px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 4px rgba(45,116,218,0.15);
    z-index: 2147483647;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
`;

    alerta.innerHTML = `
        <div style="background:linear-gradient(135deg,#2d74da,#1a365d);color:white;padding:14px 18px;display:flex;align-items:center;gap:12px;">
            <div style="font-size:1.8rem;">💬</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:800;font-size:0.95rem;">Mensaje de ${escapeHtmlChat(msg.emisor)}</div>
                <div style="font-size:0.75rem;opacity:0.9;margin-top:2px;">Pulsa para abrir el chat</div>
            </div>
        </div>

        <div style="padding:14px 18px;background:white;">
            <div style="font-size:0.88rem;color:#1e293b;line-height:1.5;word-wrap:break-word;">
                ${msg.fotoUrl && !msg.texto ? '📷 Foto' : (msg.texto.length > 100 ? escapeHtmlChat(msg.texto.substring(0, 100)) + '…' : escapeHtmlChat(msg.texto))}
            </div>
        </div>

   <div style="display:flex;gap:8px;padding:0 14px 14px;background:white;">
    <button onclick="event.stopPropagation(); window.APP._cerrarAlertaMensaje && window.APP._cerrarAlertaMensaje();" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:white;color:#64748b;font-weight:600;cursor:pointer;font-size:0.8rem;font-family:inherit;">✕ Cerrar</button>
    <button onclick="event.stopPropagation(); window.APP._cerrarAlertaMensaje && window.APP._cerrarAlertaMensaje(); abrirChatDesdeAlerta('${msg.conversacionId}');" style="flex:2;padding:10px;border:none;border-radius:8px;background:#2d74da;color:white;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">💬 Ver mensaje</button>
</div>

      <div style="height:4px;background:#e5e7eb;overflow:hidden;">
    <div style="height:100%;background:linear-gradient(90deg,#2d74da,#00b4d8);animation:shrinkMensaje 30s linear forwards;"></div>
</div>
    `;

    document.body.appendChild(alerta);

requestAnimationFrame(() => {
    alerta.style.opacity = '1';
});

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const audioCtx = new AudioCtx();
            [0, 0.15].forEach(delay => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.value = 700 + delay * 200;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.15);
                osc.start(audioCtx.currentTime + delay);
                osc.stop(audioCtx.currentTime + delay + 0.15);
            });
        }
    } catch (e) {}

    setTimeout(() => {
    alerta.style.opacity = '0';
    alerta.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => alerta.remove(), 300);
}, 30000);

    const cerrarAlerta = () => {
        if (alerta._timeoutCierre) {
            clearTimeout(alerta._timeoutCierre);
            alerta._timeoutCierre = null;
        }
        alerta.style.opacity = '0';
        alerta.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => alerta.remove(), 300);
    };

    window.APP._cerrarAlertaMensaje = cerrarAlerta;

    alerta.addEventListener('click', () => {
        cerrarAlerta();
        abrirChatDesdeAlerta(msg.conversacionId);
    });
}

function abrirChatDesdeAlerta(conversacionId) {
    document.getElementById('alertaMensajeChat')?.remove();

    const rol = (window.APP.operario?.puesto || '').toLowerCase();
    const esAdmin = rol.includes('admin') || rol.includes('supervisor');

    if (esAdmin) {
        if (typeof abrirPanelChatFlotante === 'function') {
            Promise.resolve(abrirPanelChatFlotante()).then(() => {
                setTimeout(() => {
                    if (typeof abrirConversacionEnPanel === 'function') {
                        abrirConversacionEnPanel(conversacionId);
                    }
                }, 400);
            });
        }
    } else {
        showPage('chat');
        setTimeout(() => {
            abrirConversacion(conversacionId);
        }, 300);
    }
}

console.log('✅ Bloque FF5 (Chat) cargado');
