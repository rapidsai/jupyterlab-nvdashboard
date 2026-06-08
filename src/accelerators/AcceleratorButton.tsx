/*
 * SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * GPU Accelerator Toolbar Selector Component
 *
 * A native select dropdown for toggling GPU accelerators (cudf.pandas, cuml.accel, etc.)
 */

import React, { useState, useEffect, useRef } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { ISessionContext, showDialog, Dialog } from '@jupyterlab/apputils';
import { HTMLSelect } from '@jupyterlab/ui-components';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { NotebookPanel } from '@jupyterlab/notebook';
import { acceleratorRegistry } from './registry';
import { IAcceleratorSystemInfo, IAcceleratorPlugin } from './types';

interface IAcceleratorSelectorProps {
  sessionContext: ISessionContext;
  notebookPanel?: NotebookPanel;
  translator?: ITranslator;
}

/**
 * Helper to safely get accelerators from notebook metadata
 */
function getAcceleratorsFromMetadata(notebookPanel?: NotebookPanel): string[] {
  const model = notebookPanel?.model;
  if (!model) {
    return [];
  }

  const saved = model.getMetadata('gpu_accelerators');
  return (Array.isArray(saved) ? saved : []) as string[];
}

/**
 * Helper to safely save accelerators to notebook metadata
 */
function saveAcceleratorsToMetadata(
  notebookPanel: NotebookPanel | undefined,
  accelerators: string[]
): void {
  const model = notebookPanel?.model;
  if (!model) {
    return;
  }

  if (accelerators.length > 0) {
    model.setMetadata('gpu_accelerators', accelerators);
  } else {
    model.setMetadata('gpu_accelerators', undefined);
  }
}

/**
 * React component for the accelerator selector
 *
 * Exported for testing purposes. This allows tests to directly test the component's
 * behavior without requiring the widget wrapper (AcceleratorSelectorWidget), which
 * is just a thin wrapper that calls render(). Testing the component directly:
 * - Simplifies test setup and maintenance
 * - Allows better isolation of component logic
 * - Is a common pattern in React testing (used by Material-UI, Ant Design, etc.)
 * - Still tests behavior, not implementation details
 *
 * The widget wrapper adds minimal logic (just CSS class and render call), so testing
 * the component directly provides the same coverage with less complexity.
 */
export const AcceleratorSelector: React.FC<IAcceleratorSelectorProps> = ({
  sessionContext,
  notebookPanel,
  translator
}) => {
  const trans = (translator || nullTranslator).load('jupyterlab');
  const [systemInfo, setSystemInfo] = useState<IAcceleratorSystemInfo | null>(
    null
  );
  const [activePluginIds, setActivePluginIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isReloadingAccelerators, setIsReloadingAccelerators] = useState(false);

  // Check system capabilities on mount
  useEffect(() => {
    const checkSystem = async () => {
      setIsLoading(true);
      const info = await acceleratorRegistry.checkAvailability();
      setSystemInfo(info);
      setIsLoading(false);
    };
    checkSystem();
  }, []);

  // Clear metadata when notebook opens (ensures fresh start each session)
  // Use a ref to ensure this only runs once per component mount, not on kernel restart
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (notebookPanel?.model && !hasInitialized.current) {
      const existing = getAcceleratorsFromMetadata(notebookPanel);
      if (existing.length > 0) {
        saveAcceleratorsToMetadata(notebookPanel, []);
      }
      setActivePluginIds(new Set());
      hasInitialized.current = true;
    }
  }, [notebookPanel?.model]);

  // Auto-load saved accelerators when kernel starts or restarts
  // Use refs to avoid stale closure issues in event handlers
  const needsReloadRef = useRef(true);
  const loadingKernelIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionContext.session?.kernel || !notebookPanel?.model) {
      return;
    }

    const kernel = sessionContext.session.kernel;

    const loadSavedAccelerators = async () => {
      // Check if we need to reload and get current kernel
      if (!needsReloadRef.current) {
        return;
      }

      const currentKernel = sessionContext.session?.kernel;
      if (!currentKernel) {
        return;
      }

      const kernelId = currentKernel.id;

      // Prevent duplicate loads for the same kernel (race condition protection)
      if (loadingKernelIdRef.current === kernelId) {
        return;
      }

      try {
        loadingKernelIdRef.current = kernelId;
        needsReloadRef.current = false;

        const savedAccelerators = getAcceleratorsFromMetadata(notebookPanel);

        setIsReloadingAccelerators(true);

        if (savedAccelerators.length === 0) {
          setActivePluginIds(new Set());
          setIsReloadingAccelerators(false);
          return;
        }

        // Batch load all extensions in a single code block for better reliability
        const loadCommands: string[] = [];
        const validPlugins: string[] = [];

        for (const pluginId of savedAccelerators) {
          const plugin = acceleratorRegistry.get(pluginId);
          if (!plugin) {
            console.warn(`[AutoLoad] Plugin not found: ${pluginId}`);
            continue;
          }
          loadCommands.push(plugin.activationCode);
          validPlugins.push(pluginId);
        }

        if (loadCommands.length === 0) {
          setIsReloadingAccelerators(false);
          return;
        }

        // Execute all load_ext commands together
        const code = loadCommands.join('\n');

        const result = await currentKernel.requestExecute({
          code: code,
          silent: false, // Must be false for extensions to load properly
          store_history: false
        }).done;

        // Check if execution was successful
        if (result?.content?.status === 'error') {
          console.error('[AutoLoad] Failed to load accelerators:', result);
          // Still set the active plugins - user can see errors in notebook
          setActivePluginIds(new Set(validPlugins));
        } else {
          setActivePluginIds(new Set(validPlugins));
        }
      } catch (error) {
        console.error('[AutoLoad] Error during accelerator reload:', error);
        // Reset state on error
        setActivePluginIds(new Set());
      } finally {
        setIsReloadingAccelerators(false);
        loadingKernelIdRef.current = null;
      }
    };

    const statusHandler = () => {
      const status = sessionContext.session?.kernel?.status;

      // When kernel restarts, mark that we need to reload
      if (status === 'restarting' || status === 'starting') {
        needsReloadRef.current = true;
        setIsReloadingAccelerators(true);
      }

      // When kernel becomes idle, trigger reload (if needed)
      if (status === 'idle' && needsReloadRef.current) {
        void loadSavedAccelerators();
      }
    };

    sessionContext.statusChanged.connect(statusHandler);

    // Load immediately if kernel is already idle
    if (kernel.status === 'idle') {
      loadSavedAccelerators();
    }

    return () => {
      sessionContext.statusChanged.disconnect(statusHandler);
    };
  }, [sessionContext, notebookPanel, sessionContext.session?.kernel?.id]);

  /**
   * Handle change events for the select dropdown
   */
  const handleChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> => {
    const value = event.target.value;

    if (value === '-') {
      return;
    }

    if (!sessionContext.session?.kernel) {
      void showDialog({
        title: trans.__('No Kernel'),
        body: trans.__('Please start a kernel first.'),
        buttons: [Dialog.okButton()]
      });
      return;
    }

    if (value === 'clear-all') {
      saveAcceleratorsToMetadata(notebookPanel, []);
      setActivePluginIds(new Set());

      const result = await showDialog({
        title: trans.__('Accelerators Cleared'),
        body: trans.__(
          'All accelerators have been cleared.\n\nThe kernel will be restarted for changes to take effect.'
        ),
        buttons: [
          Dialog.cancelButton({ label: trans.__('Cancel') }),
          Dialog.warnButton({ label: trans.__('Restart Kernel') })
        ]
      });

      if (result.button.accept) {
        await sessionContext.restartKernel();
      }
      return;
    }

    if (value === 'select-all') {
      const plugins = acceleratorRegistry.getAll();
      const availablePlugins = plugins.filter(
        plugin =>
          acceleratorRegistry.getPluginStatus(plugin.id, systemInfo!).available
      );

      const newActive = new Set(availablePlugins.map(p => p.id));

      // Batch load all extensions in a single code block
      const loadCommands: string[] = [];
      for (const plugin of availablePlugins) {
        if (!activePluginIds.has(plugin.id)) {
          loadCommands.push(plugin.activationCode);
        }
      }

      if (loadCommands.length === 0) {
        return; // All already active
      }

      try {
        const kernel = sessionContext.session.kernel;
        const code = loadCommands.join('\n');

        const executeResult = await kernel.requestExecute({
          code: code,
          silent: false,
          store_history: false
        }).done;

        // If the kernel replied with an error (e.g., non-Python kernel,
        // kernel env missing the package, broken install), do not mark any
        // accelerators as active or persist them to notebook metadata.
        if (executeResult?.content?.status === 'error') {
          const errContent = executeResult.content as {
            ename?: string;
            evalue?: string;
          };
          void showDialog({
            title: trans.__('Failed to enable accelerators'),
            body: trans.__(
              'One or more accelerators failed to activate.\n\n%1: %2',
              errContent.ename || 'Error',
              errContent.evalue || 'Unknown error'
            ),
            buttons: [Dialog.okButton()]
          });
          return;
        }

        setActivePluginIds(newActive);
        saveAcceleratorsToMetadata(notebookPanel, Array.from(newActive));

        const result = await showDialog({
          title: trans.__('All Accelerators Enabled'),
          body: trans.__(
            'All %1 available accelerator(s) have been enabled.\n\nThe kernel will be restarted for changes to take effect.',
            availablePlugins.length
          ),
          buttons: [
            Dialog.cancelButton({ label: trans.__('Cancel') }),
            Dialog.warnButton({ label: trans.__('Restart Kernel') })
          ]
        });

        if (result.button.accept) {
          await sessionContext.restartKernel();
        }
      } catch (error) {
        console.error('Failed to enable all accelerators:', error);
        void showDialog({
          title: trans.__('Error'),
          body: trans.__(
            'Failed to enable all accelerators.\n\nError: %1',
            error
          ),
          buttons: [Dialog.okButton()]
        });
      }
      return;
    }

    const plugin = acceleratorRegistry.get(value);
    if (!plugin) {
      console.error(`Plugin not found: ${value}`);
      return;
    }

    const isActive = activePluginIds.has(value);

    try {
      if (!isActive) {
        // Activate accelerator using %load_ext (proper way per RAPIDS docs)
        const kernel = sessionContext.session.kernel;
        const code = plugin.activationCode;

        const executeResult = await kernel.requestExecute({
          code: code,
          silent: false, // Changed to false so extension loads properly
          store_history: false
        }).done;

        // If the kernel replied with an error (e.g., non-Python kernel,
        // kernel env missing the package, broken install), leave the
        // accelerator inactive and do not persist it to notebook metadata.
        if (executeResult?.content?.status === 'error') {
          const errContent = executeResult.content as {
            ename?: string;
            evalue?: string;
          };
          void showDialog({
            title: trans.__('Failed to activate %1', plugin.name),
            body: trans.__(
              '%1 could not be activated.\n\n%2: %3',
              plugin.name,
              errContent.ename || 'Error',
              errContent.evalue || 'Unknown error'
            ),
            buttons: [Dialog.okButton()]
          });
          return;
        }

        // Update UI state
        const newActive = new Set(activePluginIds);
        newActive.add(value);
        setActivePluginIds(newActive);

        // Save to metadata (for kernel restart within same session)
        saveAcceleratorsToMetadata(notebookPanel, Array.from(newActive));

        const result = await showDialog({
          title: trans.__('%1 Installed', plugin.name),
          body: trans.__(
            '%1 has been installed.\n\nThe kernel will be restarted for changes to take effect.',
            plugin.name
          ),
          buttons: [
            Dialog.cancelButton({ label: trans.__('Cancel') }),
            Dialog.warnButton({ label: trans.__('Restart Kernel') })
          ]
        });

        if (result.button.accept) {
          await sessionContext.restartKernel();
        }
      } else {
        // Deactivate accelerator
        const newActive = new Set(activePluginIds);
        newActive.delete(value);
        setActivePluginIds(newActive);

        // Save to metadata (for kernel restart within same session)
        saveAcceleratorsToMetadata(notebookPanel, Array.from(newActive));

        const result = await showDialog({
          title: trans.__('%1 Removed', plugin.name),
          body: trans.__(
            '%1 has been removed.\n\nThe kernel will be restarted for changes to take effect.',
            plugin.name
          ),
          buttons: [
            Dialog.cancelButton({ label: trans.__('Cancel') }),
            Dialog.warnButton({ label: trans.__('Restart Kernel') })
          ]
        });

        if (result.button.accept) {
          await sessionContext.restartKernel();
        }
      }
    } catch (error) {
      console.error(`Failed to toggle ${plugin.name}:`, error);
      void showDialog({
        title: trans.__('Error'),
        body: trans.__(
          'Failed to %1 %2.\n\nError: %3',
          isActive ? 'deactivate' : 'activate',
          plugin.name,
          error
        ),
        buttons: [Dialog.okButton()]
      });
    }
  };

  // Don't render if no system info yet
  if (isLoading || !systemInfo) {
    return (
      <HTMLSelect
        disabled={true}
        value="-"
        aria-label={trans.__('GPU Accelerators')}
        title={trans.__('Loading GPU accelerators...')}
      >
        <option value="-">{trans.__('Loading...')}</option>
      </HTMLSelect>
    );
  }

  // Don't render if no GPU
  if (!systemInfo.has_gpu) {
    return null;
  }

  const plugins = acceleratorRegistry.getAll();
  const availablePlugins = plugins.filter(
    plugin =>
      acceleratorRegistry.getPluginStatus(plugin.id, systemInfo).available
  );

  const hasAnyAvailable = availablePlugins.length > 0;
  const activeCount = activePluginIds.size;

  // Build the label
  let label = trans.__('GPU Accel');
  if (isReloadingAccelerators) {
    label += ' ⟳';
  } else if (activeCount > 0) {
    label += ` (${activeCount})`;
  }

  // Build tooltip showing active accelerators with their info
  let tooltip = trans.__('Select GPU accelerator to toggle');
  if (isReloadingAccelerators) {
    tooltip = trans.__(
      'Loading accelerators after kernel restart...\n\nPlease wait before running code.'
    );
  } else if (activeCount > 0) {
    const activePlugins = Array.from(activePluginIds)
      .map(id => acceleratorRegistry.get(id))
      .filter((p): p is IAcceleratorPlugin => p !== undefined);

    tooltip = trans.__('Active accelerators:\n');
    activePlugins.forEach(plugin => {
      tooltip += `\n• ${plugin.name}: ${plugin.description}`;
      if (plugin.documentation) {
        tooltip += `\n  ${plugin.documentation}`;
      }
    });
    tooltip += '\n\n' + trans.__('Click to toggle accelerators');
  } else if (!hasAnyAvailable) {
    tooltip = trans.__('No GPU accelerators installed');
  }

  return (
    <HTMLSelect
      className="jp-AcceleratorSelector-dropdown"
      onChange={handleChange}
      value="-"
      aria-label={trans.__('GPU Accelerators')}
      title={tooltip}
      disabled={!hasAnyAvailable || isReloadingAccelerators}
    >
      <option value="-" disabled>
        {label}
      </option>
      {activeCount < availablePlugins.length && availablePlugins.length > 0 && (
        <option value="select-all">{trans.__('Select All')}</option>
      )}
      {activeCount > 0 && (
        <option value="clear-all">{trans.__('Clear All')}</option>
      )}
      {plugins.map(plugin => {
        const status = acceleratorRegistry.getPluginStatus(
          plugin.id,
          systemInfo
        );
        const isActive = activePluginIds.has(plugin.id);
        const checkmark = isActive ? '✓ ' : '';
        const unavailable = !status.available ? ' (not installed)' : '';

        // Build tooltip with description and documentation link
        let tooltip = plugin.description;
        if (plugin.documentation) {
          tooltip += `\n\nDocumentation: ${plugin.documentation}`;
        }
        if (status.version) {
          tooltip += `\n\nInstalled version: ${status.version}`;
        }
        if (!status.available) {
          tooltip += `\n\nInstall with: pip or conda install ${plugin.pythonPackage}`;
        }

        return (
          <option
            key={plugin.id}
            value={plugin.id}
            disabled={!status.available}
            title={tooltip}
          >
            {checkmark}
            {plugin.name}
            {unavailable}
          </option>
        );
      })}
    </HTMLSelect>
  );
};

/**
 * Widget wrapper for the accelerator selector
 */
export class AcceleratorSelectorWidget extends ReactWidget {
  constructor(
    private _sessionContext: ISessionContext,
    private _notebookPanel?: NotebookPanel,
    private _translator?: ITranslator
  ) {
    super();
    this.addClass('jp-AcceleratorSelector');
  }

  render(): JSX.Element {
    return (
      <AcceleratorSelector
        sessionContext={this._sessionContext}
        notebookPanel={this._notebookPanel}
        translator={this._translator}
      />
    );
  }
}
