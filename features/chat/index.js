'use strict';

const { emitChatMessage } = require('./emit-chat-message');
const { testChat } = require('./routes/test-chat');

module.exports = {
  name: 'chat',

  register({ app, bus, logger }) {
    const deps = { bus, logger };

    bus.on('canal:mensaje-crudo', emitChatMessage(deps), 'chat');

    // Ring buffer de los últimos mensajes permitidos — el chat solo se
    // broadcast por WS, sin persistencia. Lo consume GET /api/chat/recent y la
    // tool MCP get_recent_chat (vía el contrato síncrono chat:recientes).
    const recientes = [];
    const RECIENTES_CAP = 200;
    bus.on('chat:mensaje-permitido', (m) => {
      if (!m) return;
      recientes.push({
        platform: m.platform, channel: m.channel, user: m.user, userId: m.userId,
        comment: m.comment, isAdmin: !!m.isAdmin, muted: !!m.muted, ttsBlocked: !!m.ttsBlocked,
        timestamp: m.timestamp,
      });
      if (recientes.length > RECIENTES_CAP) recientes.shift();
    }, 'chat');
    bus.on('chat:recientes', (respond) => {
      if (typeof respond === 'function') respond(recientes.slice());
    }, 'chat');
    app.get('/api/chat/recent', (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 50, RECIENTES_CAP);
      res.json({ messages: recientes.slice(-limit), total: recientes.length });
    });

    app.post('/api/test/chat', testChat(deps));

    return { rutas: 2, listeners: 3 };
  },
};
