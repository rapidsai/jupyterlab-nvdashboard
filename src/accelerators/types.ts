/**
 * Type definitions for GPU accelerator plugins
 */

/**
 * Defines a GPU accelerator plugin that can be loaded in Jupyter kernels.
 */
export interface IAcceleratorPlugin {
  /** Unique identifier for this accelerator (e.g., 'cudf-pandas') */
  id: string;

  /** Display name shown in UI (e.g., 'cuDF pandas') */
  name: string;

  /** Brief description of what this accelerator does */
  description: string;

  /** Python package name to check for availability (e.g., 'cudf') */
  pythonPackage: string;

  /** Extension name for %load_ext command (e.g., 'cudf.pandas') */
  extensionName: string;

  /** Minimum version required (optional) */
  minimumVersion?: string;

  /** URL to documentation */
  documentation?: string;
}

/**
 * Status of a single accelerator's availability on the system.
 */
export interface IAcceleratorStatus {
  /** Whether the Python package is installed */
  available: boolean;

  /** Version of the installed package, or null if not available */
  version: string | null;
}

/**
 * Complete system information about GPU and accelerator availability.
 * This matches the response from GET /nvdashboard/accelerators/check
 */
export interface IAcceleratorSystemInfo {
  /** Whether the system has any GPUs */
  has_gpu: boolean;

  /** Number of GPUs detected */
  ngpus: number;

  /** Availability status for each registered accelerator */
  accelerators: Record<string, IAcceleratorStatus>;
}
