const clientsByUser = new Map();

function subscribe(userId, response) {
  const key = userId.toString();
  const clients = clientsByUser.get(key) || new Set();
  clients.add(response);
  clientsByUser.set(key, clients);

  return () => {
    clients.delete(response);
    if (clients.size === 0) clientsByUser.delete(key);
  };
}

function publish(userId, type, folderId) {
  const clients = clientsByUser.get(userId.toString());
  if (!clients) return;

  const message = `data: ${JSON.stringify({ type, folderId: folderId.toString() })}\n\n`;
  for (const response of clients) {
    response.write(message);
  }
}

module.exports = { publish, subscribe };
