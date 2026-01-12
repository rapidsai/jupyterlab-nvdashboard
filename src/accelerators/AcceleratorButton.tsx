/**
 * GPU Accelerator Toolbar Selector Component
 * 
 * A native select dropdown for toggling GPU accelerators (cudf.pandas, cuml.accel, etc.)
 */

import React, { useState, useEffect } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { ISessionContext } from '@jupyterlab/apputils';
import { HTMLSelect } from '@jupyterlab/ui-components';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { acceleratorRegistry } from './registry';
import { IAcceleratorSystemInfo } from './types';

interface IAcceleratorSelectorProps {
  sessionContext: ISessionContext;
  translator?: ITranslator;
}

/**
 * React component for the accelerator selector
 */
const AcceleratorSelector: React.FC<IAcceleratorSelectorProps> = ({
  sessionContext,
  translator
}) => {
  const trans = (translator || nullTranslator).load('jupyterlab');
  const [systemInfo, setSystemInfo] = useState<IAcceleratorSystemInfo | null>(null);
  const [activePluginIds, setActivePluginIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

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

  /**
   * Handle change events for the select dropdown
   */
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = event.target.value;
    
    if (value === '-') {
      return; // Do nothing for the placeholder
    }
    
    if (value === 'clear-all') {
      // Clear all active accelerators
      setActivePluginIds(new Set());
      console.log('Cleared all accelerators');
      // Phase 2: Execute kernel commands to unload extensions
      return;
    }
    
    // Toggle the selected accelerator
    const newActive = new Set(activePluginIds);
    if (newActive.has(value)) {
      newActive.delete(value);
      console.log('Deactivated:', value);
    } else {
      newActive.add(value);
      console.log('Activated:', value);
    }
    setActivePluginIds(newActive);
    
    // Phase 2: Execute kernel commands to load/unload extensions
    const plugin = acceleratorRegistry.get(value);
    if (plugin) {
      console.log(`Would execute: %load_ext ${plugin.extensionName}`);
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
  if (activeCount > 0) {
    label += ` (${activeCount})`;
  }

  // Build tooltip showing active accelerators with their info
  let tooltip = trans.__('Select GPU accelerator to toggle');
  if (activeCount > 0) {
    const activePlugins = Array.from(activePluginIds)
      .map(id => acceleratorRegistry.get(id))
      .filter(p => p !== undefined);
    
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
      disabled={!hasAnyAvailable}
    >
      <option value="-">{label}</option>
      {activeCount > 0 && (
        <option value="clear-all">{trans.__('✓ Clear All')}</option>
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
    private _translator?: ITranslator
  ) {
    super();
    this.addClass('jp-AcceleratorSelector');
  }

  render(): JSX.Element {
    return (
      <AcceleratorSelector 
        sessionContext={this._sessionContext}
        translator={this._translator}
      />
    );
  }
}
