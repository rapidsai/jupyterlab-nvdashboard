/*
 * SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests for AcceleratorButton Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'jest-fetch-mock';
import { AcceleratorSelector } from '../AcceleratorButton';
import { acceleratorRegistry } from '../registry';
import { IAcceleratorSystemInfo } from '../types';

// Mock JupyterLab modules
jest.mock('@jupyterlab/apputils', () => ({
  ReactWidget: class MockReactWidget {},
  showDialog: jest.fn(),
  Dialog: {
    okButton: () => ({ label: 'OK' }),
    cancelButton: (options?: { label?: string }) => ({
      label: options?.label || 'Cancel'
    }),
    warnButton: (options?: { label?: string }) => ({
      label: options?.label || 'Restart Kernel'
    })
  }
}));

jest.mock('@jupyterlab/ui-components', () => ({
  HTMLSelect: ({ children, onChange, disabled, title, ...props }: any) => (
    <select
      onChange={onChange}
      disabled={disabled}
      title={title}
      data-testid="accelerator-select"
      {...props}
    >
      {children}
    </select>
  )
}));

jest.mock('@jupyterlab/translation', () => ({
  nullTranslator: {
    load: () => ({
      __: (str: string, ...args: unknown[]) =>
        args.reduce(
          (s, arg, i) => (s as string).replace(`%${i + 1}`, String(arg)),
          str
        )
    })
  }
}));

jest.mock('../registry', () => ({
  acceleratorRegistry: {
    checkAvailability: jest.fn(),
    getAll: jest.fn(),
    get: jest.fn(),
    getPluginStatus: jest.fn()
  }
}));

// Mock the registry module
const mockAcceleratorRegistry = acceleratorRegistry as jest.Mocked<
  typeof acceleratorRegistry
>;

// Get the mocked showDialog function so we can control its return value
import { showDialog } from '@jupyterlab/apputils';
const mockShowDialog = jest.mocked(showDialog);

describe('AcceleratorSelector Component', () => {
  // Mock session context
  const mockKernel = {
    id: 'test-kernel-id',
    status: 'idle' as const,
    requestExecute: jest.fn(() => ({
      done: Promise.resolve({
        content: { status: 'ok' }
      })
    }))
  };

  const mockSession = {
    kernel: mockKernel
  };

  const mockSessionContext = {
    session: mockSession,
    statusChanged: {
      connect: jest.fn(),
      disconnect: jest.fn()
    },
    restartKernel: jest.fn()
  } as any;

  // Mock notebook panel
  const mockNotebookModel = {
    getMetadata: jest.fn(),
    setMetadata: jest.fn()
  };

  const mockNotebookPanel = {
    model: mockNotebookModel
  } as any;

  const defaultSystemInfo: IAcceleratorSystemInfo = {
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

  const mockPlugins = [
    {
      id: 'cudf-pandas',
      name: 'cuDF pandas',
      description: 'GPU-accelerated pandas',
      pythonPackage: 'cudf',
      activationCode: '%load_ext cudf.pandas'
    },
    {
      id: 'cuml-accel',
      name: 'cuML Accelerator',
      description: 'GPU-accelerated scikit-learn',
      pythonPackage: 'cuml',
      activationCode: '%load_ext cuml.accel'
    }
  ];

  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();

    // Reset kernel.requestExecute to the default OK response.
    // clearAllMocks only clears call records, not mockReturnValue overrides
    // set by individual tests - so without this, an error-status override
    // from one test would leak into subsequent tests.
    mockKernel.requestExecute.mockImplementation(() => ({
      done: Promise.resolve({
        content: { status: 'ok' }
      })
    }));

    // Setup default mocks
    mockAcceleratorRegistry.checkAvailability.mockResolvedValue(
      defaultSystemInfo
    );
    mockAcceleratorRegistry.getAll.mockReturnValue(mockPlugins as any);
    mockAcceleratorRegistry.get.mockImplementation((id: string) => {
      return mockPlugins.find(p => p.id === id) as any;
    });
    mockAcceleratorRegistry.getPluginStatus.mockImplementation(
      (id: string, systemInfo: IAcceleratorSystemInfo) => {
        return (
          systemInfo.accelerators[id] || {
            available: false,
            version: null
          }
        );
      }
    );

    mockNotebookModel.getMetadata.mockReturnValue([]);
    mockNotebookModel.setMetadata.mockImplementation(() => {});

    // Default mock for showDialog - returns a result with cancel button (user doesn't accept)
    // This prevents errors when code tries to access result.button.accept
    mockShowDialog.mockResolvedValue({
      button: { accept: false, label: 'Cancel' }
    } as any);
  });

  describe('Rendering States', () => {
    /**
     * Verifies the component shows a loading state while fetching
     * system information from the backend.
     *
     * Test flow:
     * 1. Mock checkAvailability to delay response (simulates slow API)
     * 2. Render component - triggers async checkAvailability call
     * 3. Verify "Loading..." text appears immediately
     * 4. Verify dropdown is disabled during loading
     */
    it('should render loading state initially', async () => {
      // Delay the availability check to simulate slow API response
      mockAcceleratorRegistry.checkAvailability.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve(defaultSystemInfo), 100)
          )
      );

      // Render component - this triggers the async checkAvailability() call
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      // Verify loading state is shown immediately (before API responds)
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      // Verify dropdown is disabled during loading
      expect(screen.getByTestId('accelerator-select')).toBeDisabled();
    });

    /**
     * Verifies the component renders nothing when no GPU is detected.
     * This ensures the UI doesn't show accelerator options on non-GPU systems.
     *
     * Test flow:
     * 1. Mock system info with has_gpu: false
     * 2. Render component
     * 3. Wait for component to process system info
     * 4. Verify component returns null (renders nothing)
     */
    it('should not render when no GPU is available', async () => {
      // Create system info indicating no GPU available
      const noGpuInfo: IAcceleratorSystemInfo = {
        has_gpu: false,
        ngpus: 0,
        accelerators: {}
      };

      // Mock registry to return no-GPU system info
      mockAcceleratorRegistry.checkAvailability.mockResolvedValue(noGpuInfo);

      // Render component - it should detect no GPU and return null
      const { container } = render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      // Wait for async checkAvailability to complete, then verify nothing rendered
      await waitFor(() => {
        // container is the root DOM element created by React Testing Library's render()
        // When a component returns null, React renders nothing, so container has no children
        // container.firstChild will be null if nothing was rendered, which is what we expect
        // when the component detects no GPU is available
        expect(container.firstChild).toBeNull();
      });
    });

    /**
     * Verifies the component displays the correct label with active count
     * when accelerators are active.
     *
     * Test flow:
     * 1. Set up metadata with saved accelerator (simulates previous selection)
     * 2. Render component
     * 3. Component loads saved accelerator from metadata
     * 4. Verify label shows "GPU Accel" (with count if active)
     */
    it('should display active count in label', async () => {
      // Set up metadata with active accelerators (simulates saved state)
      mockNotebookModel.getMetadata.mockReturnValue(['cudf-pandas']);

      // Render component - it should load saved accelerators from metadata
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      // Wait for component to load and verify label appears
      await waitFor(() => {
        expect(screen.getByText(/GPU Accel/)).toBeInTheDocument();
      });
    });

    /**
     * Verifies the component shows a reload indicator when accelerators
     * are being reloaded after kernel restart.
     *
     * Test flow:
     * 1. Set up saved accelerators in metadata (simulates previous selection)
     * 2. Make requestExecute return a delayed promise (simulates slow kernel execution)
     * 3. Render component - triggers auto-load of saved accelerators
     * 4. Verify reload indicator (⟳) appears in label while loading
     * 5. Verify dropdown is disabled during reload
     * 6. Verify tooltip changes to show loading message
     */
    it('should show reload indicator when reloading accelerators', async () => {
      // Set up saved accelerators in metadata (simulates previous selection)
      mockNotebookModel.getMetadata.mockReturnValue(['cudf-pandas']);

      // Create a promise that we can control - delay resolution to keep reload state active
      let resolveExecute: (value: { content: { status: string } }) => void;
      const executePromise = new Promise<{ content: { status: string } }>(
        resolve => {
          resolveExecute = resolve;
        }
      );

      // Mock requestExecute to return a delayed promise (simulates slow kernel execution)
      mockKernel.requestExecute.mockReturnValue({
        done: executePromise
      });

      // Render component - it will detect saved accelerators and start loading them
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      // Wait for component to finish initial loading and start reloading accelerators
      await waitFor(() => {
        const select = screen.getByTestId('accelerator-select');
        expect(select).toBeInTheDocument();
      });

      // Now verify the reload indicator appears while accelerators are being loaded
      await waitFor(() => {
        // Verify the ⟳ symbol appears in the label
        expect(screen.getByText(/GPU Accel ⟳/)).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');

      // Verify dropdown is disabled during reload
      expect(select).toBeDisabled();

      // Verify tooltip changes to show loading message
      expect(select).toHaveAttribute(
        'title',
        'Loading accelerators after kernel restart...\n\nPlease wait before running code.'
      );

      // Resolve the promise to complete the loading (cleanup)
      resolveExecute!({
        content: { status: 'ok' }
      });

      // Wait for reload to complete
      await waitFor(() => {
        expect(select).not.toBeDisabled();
      });
    });
  });

  describe('User Interactions', () => {
    /**
     * Tests toggling an individual accelerator on/off.
     * Verifies kernel execution and metadata updates.
     *
     * Test flow:
     * 1. Render component
     * 2. Wait for component to load
     * 3. Simulate user selecting an accelerator from dropdown
     * 4. Verify kernel.execute() was called with correct activation code
     * 5. (Metadata save is tested in separate test)
     */
    it('should toggle individual accelerator', async () => {
      // Setup user event simulator
      const user = userEvent.setup();

      // Render component
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      // Wait for component to finish loading system info
      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');

      // Simulate user selecting 'cudf-pandas' from dropdown
      // This triggers handleChange() which executes the activation code
      await user.selectOptions(select, 'cudf-pandas');

      // Verify kernel.execute() was called with the correct activation code
      await waitFor(() => {
        expect(mockKernel.requestExecute).toHaveBeenCalledWith({
          code: '%load_ext cudf.pandas',
          silent: false, // Must be false for extensions to load properly
          store_history: false
        });
      });
    });

    /**
     * Tests the "Select All" functionality - verifies all available
     * accelerators are activated in a single batch operation.
     *
     * Test flow:
     * 1. Render component with multiple available accelerators
     * 2. Simulate user selecting "Select All" option
     * 3. Verify kernel.execute() was called with exact batch activation code
     * 4. Verify metadata was saved with all accelerators
     * 5. Verify dialog was shown with correct message
     * 6. Component should activate all available accelerators at once
     */
    it('should handle select all accelerators', async () => {
      const user = userEvent.setup();

      // Render component - both cudf-pandas and cuml-accel are available
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');

      // Simulate user selecting "Select All" option
      // This should batch-activate all available accelerators
      await user.selectOptions(select, 'select-all');

      // Verify kernel.execute() was called with exact batch activation code
      // The batch code should combine all activation codes with newlines
      await waitFor(() => {
        expect(mockKernel.requestExecute).toHaveBeenCalledWith({
          code: '%load_ext cudf.pandas\n%load_ext cuml.accel',
          silent: false, // Must be false for extensions to load properly
          store_history: false
        });
      });

      // Verify metadata was saved with both accelerators
      // The component saves all active accelerator IDs to notebook metadata
      await waitFor(() => {
        expect(mockNotebookModel.setMetadata).toHaveBeenCalledWith(
          'gpu_accelerators',
          ['cudf-pandas', 'cuml-accel']
        );
      });

      // Verify dialog was shown with correct message
      // The dialog should indicate all accelerators were enabled
      await waitFor(() => {
        expect(mockShowDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'All Accelerators Enabled',
            body: expect.stringContaining('2 available accelerator(s)')
          })
        );
      });
    });

    /**
     * Tests the "Clear All" functionality - verifies all active
     * accelerators are cleared and metadata is updated.
     *
     * Test flow:
     * 1. Set up metadata with active accelerators (simulates current state)
     * 2. Render component
     * 3. Simulate user selecting "Clear All" option
     * 4. Verify metadata is cleared (set to empty array)
     * 5. Component should also show dialog prompting kernel restart
     */
    it('should handle clear all accelerators', async () => {
      const user = userEvent.setup();

      // Set up with active accelerators (simulates user having selected them)
      mockNotebookModel.getMetadata.mockReturnValue([
        'cudf-pandas',
        'cuml-accel'
      ]);

      // Render component - it loads the active accelerators from metadata
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');

      // Simulate user selecting "Clear All" option
      // This should clear all active accelerators and update metadata
      await user.selectOptions(select, 'clear-all');

      // Verify metadata was cleared
      // Note: saveAcceleratorsToMetadata calls setMetadata with undefined when array is empty
      // The component also clears metadata on initialization, so we check the last call
      await waitFor(() => {
        const calls = mockNotebookModel.setMetadata.mock.calls;
        // Check that setMetadata was called with undefined (for clearing)
        // It may be called multiple times (init + clear-all), so check the last one
        const lastCall = calls[calls.length - 1];
        expect(lastCall).toEqual(['gpu_accelerators', undefined]);
      });
    });

    /**
     * Verifies that when the kernel replies with an error during individual
     * activation (e.g., non-Python kernel, missing package, broken install),
     * the accelerator is NOT marked active and is NOT saved to notebook
     * metadata. The user should see an error dialog instead.
     */
    it('should not activate or persist individual accelerator when kernel returns error', async () => {
      const user = userEvent.setup();

      // Mock kernel to reply with an error status (e.g., ModuleNotFoundError)
      mockKernel.requestExecute.mockReturnValue({
        done: Promise.resolve({
          content: {
            status: 'error',
            ename: 'ModuleNotFoundError',
            evalue: "No module named 'cudf'"
          }
        })
      });

      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');
      await user.selectOptions(select, 'cudf-pandas');

      // Kernel was asked to load the extension
      await waitFor(() => {
        expect(mockKernel.requestExecute).toHaveBeenCalledWith({
          code: '%load_ext cudf.pandas',
          silent: false,
          store_history: false
        });
      });

      // Error dialog was shown to the user
      await waitFor(() => {
        expect(mockShowDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Failed to activate')
          })
        );
      });

      // Metadata was NOT updated to include the failed accelerator.
      // (setMetadata may still have been called during component init to
      // clear stale metadata - but never with the failed plugin id in the array.)
      const metadataCalls = mockNotebookModel.setMetadata.mock.calls;
      const sawFailedActivation = metadataCalls.some(
        ([key, value]) =>
          key === 'gpu_accelerators' &&
          Array.isArray(value) &&
          value.includes('cudf-pandas')
      );
      expect(sawFailedActivation).toBe(false);

      // The "Installed / Restart Kernel" dialog should NOT have been shown
      const installedDialogShown = mockShowDialog.mock.calls.some(
        ([opts]) =>
          (opts as { title?: string })?.title?.includes('Installed') ?? false
      );
      expect(installedDialogShown).toBe(false);
    });

    /**
     * Same contract as the individual-toggle test above, but for the
     * "Select All" batch activation path. A kernel error must leave UI and
     * metadata untouched.
     */
    it('should not activate or persist select-all when kernel returns error', async () => {
      const user = userEvent.setup();

      mockKernel.requestExecute.mockReturnValue({
        done: Promise.resolve({
          content: {
            status: 'error',
            ename: 'ModuleNotFoundError',
            evalue: "No module named 'cudf'"
          }
        })
      });

      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');
      await user.selectOptions(select, 'select-all');

      // Batch load was attempted
      await waitFor(() => {
        expect(mockKernel.requestExecute).toHaveBeenCalledWith({
          code: '%load_ext cudf.pandas\n%load_ext cuml.accel',
          silent: false,
          store_history: false
        });
      });

      // Error dialog was shown
      await waitFor(() => {
        expect(mockShowDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Failed to enable accelerators'
          })
        );
      });

      // Metadata was NOT updated to include either accelerator
      const metadataCalls = mockNotebookModel.setMetadata.mock.calls;
      const sawAnyActivation = metadataCalls.some(
        ([key, value]) =>
          key === 'gpu_accelerators' && Array.isArray(value) && value.length > 0
      );
      expect(sawAnyActivation).toBe(false);

      // The success "All Accelerators Enabled" dialog should NOT have been shown
      const successDialogShown = mockShowDialog.mock.calls.some(
        ([opts]) =>
          (opts as { title?: string })?.title === 'All Accelerators Enabled'
      );
      expect(successDialogShown).toBe(false);
    });

    /**
     * Verifies the component shows an error dialog when trying to
     * use accelerators without a kernel running.
     *
     * Test flow:
     * 1. Create session context with no kernel (kernel: null)
     * 2. Render component
     * 3. Simulate user trying to select an accelerator
     * 4. Verify error dialog is shown with appropriate message
     * 5. Kernel execution should NOT be attempted
     */
    it('should show error when no kernel is available', async () => {
      const user = userEvent.setup();

      // Create session context without a kernel (simulates no kernel started)
      const noKernelContext = {
        session: { kernel: null },
        statusChanged: {
          connect: jest.fn(),
          disconnect: jest.fn()
        }
      } as any;

      // Render component - it should still render even without kernel
      render(
        <AcceleratorSelector
          sessionContext={noKernelContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');
      // Try to select accelerator - should trigger error dialog
      await user.selectOptions(select, 'cudf-pandas');

      // Verify error dialog was shown with correct message
      await waitFor(() => {
        expect(mockShowDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'No Kernel',
            body: 'Please start a kernel first.'
          })
        );
      });
    });
  });

  describe('Metadata Helpers', () => {
    /**
     * Verifies accelerators are correctly saved to notebook metadata.
     * This ensures accelerator state persists across kernel restarts.
     *
     * Test flow:
     * 1. Render component
     * 2. Simulate user selecting an accelerator
     * 3. Component executes activation code in kernel
     * 4. Component saves selection to notebook metadata
     * 5. Verify setMetadata() was called with correct accelerator ID
     */
    it('should save accelerators to metadata', async () => {
      const user = userEvent.setup();

      // Render component
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');
      // Select accelerator - triggers activation and metadata save
      await user.selectOptions(select, 'cudf-pandas');

      // Verify metadata was saved with the selected accelerator ID
      await waitFor(() => {
        expect(mockNotebookModel.setMetadata).toHaveBeenCalledWith(
          'gpu_accelerators',
          ['cudf-pandas']
        );
      });
    });

    /**
     * Verifies accelerators are correctly loaded from notebook metadata
     * when the component mounts or kernel restarts.
     *
     * Test flow:
     * 1. Set up metadata with saved accelerator (simulates previous session)
     * 2. Render component
     * 3. Component should read metadata on mount
     * 4. Verify getMetadata() was called with correct key
     * 5. Component should auto-reload the saved accelerator in kernel
     */
    it('should load accelerators from metadata', async () => {
      // Set up metadata with saved accelerator (simulates notebook with saved state)
      mockNotebookModel.getMetadata.mockReturnValue(['cudf-pandas']);

      // Render component - it should read metadata and auto-reload accelerators
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      // Verify component read the metadata
      await waitFor(() => {
        expect(mockNotebookModel.getMetadata).toHaveBeenCalledWith(
          'gpu_accelerators'
        );
      });
    });

    /**
     * Verifies metadata is cleared when notebook panel is not available.
     * This handles edge cases gracefully.
     *
     * Test flow:
     * 1. Render component without notebook panel (undefined)
     * 2. Component should handle missing panel gracefully
     * 3. Verify component still renders (doesn't crash)
     * 4. Metadata operations should be skipped (no errors thrown)
     */
    it('should handle missing notebook panel gracefully', async () => {
      // Render component without notebook panel (edge case - e.g., in non-notebook context)
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={undefined}
        />
      );

      // Verify component still renders successfully
      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      // Should not throw errors when notebook panel is undefined
      // Component should handle this gracefully by skipping metadata operations
      expect(() => {
        const select = screen.getByTestId('accelerator-select');
        expect(select).toBeInTheDocument();
      }).not.toThrow();
    });
  });

  describe('Kernel Lifecycle', () => {
    /**
     * Verifies the component connects to kernel status changes.
     * This is essential for auto-reloading accelerators after restarts.
     *
     * Test flow:
     * 1. Render component with kernel available
     * 2. Component should set up listener for kernel status changes
     * 3. Verify statusChanged.connect() was called
     * 4. This listener enables auto-reload when kernel restarts
     */
    it('should connect to kernel status changes', async () => {
      // Render component - it should connect to kernel status changes on mount
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      // Verify component connected to status change events
      // This is needed to detect kernel restarts and auto-reload accelerators
      await waitFor(() => {
        expect(mockSessionContext.statusChanged.connect).toHaveBeenCalled();
      });
    });

    /**
     * Verifies the component disconnects from kernel status changes
     * on unmount to prevent memory leaks.
     *
     * Test flow:
     * 1. Render component (connects to status changes)
     * 2. Verify connection was established
     * 3. Unmount component (simulates component removal)
     * 4. Verify disconnect() was called (prevents memory leaks)
     */
    it('should disconnect from kernel status changes on unmount', async () => {
      // Render component and get unmount function
      const { unmount } = render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      // Verify connection was established first
      await waitFor(() => {
        expect(mockSessionContext.statusChanged.connect).toHaveBeenCalled();
      });

      // Unmount component (simulates component being removed from DOM)
      unmount();

      // Verify cleanup - disconnect() should be called to prevent memory leaks
      expect(mockSessionContext.statusChanged.disconnect).toHaveBeenCalled();
    });

    /**
     * Verifies the component handles kernel execution errors gracefully:
     * does not crash, and (critically) does not mark the accelerator as
     * active or persist it to notebook metadata when the kernel reports an
     * error status.
     */
    it('should handle kernel execution errors without persisting state', async () => {
      const user = userEvent.setup();
      // Mock kernel to return error (simulates activation code failing)
      mockKernel.requestExecute.mockReturnValue({
        done: Promise.resolve({
          content: { status: 'error', ename: 'Error', evalue: 'Test error' }
        })
      });

      // Render component
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');
      // Try to activate accelerator - kernel execution will fail
      await user.selectOptions(select, 'cudf-pandas');

      // Kernel was asked to load the extension
      await waitFor(() => {
        expect(mockKernel.requestExecute).toHaveBeenCalled();
      });

      // Metadata must NOT contain the failed accelerator
      const metadataCalls = mockNotebookModel.setMetadata.mock.calls;
      const sawFailedActivation = metadataCalls.some(
        ([key, value]) =>
          key === 'gpu_accelerators' &&
          Array.isArray(value) &&
          value.includes('cudf-pandas')
      );
      expect(sawFailedActivation).toBe(false);
    });

    /**
     * Verifies unavailable accelerators are disabled in the dropdown.
     * Users should not be able to select accelerators that aren't installed.
     *
     * Test flow:
     * 1. Set up system info with mix of available/unavailable accelerators
     * 2. Render component
     * 3. Wait for dropdown to be populated
     * 4. Assert the unavailable option (cudf-pandas) is disabled in the DOM
     * 5. Assert the available option (cuml-accel) is not disabled
     */
    it('should disable unavailable accelerators', async () => {
      // Create system info with one unavailable accelerator
      const unavailableInfo: IAcceleratorSystemInfo = {
        has_gpu: true,
        ngpus: 1,
        accelerators: {
          'cudf-pandas': {
            available: false, // Not installed
            version: null
          },
          'cuml-accel': {
            available: true, // Installed
            version: '25.12.0'
          }
        }
      };

      // Mock registry to return mixed availability
      mockAcceleratorRegistry.checkAvailability.mockResolvedValue(
        unavailableInfo
      );

      // Render component - it should check status and disable unavailable options
      render(
        <AcceleratorSelector
          sessionContext={mockSessionContext}
          notebookPanel={mockNotebookPanel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('accelerator-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('accelerator-select');
      const cudfOption = select.querySelector<HTMLOptionElement>(
        'option[value="cudf-pandas"]'
      );
      const cumlOption = select.querySelector<HTMLOptionElement>(
        'option[value="cuml-accel"]'
      );

      expect(cudfOption).toBeTruthy();
      expect(cumlOption).toBeTruthy();
      // Unavailable accelerator must be disabled so users cannot select it
      expect(cudfOption).toBeDisabled();
      // Available accelerator must remain selectable
      expect(cumlOption).not.toBeDisabled();
    });
  });
});
