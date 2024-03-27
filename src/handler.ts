/**
 * Connect to a WebSocket API endpoint
 *
 * @param endPoint WebSocket endpoint for the extension
 * @returns A WebSocket object connected to the endpoint
 */
export function connectToWebSocket(endPoint = '') {
  const baseUrl = document.location.origin.replace(/^http/, 'ws');
  const wsUrl = new URL(`nvdashboard/${endPoint}`, baseUrl);

  const ws = new WebSocket(wsUrl.href);

  ws.onopen = () => {
    console.log(`WebSocket connected to ${endPoint}`);
    ws.send(JSON.stringify({ message: 'Client connected' }));
  };

  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    console.log(`Data received from ${endPoint}:`, data);
  };

  ws.onerror = error => {
    console.error(`WebSocket error on ${endPoint}:`, error);
  };

  ws.onclose = () => {
    console.log(`WebSocket disconnected from ${endPoint}`);
  };

  return ws;
}
