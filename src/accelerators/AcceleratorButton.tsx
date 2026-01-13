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
  if (!model) return [];
  
  const saved = model.getMetadata('gpu_accelerators');
  console.log('[GetMetadata] Raw value:', saved);
  return (Array.isArray(saved) ? saved : []) as string[];
}

/**
 * Helper to safely save accelerators to notebook metadata
 */
function saveAcceleratorsToMetadata(notebookPanel: NotebookPanel | undefined, accelerators: string[]): void {
  const model = notebookPanel?.model;
  if (!model) return;
  
  console.log('[SaveMetadata] Saving:', accelerators);
  if (accelerators.length > 0) {
    model.setMetadata('gpu_accelerators', accelerators);
  } else {
    model.setMetadata('gpu_accelerators', undefined);
  }
}

/**
 * React component for the accelerator selector
 */
const AcceleratorSelector: React.FC<IAcceleratorSelectorProps> = ({
  sessionContext,
  notebookPanel,
  translator
}) => {
  const trans = (translator || nullTranslator).load('jupyterlab');
  const [systemInfo, setSystemInfo] = useState<IAcceleratorSystemInfo | null>(null);
  const [activePluginIds, setActivePluginIds] = useState<Set<string>>(new Set());
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
      console.log('[Init] Clearing accelerator metadata from previous session');
      saveAcceleratorsToMetadata(notebookPanel, []);
      setActivePluginIds(new Set());
      hasInitialized.current = true;
    }
  }, [notebookPanel?.model]);

  // Auto-load saved accelerators when kernel starts or restarts
  useEffect(() => {
    if (!sessionContext.session?.kernel || !notebookPanel?.model) {
      return;
    }
    
    const kernel = sessionContext.session.kernel;
    let needsReload = true; // Flag to reload only once per kernel session
    
    const loadSavedAccelerators = async () => {
      if (!needsReload) return;
      
      const currentKernel = sessionContext.session?.kernel;
      if (!currentKernel || currentKernel.status !== 'idle') return;
      
      needsReload = false; // Mark as loaded
      
      const savedAccelerators = getAcceleratorsFromMetadata(notebookPanel);
      console.log('[AutoLoad] Saved accelerators from metadata:', savedAccelerators);
      if (savedAccelerators.length === 0) {
        setActivePluginIds(new Set());
        setIsReloadingAccelerators(false);
        return;
      }
      
      // Show loading indicator
      setIsReloadingAccelerators(true);
      
      // Re-install each saved accelerator
      // Use %load_ext for all accelerators (RAPIDS docs say this is the correct way)
      for (const pluginId of savedAccelerators) {
        const plugin = acceleratorRegistry.get(pluginId);
        if (!plugin) {
          console.warn(`[AutoLoad] Plugin not found: ${pluginId}`);
          continue;
        }
        
        const code = `%load_ext ${plugin.extensionName}`;
        console.log(`[AutoLoad] Executing: ${code}`);
        
        try {
          const result = await currentKernel.requestExecute({
            code: code,
            silent: false,  // Changed to false so extension loads properly
            store_history: false
          }).done;
          console.log(`[AutoLoad] Successfully loaded ${plugin.name}`, result);
        } catch (error) {
          console.error(`[AutoLoad] Failed to restore ${plugin.name}:`, error);
        }
      }
      
      console.log('[AutoLoad] Setting active plugins to:', savedAccelerators);
      setActivePluginIds(new Set(savedAccelerators));
      setIsReloadingAccelerators(false);
      console.log(`[AutoLoad] ✓ Reloaded ${savedAccelerators.length} accelerator(s) after kernel restart`);
    };
    
    const statusHandler = () => {
      const status = sessionContext.session?.kernel?.status;
      
      // When kernel restarts, mark that we need to reload
      if (status === 'restarting' || status === 'starting') {
        needsReload = true;
        const savedAccelerators = getAcceleratorsFromMetadata(notebookPanel);
        if (savedAccelerators.length > 0) {
          setIsReloadingAccelerators(true);
        }
      }
      
      // When kernel becomes idle, try to load (will only happen once per restart)
      if (status === 'idle' && needsReload) {
        setTimeout(loadSavedAccelerators, 500);
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
  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
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
      
      void showDialog({
        title: trans.__('Accelerators Cleared'),
        body: trans.__('All accelerators have been cleared.\n\nPlease restart the kernel manually for changes to take effect.'),
        buttons: [Dialog.okButton({ label: trans.__('OK') })]
      });
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
        const code = `%load_ext ${plugin.extensionName}`;
        
        console.log('[Activate] Installing:', plugin.name);
        await kernel.requestExecute({
          code: code,
          silent: false,  // Changed to false so extension loads properly
          store_history: false
        }).done;
        
        // Update UI state
        const newActive = new Set(activePluginIds);
        newActive.add(value);
        console.log('[Activate] Setting active plugins to:', Array.from(newActive));
        setActivePluginIds(newActive);
        
        // Save to metadata (for kernel restart within same session)
        saveAcceleratorsToMetadata(notebookPanel, Array.from(newActive));
        
        void showDialog({
          title: trans.__(`${plugin.name} Installed`),
          body: trans.__(
            `${plugin.name} has been installed.\n\n` +
            `Please restart the kernel manually for changes to take effect.`
          ),
          buttons: [Dialog.okButton({ label: trans.__('OK') })]
        });
        
      } else {
        // Deactivate accelerator
        const newActive = new Set(activePluginIds);
        newActive.delete(value);
        console.log('[Deactivate] Setting active plugins to:', Array.from(newActive));
        setActivePluginIds(newActive);
        
        // Save to metadata (for kernel restart within same session)
        saveAcceleratorsToMetadata(notebookPanel, Array.from(newActive));
        
        void showDialog({
          title: trans.__(`${plugin.name} Removed`),
          body: trans.__(
            `${plugin.name} has been removed.\n\n` +
            `Please restart the kernel manually for changes to take effect.`
          ),
          buttons: [Dialog.okButton({ label: trans.__('OK') })]
        });
      }
    } catch (error) {
      console.error(`Failed to toggle ${plugin.name}:`, error);
      void showDialog({
        title: trans.__('Error'),
        body: trans.__(`Failed to ${isActive ? 'deactivate' : 'activate'} ${plugin.name}.\n\nError: ${error}`),
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
    plugin => acceleratorRegistry.getPluginStatus(plugin.id, systemInfo).available
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
    tooltip = trans.__('Loading accelerators after kernel restart...\n\nPlease wait before running code.');
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
      <option value="-">{label}</option>
      {activeCount > 0 && (
        <option value="clear-all">{trans.__('Clear All')}</option>
      )}
      {plugins.map(plugin => {
        const status = acceleratorRegistry.getPluginStatus(plugin.id, systemInfo);
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
            {checkmark}{plugin.name}{unavailable}
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
