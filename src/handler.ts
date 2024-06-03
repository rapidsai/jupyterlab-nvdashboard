import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * Connect to a WebSocket API endpoint
 *
 * @param endPoint WebSocket endpoint for the extension
 * @returns A WebSocket object connected to the endpoint
 */
export function connectToWebSocket(endPoint = '') {
  const settings = ServerConnection.makeSettings();
  const baseUrl = settings.baseUrl.replace(/^http/, 'ws');
  const wsUrl = URLExt.join(baseUrl, 'nvdashboard', endPoint);

  const ws = new WebSocket(wsUrl);

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
