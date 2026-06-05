/**
 * Export all accelerator plugins
 *
 * To add a new accelerator plugin:
 * 1. Create a new file in this directory (e.g., newAccel.ts)
 * 2. Define the plugin following the IAcceleratorPlugin interface
 * 3. Export it here
 * 4. It will automatically appear in the UI!
 */

export { cudfpandasPlugin } from './cudfpandas';
export { cumlaccelPlugin } from './cumlaccel';
