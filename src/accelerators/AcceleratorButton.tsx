/**
 * GPU Accelerator Toolbar Button Component
 * 
 * A split button for the notebook toolbar that allows users to
 * select and activate GPU accelerators (cudf.pandas, cuml.accel, etc.)
 */

import React, { useState, useEffect } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { ISessionContext } from '@jupyterlab/apputils';
import { acceleratorRegistry } from './registry';
import { IAcceleratorSystemInfo, IAcceleratorPlugin } from './types';

interface IAcceleratorButtonProps {
  sessionContext: ISessionContext;
}

/**
 * React component for the accelerator button
 */
const AcceleratorButton: React.FC<IAcceleratorButtonProps> = ({
  sessionContext
}) => {
  const [systemInfo, setSystemInfo] = useState<IAcceleratorSystemInfo | null>(
    null
  );
  const [selectedPluginIds, setSelectedPluginIds] = useState<Set<string>>(
    new Set()
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check system capabilities on mount
  useEffect(() => {
    const checkSystem = async () => {
      setIsLoading(true);
      const info = await acceleratorRegistry.checkAvailability();
      setSystemInfo(info);
      setIsLoading(false);
      console.log('Accelerator system info:', info);
    };
    checkSystem();
  }, []);

  // Handle checkbox toggle
  const handleTogglePlugin = (pluginId: string) => {
    const newSelected = new Set(selectedPluginIds);
    if (newSelected.has(pluginId)) {
      newSelected.delete(pluginId);
    } else {
      newSelected.add(pluginId);
    }
    setSelectedPluginIds(newSelected);
  };

  // Handle Apply button click (stub for Phase 1)
  const handleApply = () => {
    const selectedPlugins = Array.from(selectedPluginIds)
      .map(id => acceleratorRegistry.get(id))
      .filter((p): p is IAcceleratorPlugin => p !== undefined);

    console.log('Apply clicked! Selected accelerators:', selectedPlugins);
    console.log(
      'Extension commands to load:',
      selectedPlugins.map(p => `%load_ext ${p.extensionName}`)
    );

    // Phase 2 will implement:
    // - Execute %load_ext commands in kernel
    // - Show restart dialog
    // - Update button state

    setIsMenuOpen(false);
  };

  // Don't render if no system info yet
  if (isLoading || !systemInfo) {
    return (
      <div className="jp-AcceleratorButton-container">
        <button
          className="jp-AcceleratorButton jp-mod-disabled"
          disabled={true}
        >
          <span className="jp-AcceleratorButton-icon">🚀</span>
          <span className="jp-AcceleratorButton-label">Loading...</span>
        </button>
      </div>
    );
  }

  // Don't render if no GPU
  if (!systemInfo.has_gpu) {
    return null; // Button not visible when no GPU
  }

  const plugins = acceleratorRegistry.getAll();
  const availablePlugins = plugins.filter(
    plugin =>
      acceleratorRegistry.getPluginStatus(plugin.id, systemInfo).available
  );

  const hasAnyAvailable = availablePlugins.length > 0;
  const activeCount = selectedPluginIds.size;

  return (
    <div className="jp-AcceleratorButton-container">
      {/* Main button */}
      <button
        className={`jp-AcceleratorButton ${!hasAnyAvailable ? 'jp-mod-disabled' : ''} ${activeCount > 0 ? 'jp-mod-active' : ''}`}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        disabled={!hasAnyAvailable}
        title={
          hasAnyAvailable
            ? `GPU Accelerators (${activeCount} selected)`
            : 'No GPU accelerators installed'
        }
      >
        <span className="jp-AcceleratorButton-icon">🚀</span>
        <span className="jp-AcceleratorButton-label">
          GPU Accel
          {activeCount > 0 && ` (${activeCount})`}
        </span>
        <span className="jp-AcceleratorButton-dropdown">▼</span>
      </button>

      {/* Dropdown menu */}
      {isMenuOpen && (
        <div className="jp-AcceleratorButton-menu">
          <div className="jp-AcceleratorButton-menu-header">
            Select GPU Accelerators
          </div>

          {!hasAnyAvailable ? (
            // No accelerators available message
            <div className="jp-AcceleratorButton-menu-empty">
              <p>No GPU accelerators installed.</p>
              <p className="jp-AcceleratorButton-menu-hint">
                Install <code>cudf</code> for pandas acceleration or{' '}
                <code>cuml</code> for ML acceleration.
              </p>
            </div>
          ) : (
            // List of available accelerators
            <>
              <div className="jp-AcceleratorButton-menu-items">
                {plugins.map(plugin => {
                  const status = acceleratorRegistry.getPluginStatus(
                    plugin.id,
                    systemInfo
                  );
                  const isSelected = selectedPluginIds.has(plugin.id);

                  return (
                    <div
                      key={plugin.id}
                      className={`jp-AcceleratorButton-menu-item ${!status.available ? 'jp-mod-disabled' : ''}`}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!status.available}
                          onChange={() => handleTogglePlugin(plugin.id)}
                        />
                        <div className="jp-AcceleratorButton-menu-item-info">
                          <div className="jp-AcceleratorButton-menu-item-name">
                            {plugin.name}
                          </div>
                          <div className="jp-AcceleratorButton-menu-item-desc">
                            {plugin.description}
                          </div>
                          {!status.available && (
                            <div className="jp-AcceleratorButton-menu-item-unavailable">
                              Not installed: <code>{plugin.pythonPackage}</code>
                            </div>
                          )}
                          {status.available && status.version && (
                            <div className="jp-AcceleratorButton-menu-item-version">
                              v{status.version}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="jp-AcceleratorButton-menu-footer">
                <button
                  className="jp-AcceleratorButton-menu-button-cancel"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="jp-AcceleratorButton-menu-button-apply"
                  onClick={handleApply}
                  disabled={selectedPluginIds.size === 0}
                >
                  Apply (Phase 2: will load extensions)
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Widget wrapper for the accelerator button
 */
export class AcceleratorButtonWidget extends ReactWidget {
  constructor(private _sessionContext: ISessionContext) {
    super();
    this.addClass('jp-AcceleratorButton-widget');
  }

  render(): JSX.Element {
    return <AcceleratorButton sessionContext={this._sessionContext} />;
  }
}
