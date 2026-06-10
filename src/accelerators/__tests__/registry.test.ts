/*
 * SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests for AcceleratorRegistry
 */

import { ServerConnection } from '@jupyterlab/services';
import { AcceleratorRegistry } from '../registry';
import { IAcceleratorPlugin, IAcceleratorSystemInfo } from '../types';

// Mock JupyterLab modules
jest.mock('@jupyterlab/coreutils', () => ({
  URLExt: {
    join: (...parts: string[]) => parts.join('/')
  }
}));

jest.mock('@jupyterlab/services', () => ({
  ServerConnection: {
    makeSettings: () => ({
      baseUrl: 'http://localhost:8888'
    }),
    makeRequest: jest.fn(),
    ResponseError: class ResponseError extends Error {
      response: Response;
      constructor(response: Response) {
        super(`${response.status}`);
        this.response = response;
      }
    }
  }
}));

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body)
  } as Response;
}

describe('AcceleratorRegistry', () => {
  let registry: AcceleratorRegistry;

  beforeEach(() => {
    registry = new AcceleratorRegistry();
    (ServerConnection.makeRequest as jest.Mock).mockReset();
  });

  describe('Plugin Registration', () => {
    /**
     * Verifies that the registry automatically registers built-in plugins
     * (cudf-pandas and cuml-accel) when instantiated.
     */
    it('should auto-register built-in plugins on construction', () => {
      const plugins = registry.getAll();
      expect(plugins).toHaveLength(2);
      expect(plugins.map(p => p.id)).toContain('cudf-pandas');
      expect(plugins.map(p => p.id)).toContain('cuml-accel');
    });

    /**
     * Tests manual plugin registration - verifies a new plugin can be
     * registered and then retrieved by ID.
     */
    it('should register a new plugin', () => {
      const newPlugin: IAcceleratorPlugin = {
        id: 'test-accel',
        name: 'Test Accelerator',
        description: 'Test description',
        pythonPackage: 'testpackage',
        activationCode: '%load_ext testpackage'
      };

      registry.register(newPlugin);

      const plugin = registry.get('test-accel');
      expect(plugin).toBeDefined();
      expect(plugin?.id).toBe('test-accel');
      expect(plugin?.name).toBe('Test Accelerator');
    });

    /**
     * Verifies getAll() returns an array of all registered plugins
     * and that each plugin has all required properties.
     */
    it('should get all registered plugins', () => {
      const plugins = registry.getAll();
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBeGreaterThanOrEqual(2); // At least built-ins

      // Verify all plugins have required fields
      plugins.forEach(plugin => {
        expect(plugin).toHaveProperty('id');
        expect(plugin).toHaveProperty('name');
        expect(plugin).toHaveProperty('description');
        expect(plugin).toHaveProperty('pythonPackage');
        expect(plugin).toHaveProperty('activationCode');
      });
    });

    /**
     * Validates that all plugins conform to the IAcceleratorPlugin interface:
     * - Required string fields are non-empty
     * - Optional fields (if present) are valid (e.g., documentation is a URL)
     */
    it('should validate all plugins match IAcceleratorPlugin interface', () => {
      const plugins = registry.getAll();

      plugins.forEach(plugin => {
        // Check required string fields are non-empty
        expect(typeof plugin.id).toBe('string');
        expect(plugin.id.length).toBeGreaterThan(0);
        expect(typeof plugin.name).toBe('string');
        expect(plugin.name.length).toBeGreaterThan(0);
        expect(typeof plugin.description).toBe('string');
        expect(plugin.description.length).toBeGreaterThan(0);
        expect(typeof plugin.pythonPackage).toBe('string');
        expect(plugin.pythonPackage.length).toBeGreaterThan(0);
        expect(typeof plugin.activationCode).toBe('string');
        expect(plugin.activationCode.length).toBeGreaterThan(0);

        // Check optional fields if present
        if (plugin.minimumVersion !== undefined) {
          expect(typeof plugin.minimumVersion).toBe('string');
          expect(plugin.minimumVersion.length).toBeGreaterThan(0);
        }
        if (plugin.documentation !== undefined) {
          expect(typeof plugin.documentation).toBe('string');
          expect(plugin.documentation).toMatch(/^https?:\/\//); // Should be a URL
        }
      });
    });

    /**
     * Ensures no duplicate plugin IDs exist in the registry.
     * This prevents conflicts when registering or retrieving plugins.
     */
    it('should have unique plugin IDs', () => {
      const plugins = registry.getAll();
      const ids = plugins.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length); // No duplicates
    });

    /**
     * Tests retrieving a specific plugin by its ID.
     * Verifies the correct plugin is returned with expected properties.
     */
    it('should get a specific plugin by ID', () => {
      const plugin = registry.get('cudf-pandas');
      expect(plugin).toBeDefined();
      expect(plugin?.id).toBe('cudf-pandas');
      expect(plugin?.name).toBe('cuDF pandas');
    });

    /**
     * Verifies that requesting a non-existent plugin returns undefined
     * rather than throwing an error.
     */
    it('should return undefined for non-existent plugin', () => {
      const plugin = registry.get('non-existent');
      expect(plugin).toBeUndefined();
    });

    /**
     * Tests that registering a plugin with an existing ID overwrites
     * the previous plugin rather than creating a duplicate.
     * Also verifies that a warning is logged when overwriting.
     */
    it('should overwrite existing plugin when registering with same ID', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const originalPlugin = registry.get('cudf-pandas');
      expect(originalPlugin).toBeDefined();

      const newPlugin: IAcceleratorPlugin = {
        id: 'cudf-pandas',
        name: 'Updated cuDF pandas',
        description: 'Updated description',
        pythonPackage: 'cudf',
        activationCode: '%load_ext cudf.pandas'
      };

      registry.register(newPlugin);

      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Overwriting existing plugin: cudf-pandas. Previous plugin will be replaced.'
      );

      const updatedPlugin = registry.get('cudf-pandas');
      expect(updatedPlugin?.name).toBe('Updated cuDF pandas');
      expect(updatedPlugin?.description).toBe('Updated description');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('checkAvailability()', () => {
    /**
     * Suppress console.error output during error-handling tests (Jest equivalent
     * of pytest's context manager pattern: `with pytest.warns(UserWarning):`).
     *
     * The spy is kept available for debugging. If a test fails, inspect:
     *   - consoleSpy.mock.calls - All console.error calls
     *   - consoleSpy.mock.calls[0][1].message - Error message
     *
     * To verify error logging, uncomment the expect(consoleSpy) assertion in tests.
     */
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      // Suppress console.error output but keep spy for debugging
      // The spy captures all calls so we can inspect them if tests fail
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore original console.error after each test
      consoleSpy.mockRestore();
    });

    /**
     * Tests successful API call - verifies the registry correctly fetches
     * system information from the backend and returns the expected structure.
     */
    it('should successfully fetch and return system info', async () => {
      const mockSystemInfo: IAcceleratorSystemInfo = {
        has_gpu: true,
        ngpus: 2,
        accelerators: {
          'cudf-pandas': {
            available: true,
            version: '25.12.0'
          },
          'cuml-accel': {
            available: true,
            version: '25.12.0'
          }
        }
      };

      (ServerConnection.makeRequest as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse(mockSystemInfo)
      );

      const result = await registry.checkAvailability();

      expect(result).toEqual(mockSystemInfo);
      expect(result.has_gpu).toBe(true);
      expect(result.ngpus).toBe(2);

      // Verify cudf-pandas accelerator
      expect(result.accelerators).toHaveProperty('cudf-pandas');
      expect(result.accelerators['cudf-pandas'].available).toBe(true);
      expect(result.accelerators['cudf-pandas'].version).toBe('25.12.0');

      // Verify cuml-accel accelerator
      expect(result.accelerators).toHaveProperty('cuml-accel');
      expect(result.accelerators['cuml-accel'].available).toBe(true);
      expect(result.accelerators['cuml-accel'].version).toBe('25.12.0');
    });

    /**
     * Tests error handling for HTTP errors (e.g., 404).
     * Verifies the registry returns a safe default instead of throwing.
     *
     * If this test fails, you can debug by inspecting the spy:
     *   console.log('Error calls:', consoleSpy.mock.calls);
     *   console.log('Error message:', consoleSpy.mock.calls[0]?.[1]?.message);
     */
    it('should handle HTTP errors and return safe default', async () => {
      (ServerConnection.makeRequest as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse('Not Found', 404)
      );

      const result = await registry.checkAvailability();

      expect(result).toEqual({
        has_gpu: false,
        ngpus: 0,
        accelerators: {}
      });

      // Optional: Verify error was logged (uncomment if you want to test logging behavior)
      // expect(consoleSpy).toHaveBeenCalledWith(
      //   'Error checking accelerator availability:',
      //   expect.any(Error)
      // );
    });

    /**
     * Tests error handling for network failures (e.g., connection refused).
     * Verifies the registry gracefully handles network errors.
     */
    it('should handle network errors and return safe default', async () => {
      (ServerConnection.makeRequest as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await registry.checkAvailability();

      expect(result).toEqual({
        has_gpu: false,
        ngpus: 0,
        accelerators: {}
      });
    });

    /**
     * Tests error handling for malformed JSON responses.
     * Ensures the registry doesn't crash on invalid API responses.
     */
    it('should handle invalid JSON response and return safe default', async () => {
      (ServerConnection.makeRequest as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      } as Response);

      const result = await registry.checkAvailability();

      expect(result).toEqual({
        has_gpu: false,
        ngpus: 0,
        accelerators: {}
      });
    });

    /**
     * Verifies the registry constructs the correct API endpoint URL
     * and uses the proper HTTP method and headers.
     */
    it('should construct correct API URL', async () => {
      (ServerConnection.makeRequest as jest.Mock).mockResolvedValueOnce(
        mockJsonResponse({ has_gpu: false, ngpus: 0, accelerators: {} })
      );

      await registry.checkAvailability();

      expect(ServerConnection.makeRequest).toHaveBeenCalledWith(
        'http://localhost:8888/nvdashboard/accelerators/check',
        {},
        expect.objectContaining({ baseUrl: 'http://localhost:8888' })
      );
    });
  });

  describe('getPluginStatus()', () => {
    /**
     * Tests retrieving status for an available plugin.
     * Verifies correct status (available: true, version) is returned.
     */
    it('should return status for available plugin', () => {
      const systemInfo: IAcceleratorSystemInfo = {
        has_gpu: true,
        ngpus: 1,
        accelerators: {
          'cudf-pandas': {
            available: true,
            version: '25.12.0'
          }
        }
      };

      const status = registry.getPluginStatus('cudf-pandas', systemInfo);

      expect(status).toEqual({
        available: true,
        version: '25.12.0'
      });
    });

    /**
     * Tests retrieving status for a plugin that doesn't exist in system info.
     * Verifies it returns unavailable status (available: false, version: null).
     */
    it('should return unavailable status for non-existent plugin', () => {
      const systemInfo: IAcceleratorSystemInfo = {
        has_gpu: true,
        ngpus: 1,
        accelerators: {
          'cudf-pandas': {
            available: true,
            version: '25.12.0'
          }
        }
      };

      const status = registry.getPluginStatus('non-existent', systemInfo);

      expect(status).toEqual({
        available: false,
        version: null
      });
    });

    /**
     * Tests retrieving status for a plugin that exists but is unavailable.
     * Verifies it correctly returns the unavailable status from system info.
     */
    it('should return unavailable status for unavailable plugin', () => {
      const systemInfo: IAcceleratorSystemInfo = {
        has_gpu: true,
        ngpus: 1,
        accelerators: {
          'cuml-accel': {
            available: false,
            version: null
          }
        }
      };

      const status = registry.getPluginStatus('cuml-accel', systemInfo);

      expect(status).toEqual({
        available: false,
        version: null
      });
    });

    /**
     * Tests edge case where system info has no accelerators data.
     * Verifies the method returns unavailable status gracefully.
     */
    it('should handle empty accelerators object', () => {
      const systemInfo: IAcceleratorSystemInfo = {
        has_gpu: false,
        ngpus: 0,
        accelerators: {}
      };

      const status = registry.getPluginStatus('cudf-pandas', systemInfo);

      expect(status).toEqual({
        available: false,
        version: null
      });
    });

    /**
     * Tests that getPluginStatus() correctly handles multiple plugins
     * with different availability statuses in the same system info.
     */
    it('should handle multiple plugins correctly', () => {
      const systemInfo: IAcceleratorSystemInfo = {
        has_gpu: true,
        ngpus: 2,
        accelerators: {
          'cudf-pandas': {
            available: true,
            version: '25.12.0'
          },
          'cuml-accel': {
            available: false,
            version: null
          }
        }
      };

      const cudfStatus = registry.getPluginStatus('cudf-pandas', systemInfo);
      const cumlStatus = registry.getPluginStatus('cuml-accel', systemInfo);

      expect(cudfStatus.available).toBe(true);
      expect(cudfStatus.version).toBe('25.12.0');
      expect(cumlStatus.available).toBe(false);
      expect(cumlStatus.version).toBeNull();
    });
  });
});
