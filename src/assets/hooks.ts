import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { SetStateAction, useEffect, useRef } from 'react';
import {
  DEFAULT_MAX_RECORDS_TIMESERIES,
  DEFAULT_UPDATE_FREQUENCY,
  PLUGIN_ID_CONFIG
} from './constants';
import { connectToWebSocket } from '../handler';

/**
 * Updates the settings for update frequency and maximum records for time series charts.
 */
const updateSettings = (
  settings: ISettingRegistry.ISettings,
  setUpdateFrequency: (value: SetStateAction<number>) => void,
  setMaxRecords?: (value: SetStateAction<number>) => void
) => {
  setUpdateFrequency(
    (settings.get('updateFrequency').composite as number) ||
      DEFAULT_UPDATE_FREQUENCY
  );
  if (setMaxRecords) {
    setMaxRecords(
      (settings.get('maxTimeSeriesDataRecords').composite as number) ||
        DEFAULT_MAX_RECORDS_TIMESERIES
    );
  }
};

/**
 * Loads the setting registry and updates the settings accordingly.
 */
export const loadSettingRegistry = (
  settingRegistry: ISettingRegistry,
  setUpdateFrequency: (value: SetStateAction<number>) => void,
  setIsSettingsLoaded: (value: SetStateAction<boolean>) => void,
  setMaxRecords?: (value: SetStateAction<number>) => void
) => {
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingRegistry.load(PLUGIN_ID_CONFIG);
        updateSettings(settings, setUpdateFrequency, setMaxRecords);
        settings.changed.connect(() => {
          updateSettings(settings, setUpdateFrequency, setMaxRecords);
        });
        setIsSettingsLoaded(true);
      } catch (error) {
        console.error(`An error occurred while loading settings: ${error}`);
      }
    };
    loadSettings();
  }, []);
};

/**
 * Custom hook to establish a WebSocket connection and handle incoming messages.
 */
export const useWebSocket = <T>(
  endpoint: string,
  isPaused: boolean,
  updateFrequency: number,
  processData: (response: T, isPaused: boolean) => void,
  isSettingsLoaded: boolean
) => {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isSettingsLoaded) {
      return;
    }

    wsRef.current = connectToWebSocket(endpoint);
    const ws = wsRef.current;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = event => {
      const response = JSON.parse(event.data);
      if (response.status !== 'connected') {
        processData(response, isPaused);
      } else {
        ws.send(JSON.stringify({ updateFrequency, isPaused }));
      }
    };

    ws.onerror = error => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [isSettingsLoaded]);

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ updateFrequency, isPaused }));
    }
  }, [isPaused, updateFrequency]);
};
