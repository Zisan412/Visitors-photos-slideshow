const { subscribe } = require('../services/liveUpdates');

function connectEvents(req, res) {
  res.status(200).set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');

  const unsubscribe = subscribe(req.user._id, res);
  const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 20_000);
  res.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

module.exports = { connectEvents };
