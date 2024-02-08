import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { SetStateAction, useEffect } from 'react';
import { DEFAULT_UPDATE_FREQUENCY, PLUGIN_ID_CONFIG } from './constants';

function loadSettingRegistry(
  settingRegistry: ISettingRegistry,
  setUpdateFrequency: {
    (value: SetStateAction<number>): void;
    (arg0: number): void;
  }
) {
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingRegistry.load(PLUGIN_ID_CONFIG);
        const loadedUpdateFrequency =
          (settings.get('updateFrequency').composite as number) ||
          DEFAULT_UPDATE_FREQUENCY;
        setUpdateFrequency(loadedUpdateFrequency);

        settings.changed.connect(() => {
          setUpdateFrequency(
            (settings.get('updateFrequency').composite as number) ||
              DEFAULT_UPDATE_FREQUENCY
          );
        });
      } catch (error) {
        console.error(`An error occurred while loading settings: ${error}`);
      }
    };
    loadSettings();
  }, []);
}

export default loadSettingRegistry;
