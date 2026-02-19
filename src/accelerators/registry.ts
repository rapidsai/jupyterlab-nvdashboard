/**
 * Accelerator Plugin Registry
 *
 * Central registry for managing GPU accelerator plugins.
 * Handles plugin registration and availability checking via backend API.
 */

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import {
  IAcceleratorPlugin,
  IAcceleratorStatus,
  IAcceleratorSystemInfo
} from './types';
import { cudfpandasPlugin, cumlaccelPlugin } from './plugins';

/**
 * Registry for GPU accelerator plugins.
 * Manages available plugins and queries the backend for system capabilities.
 */
export class AcceleratorRegistry {
  private plugins: Map<string, IAcceleratorPlugin>;

  constructor() {
    this.plugins = new Map();
    // Auto-register built-in plugins
    this.register(cudfpandasPlugin);
    this.register(cumlaccelPlugin);
  }

  /**
   * Register a new accelerator plugin.
   * Warns if overwriting an existing plugin with the same ID.
   */
  register(plugin: IAcceleratorPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(
        `Overwriting existing plugin: ${plugin.id}. Previous plugin will be replaced.`
      );
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Get all registered plugins.
   */
  getAll(): IAcceleratorPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by ID.
   */
  get(id: string): IAcceleratorPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Check system capabilities and accelerator availability.
   * Calls the backend API: GET /nvdashboard/accelerators/check
   *
   * @returns Promise resolving to system information
   */
  async checkAvailability(): Promise<IAcceleratorSystemInfo> {
    const settings = ServerConnection.makeSettings();
    const baseUrl = settings.baseUrl;
    const url = URLExt.join(baseUrl, 'nvdashboard', 'accelerators', 'check');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: IAcceleratorSystemInfo = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking accelerator availability:', error);
      // Return a safe default if API call fails
      return {
        has_gpu: false,
        ngpus: 0,
        accelerators: {}
      };
    }
  }

  /**
   * Get the status of a specific accelerator.
   *
   * @param pluginId - The ID of the plugin to check
   * @param systemInfo - System information from checkAvailability()
   * @returns Status of the accelerator, or unavailable if not found
   */
  getPluginStatus(
    pluginId: string,
    systemInfo: IAcceleratorSystemInfo
  ): IAcceleratorStatus {
    return (
      systemInfo.accelerators[pluginId] || {
        available: false,
        version: null
      }
    );
  }
}

// Singleton instance
export const acceleratorRegistry = new AcceleratorRegistry();
