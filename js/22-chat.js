window.APP.chatActual = {
    conversacionId: null,
    otroOperario: null,
    mensajesListener: null
};

function escapeHtmlChat(texto) {
    const div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML;
}

function formatearFechaChat(fechaISO) {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diffMin = Math.floor((ahora - fecha) / 60000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin} min`;

    const diffDias = (ahora - fecha) / (1000 * 60 * 60 * 24);

    if (diffDias < 1) {
        return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDias < 7) {
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return dias[fecha.getDay()];
    }
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function ajustarAlturaInputChat(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function actualizarBadgeChatFab(numNoLeidos) {
    const fab = document.getElementById('chatFab');
    if (!fab) return;

    const badgeAnterior = fab.querySelector('.chat-fab-badge');
    if (badgeAnterior) badgeAnterior.remove();

    if (numNoLeidos > 0) {
        const badge = document.createElement('span');
        badge.className = 'chat-fab-badge';
        badge.style.cssText = `
            position:absolute;top:-4px;right:-4px;
            background:#ef4444;color:white;
            min-width:22px;height:22px;
            border-radius:99px;padding:0 6px;
            font-size:0.7rem;font-weight:800;
            display:flex;align-items:center;justify-content:center;
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
        `;
        badge.textContent = numNoLeidos > 99 ? '99+' : numNoLeidos;
        fab.appendChild(badge);
    }
}

function actualizarBadgeChatSidebar(numNoLeidos) {
    const badge = document.getElementById('badgeChat');
    if (!badge) return;

    if (numNoLeidos > 0) {
        badge.textContent = numNoLeidos > 99 ? '99+' : numNoLeidos;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

function actualizarTituloPestana(numNoLeidos) {
    const tituloBase = 'Linea TRAXX - Sistema de Operaciones';
    document.title = numNoLeidos > 0 ? `(${numNoLeidos}) ${tituloBase}` : tituloBase;
}

async function contarMensajesNoLeidos() {
    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) return 0;

    const conversaciones = await cargarFirebase('conversaciones', true);
    let total = 0;

    Object.values(conversaciones).forEach(c => {
        if (c.participantes && c.participantes.includes(miNombre)) {
            total += c.noLeidos?.[miNombre] || 0;
        }
    });

    return total;
}

async function refrescarBadgeChatFab() {
    const num = await contarMensajesNoLeidos();
    actualizarBadgeChatFab(num);
    actualizarBadgeChatSidebar(num);
    actualizarTituloPestana(num);
}

async function cargarChat() {
    const container = document.getElementById('chatListaConversaciones');
    const conversacionAbierta = document.getElementById('chatConversacionAbierta');
    if (!container) return;

    actualizarBadgeChatFab(0);

    if (conversacionAbierta && conversacionAbierta.style.display !== 'none') return;

    container.innerHTML = '<div class="empty-state">⏳ Cargando chats...</div>';
    container.style.display = 'flex';
    if (conversacionAbierta) conversacionAbierta.style.display = 'none';

    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) {
        container.innerHTML = '<div class="empty-state">⚠️ Sin sesión activa</div>';
        return;
    }

    const [conversaciones, operarios] = await Promise.all([
        cargarFirebase('conversaciones', true),
        cargarFirebase('operarios')
    ]);

    const misChats = Object.entries(conversaciones)
        .filter(([id, c]) => c.participantes && c.participantes.includes(miNombre))
        .sort((a, b) => new Date(b[1].ultimaFecha || 0) - new Date(a[1].ultimaFecha || 0));

    const otrosOperarios = Object.values(operarios).filter(op => op.nombre && op.nombre !== miNombre);

    if (misChats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:3rem;margin-bottom:12px;">💬</div>
                <div style="font-weight:600;color:#1e293b;font-size:1rem;margin-bottom:6px;">No tienes chats todavía</div>
                <div style="font-size:0.85rem;color:#94a3b8;margin-bottom:16px;">
                    ${otrosOperarios.length === 0
                        ? 'No hay otros operarios registrados'
                        : `${otrosOperarios.length} operario${otrosOperarios.length !== 1 ? 's' : ''} disponible${otrosOperarios.length !== 1 ? 's' : ''}`
                    }
                </div>
                ${otrosOperarios.length > 0 ? `
                    <button class="btn btn-primary btn-sm" onclick="abrirModalNuevoChat()" style="padding:10px 20px;">
                        ➕ Empezar un chat
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = misChats.map(([id, c]) => {
        const otro = c.participantes.find(p => p !== miNombre) || '—';
        const noLeidos = c.noLeidos?.[miNombre] || 0;
        const fecha = c.ultimaFecha ? formatearFechaChat(c.ultimaFecha) : '';

        const otroOp = Object.values(operarios).find(op => op.nombre === otro);
        const colorAvatar = otroOp?.color || '#607d8b';
        const iconoAvatar = otroOp?.icono || '👤';

        return `
            <div onclick="abrirConversacion('${id}')"
                style="
                    background:${noLeidos > 0 ? '#eff6ff' : 'white'};
                    border:1px solid ${noLeidos > 0 ? '#bfdbfe' : '#e5e7eb'};
                    border-left:4px solid ${noLeidos > 0 ? '#3b82f6' : '#cbd5e1'};
                    border-radius:12px;
                    padding:14px 16px;
                    cursor:pointer;
                    transition:all 0.15s ease;
                    display:flex;
                    align-items:center;
                    gap:12px;
                "
                onmouseover="this.style.transform='translateX(3px)'"
                onmouseout="this.style.transform='translateX(0)'">

                <div style="
                    width:48px;height:48px;border-radius:50%;
                    background:${colorAvatar};color:white;
                    display:flex;align-items:center;justify-content:center;
                    font-size:1.3rem;flex-shrink:0;
                ">${iconoAvatar}</div>

                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
                        <div style="font-weight:700;font-size:0.92rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${otro}
                        </div>
                        <div style="font-size:0.7rem;color:#94a3b8;font-weight:600;white-space:nowrap;flex-shrink:0;">
                            ${fecha}
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <div style="
                            font-size:0.8rem;
                            color:${noLeidos > 0 ? '#1e40af' : '#64748b'};
                            font-weight:${noLeidos > 0 ? '700' : '500'};
                            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                            flex:1;
                        ">
                            ${c.ultimoMensaje || 'Sin mensajes'}
                        </div>
                        ${noLeidos > 0 ? `
                            <span style="
                                background:#3b82f6;color:white;
                                min-width:24px;height:24px;
                                border-radius:99px;padding:0 8px;
                                font-size:0.72rem;font-weight:800;
                                display:flex;align-items:center;justify-content:center;
                                flex-shrink:0;
                            ">${noLeidos}</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function abrirModalNuevoChat() {
    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) return;

    const [operarios, conversaciones] = await Promise.all([
        cargarFirebase('operarios', true),
        cargarFirebase('conversaciones', true)
    ]);

    const otrosOperarios = Object.values(operarios).filter(op => op.nombre && op.nombre !== miNombre);

    document.getElementById('modalNuevoChat')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modalNuevoChat';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

    modal.innerHTML = `
        <div style="background:white;border-radius:18px;padding:24px;max-width:420px;width:100%;max-height:80vh;display:flex;flex-direction:column;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;color:#1e293b;font-size:1.05rem;">💬 Nuevo chat</h3>
                <button onclick="document.getElementById('modalNuevoChat').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b;">✕</button>
            </div>

            <p style="font-size:0.82rem;color:#64748b;margin:0 0 14px 0;">
                Selecciona un operario para empezar a chatear.
            </p>

            <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
                ${otrosOperarios.length === 0 ? `
                    <div class="empty-state">No hay otros operarios registrados</div>
                ` : otrosOperarios.map(op => {
                    const idConv = IdGen.chatConversacion(miNombre, op.nombre);
                    const yaExiste = !!conversaciones[idConv];
                    return `
                        <div onclick="iniciarChatCon('${op.nombre.replace(/'/g, "\\'")}')"
                            style="
                                background:${yaExiste ? '#eff6ff' : 'white'};
                                border:1px solid ${yaExiste ? '#bfdbfe' : '#e5e7eb'};
                                border-radius:10px;
                                padding:12px 14px;
                                cursor:pointer;
                                display:flex;
                                align-items:center;
                                gap:12px;
                                transition:all 0.15s ease;
                            "
                            onmouseover="this.style.background='#f1f5f9'"
                            onmouseout="this.style.background='${yaExiste ? '#eff6ff' : 'white'}'">

                            <div style="
                                width:40px;height:40px;border-radius:50%;
                                background:${op.color || '#607d8b'};color:white;
                                display:flex;align-items:center;justify-content:center;
                                font-size:1.1rem;flex-shrink:0;
                            ">${op.icono || '👤'}</div>

                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:700;font-size:0.9rem;color:#1e293b;">${op.nombre}</div>
                                <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">${op.puesto || 'Operario'}</div>
                            </div>

                            <div style="font-size:0.72rem;font-weight:700;color:${yaExiste ? '#1d4ed8' : '#10b981'};white-space:nowrap;flex-shrink:0;">
                                ${yaExiste ? '↗ Abrir' : '➕ Nuevo'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

async function iniciarChatCon(otroNombre) {
    const miNombre = window.APP.operario?.nombre;
    if (!miNombre || !otroNombre) return;

    document.getElementById('modalNuevoChat')?.remove();

    const conversacionId = IdGen.chatConversacion(miNombre, otroNombre);

    const conversaciones = await cargarFirebase('conversaciones', true);
    const existe = conversaciones[conversacionId];

    if (!existe) {
        await guardarFirebase('conversaciones', conversacionId, {
            id: conversacionId,
            participantes: [miNombre, otroNombre].sort(),
            ultimoMensaje: '',
            ultimaFecha: new Date().toISOString(),
            noLeidos: { [miNombre]: 0, [otroNombre]: 0 },
            creadaPor: miNombre,
            fechaCreacion: new Date().toISOString()
        });
    }

    const panelAbierto = window.APP.panelChat.abierto;
    const enChatPage = document.getElementById('chat')?.classList.contains('active');

    if (panelAbierto && !enChatPage) {
        await abrirConversacionEnPanel(conversacionId);
    } else {
        if (!enChatPage) {
            showPage('chat');
            setTimeout(() => abrirConversacion(conversacionId), 300);
        } else {
            await abrirConversacion(conversacionId);
        }
    }
}

async function abrirConversacion(conversacionId) {
    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) return;

    if (window.APP._cerrarAlertaMensaje) {
        window.APP._cerrarAlertaMensaje();
        window.APP._cerrarAlertaMensaje = null;
    }

    const contenedor = document.getElementById('chatConversacionAbierta');
    const lista = document.getElementById('chatListaConversaciones');
    if (!contenedor || !lista) return;

    lista.style.display = 'none';
    contenedor.style.display = 'block';
    contenedor.innerHTML = '<div class="empty-state">⏳ Cargando conversación...</div>';

    const conversaciones = await cargarFirebase('conversaciones', true);
    const conv = conversaciones[conversacionId];
    if (!conv) {
        toast('❌ Conversación no encontrada', '#ef4444');
        volverAListaChats();
        return;
    }

    const otroNombre = conv.participantes.find(p => p !== miNombre) || '—';

    const operarios = await cargarFirebase('operarios');
    const otroOp = Object.values(operarios).find(op => op.nombre === otroNombre);

    window.APP.chatActual.conversacionId = conversacionId;
    window.APP.chatActual.otroOperario = otroNombre;

    await marcarConversacionComoLeida(conversacionId);

    contenedor.innerHTML = `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;height:calc(100vh - 220px);min-height:400px;">
            <div style="background:linear-gradient(135deg,#2d74da,#1a365d);color:white;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;">
                <button onclick="volverAListaChats()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:36px;height:36px;border-radius:10px;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">←</button>

                <div style="width:40px;height:40px;border-radius:50%;background:${otroOp?.color || '#607d8b'};display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">
                    ${otroOp?.icono || '👤'}
                </div>

                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.95rem;">${otroNombre}</div>
                    <div style="font-size:0.72rem;opacity:0.85;">${otroOp?.puesto || 'Operario'}</div>
                </div>

                <button onclick="borrarConversacion('${conversacionId}')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:36px;height:36px;border-radius:10px;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;" title="Borrar">🗑️</button>
            </div>

            <div id="chatMensajes" style="flex:1;overflow-y:auto;padding:16px;background:#f8fafc;display:flex;flex-direction:column;gap:8px;">
                <div class="empty-state">⏳ Cargando mensajes...</div>
            </div>

            <div style="background:white;border-top:1px solid #e5e7eb;padding:10px 12px;display:flex;gap:8px;align-items:flex-end;flex-shrink:0;">
                <input type="file" id="chatFotoInput" accept="image/*" style="display:none;" onchange="subirFotoChat(this)">
                <button onclick="document.getElementById('chatFotoInput').click()" style="background:#f1f5f9;border:1px solid #e5e7eb;color:#64748b;width:40px;height:40px;border-radius:10px;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;" title="Foto">📷</button>

                <textarea id="chatInputTexto" placeholder="Escribe un mensaje..." rows="1"
                    style="flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:0.9rem;font-family:inherit;resize:none;max-height:120px;min-height:40px;line-height:1.4;"
                    onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();enviarMensajeChat();}"
                    oninput="ajustarAlturaInputChat(this)"></textarea>

                <button onclick="enviarMensajeChat()" style="background:#10b981;border:none;color:white;width:40px;height:40px;border-radius:10px;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;" title="Enviar">➤</button>
            </div>
        </div>
    `;

    cargarMensajesTiempoReal(conversacionId);
}

function volverAListaChats() {
    const contenedor = document.getElementById('chatConversacionAbierta');
    const lista = document.getElementById('chatListaConversaciones');

    if (contenedor) {
        contenedor.style.display = 'none';
        contenedor.innerHTML = '';
    }
    if (lista) lista.style.display = 'flex';

    if (window.APP.chatActual.mensajesListener) {
        window.APP.chatActual.mensajesListener();
        window.APP.chatActual.mensajesListener = null;
    }

    window.APP.chatActual.conversacionId = null;
    window.APP.chatActual.otroOperario = null;

    cargarChat();
}

function cargarMensajesTiempoReal(conversacionId) {
    const db = window.APP.db;
    if (!db) return;

    const miNombre = window.APP.operario?.nombre;

    if (window.APP.chatActual.mensajesListener) {
        window.APP.chatActual.mensajesListener();
        window.APP.chatActual.mensajesListener = null;
    }

    const unsub = db.collection('mensajes')
        .where('conversacionId', '==', conversacionId)
        .onSnapshot(snap => {
            const mensajes = [];
            snap.forEach(doc => {
                mensajes.push({ id: doc.id, ...doc.data() });
            });
            mensajes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
            renderMensajesChat(mensajes, miNombre);
        }, err => {
            console.error('❌ Error cargando mensajes:', err);
        });

    window.APP.chatActual.mensajesListener = unsub;
}

function renderMensajesChat(mensajes, miNombre) {
    const cont = document.getElementById('chatMensajes');
    if (!cont) return;

    if (!mensajes.length) {
        cont.innerHTML = `
            <div style="text-align:center;padding:2rem 1rem;color:#94a3b8;font-size:0.85rem;">
                <div style="font-size:2rem;margin-bottom:8px;">💬</div>
                <div>Sin mensajes todavía</div>
                <div style="font-size:0.75rem;margin-top:4px;">Envía el primero para empezar</div>
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
            let etiqueta = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
            if (fechaDia === hoy) etiqueta = 'Hoy';
            else if (fechaDia === ayer) etiqueta = 'Ayer';

            html += `
                <div style="text-align:center;margin:16px 0 8px 0;font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">
                    ${etiqueta}
                </div>
            `;
        }

        const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        html += `
            <div style="display:flex;justify-content:${esMio ? 'flex-end' : 'flex-start'};margin-bottom:2px;">
                <div style="
                    max-width:75%;
                    padding:10px 14px;
                    border-radius:${esMio ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
                    background:${esMio ? 'linear-gradient(135deg,#2d74da,#1a365d)' : 'white'};
                    color:${esMio ? 'white' : '#1e293b'};
                    box-shadow:0 1px 3px rgba(0,0,0,0.08);
                    border:${esMio ? 'none' : '1px solid #e5e7eb'};
                ">
                    ${m.fotoUrl ? `
                        <img src="${m.fotoUrl}" onclick="verFotoGrande('${m.fotoUrl}')" style="max-width:100%;max-height:250px;border-radius:10px;margin-bottom:${m.texto ? '8px' : '0'};cursor:pointer;display:block;">
                    ` : ''}
                    ${m.texto ? `
                        <div style="font-size:0.88rem;line-height:1.4;word-wrap:break-word;white-space:pre-wrap;">${escapeHtmlChat(m.texto)}</div>
                    ` : ''}
                    <div style="font-size:0.65rem;margin-top:4px;text-align:right;opacity:${esMio ? '0.8' : '0.6'};">
                        ${hora}${esMio && m.leido ? ' ✓✓' : ''}
                    </div>
                </div>
            </div>
        `;
    });

    cont.innerHTML = html;
    setTimeout(() => { cont.scrollTop = cont.scrollHeight; }, 50);
}

async function enviarMensajeChat(textoManual = null, fotoUrl = null) {
    const conversacionId = window.APP.chatActual.conversacionId;
    const otroNombre = window.APP.chatActual.otroOperario;
    const miNombre = window.APP.operario?.nombre;

    if (!conversacionId || !miNombre || !otroNombre) return;

    let texto = textoManual;
    if (texto === null) {
        const input = document.getElementById('chatInputTexto');
        texto = input?.value.trim() || '';
    }

    if (!texto && !fotoUrl) {
        toast('⚠️ Escribe algo o adjunta una foto', '#f59e0b');
        return;
    }

    const input = document.getElementById('chatInputTexto');
    if (input && textoManual === null) {
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
        console.error('❌ Error enviando mensaje:', e);
        toast('❌ Error al enviar', '#ef4444');
    }
}

async function subirFotoChat(input) {
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
        if (!url) throw new Error('Error subiendo foto');
        await enviarMensajeChat(null, url);
        toast('📷 Foto enviada', '#10b981');
    } catch (e) {
        console.error('❌ Error:', e);
        toast('❌ Error al subir la foto', '#ef4444');
    } finally {
        ocultarLoading();
        input.value = '';
    }
}

async function marcarConversacionComoLeida(conversacionId) {
    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) return;

    try {
        const conversaciones = await cargarFirebase('conversaciones', true);
        const conv = conversaciones[conversacionId];
        if (!conv) return;

        if (conv.noLeidos?.[miNombre]) {
            await guardarFirebase('conversaciones', conversacionId, {
                ...conv,
                noLeidos: { ...conv.noLeidos, [miNombre]: 0 }
            });
        }

        const db = window.APP.db;
        if (db) {
            const snap = await db.collection('mensajes')
                .where('conversacionId', '==', conversacionId)
                .where('receptor', '==', miNombre)
                .where('leido', '==', false)
                .get();

            if (!snap.empty) {
                const batch = db.batch();
                snap.forEach(doc => batch.update(doc.ref, { leido: true }));
                await esperarEscritura(batch.commit());
            }
        }
    } catch (e) {
        console.error('❌ Error marcando como leída:', e);
    }
}

async function borrarConversacion(conversacionId) {
    const ok = await confirmar(
        '¿Borrar esta conversación?\n\nSe eliminarán todos los mensajes.',
        { titulo: '🗑️ Borrar conversación', tipo: 'danger', okTexto: '🗑️ Borrar' }
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
        toast('🗑️ Conversación borrada', '#10b981');
        volverAListaChats();
    } catch (e) {
        ocultarLoading();
        console.error('❌ Error:', e);
        toast('❌ Error al borrar', '#ef4444');
    }
}
