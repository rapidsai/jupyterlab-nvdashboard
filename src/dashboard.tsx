import { IFrame, MainAreaWidget } from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

import { JSONExt, JSONObject } from '@lumino/coreutils';

import { Message } from '@lumino/messaging';

import { Widget, PanelLayout } from '@lumino/widgets';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

/**
 * A class for hosting a Bokeh dashboard in an iframe.
 */
export class BokehDashboard extends MainAreaWidget<IFrame> {
  /**
   * Construct a new dashboard widget.
   */
  constructor() {
    super({
      content: new IFrame({ sandbox: ['allow-scripts', 'allow-same-origin'] })
    });
    this._inactivePanel = Private.createInactivePanel();
    this.content.node.appendChild(this._inactivePanel);
    this.update();
  }

  /**
   * The current dashboard item for the widget.
   */
  get item(): IDashboardItem | null {
    return this._item;
  }
  set item(value: IDashboardItem | null) {
    if (JSONExt.deepEqual(value, this._item)) {
      return;
    }
    this._item = value;
    this.update();
  }

  /**
   * Handle an update request to the dashboard panel.
   */
  protected onUpdateRequest(): void {
    // If there is nothing to show, empty the iframe URL and
    // show the inactive panel.
    if (!this.item) {
      this.content.url = '';
      this._inactivePanel.style.display = '';
      return;
    }
    // Make sure the inactive panel is hidden
    this._inactivePanel.style.display = 'none';
    this.content.url = URLExt.join(
      ServerConnection.makeSettings({}).baseUrl,
      '/nvdashboard',
      this.item.route
    );
  }

  private _item: IDashboardItem | null = null;
  private _inactivePanel: HTMLElement;
}

/**
 * A widget for hosting Bokeh dashboard launchers.
 */
export class BokehDashboardLauncher extends Widget {
  /**
   * Create a new Bokeh sidebar.
   */
  constructor(options: BokehDashboardLauncher.IOptions) {
    super();
    const layout = (this.layout = new PanelLayout());
    this._dashboard = new Widget();
    const header = new Widget();
    header.node.textContent = 'GPU Dashboards';
    header.addClass('bokeh-BokehDashboardLauncher-header');
    layout.addWidget(header);
    layout.addWidget(this._dashboard);
    this.addClass('bokeh-BokehDashboardLauncher');
    this._launchItem = options.launchItem;
    this._connection = ServerConnection.makeSettings({});
    ServerConnection.makeRequest(
      URLExt.join(this._connection.baseUrl, '/nvdashboard/index.json'),
      {},
      this._connection
    ).then(response => {
      response.json().then((data: { [x: string]: string }) => {
        this._items = [];
        Object.keys(data).forEach(route => {
          this._items.push({ label: data[route], route });
        });
        this.update();
      });
    });
  }

  /**
   * The list of dashboard items which can be launched.
   */
  get items(): IDashboardItem[] {
    return this._items;
  }

  /**
   * Handle an update request.
   */
  protected onUpdateRequest(msg: Message): void {
    // Don't bother if the sidebar is not visible
    if (!this.isVisible) {
      return;
    }

    ReactDOM.render(
      <DashboardListing launchItem={this._launchItem} items={this._items} />,
      this._dashboard.node
    );
  }

  /**
   * Rerender after showing.
   */
  protected onAfterShow(msg: Message): void {
    this.update();
  }

  private _dashboard: Widget;
  private _launchItem: (item: IDashboardItem) => void;
  private _items: IDashboardItem[] = [];
  private _connection: ServerConnection.ISettings;
}

/**
 * A namespace for BokehDashboardLauncher statics.
 */
export namespace BokehDashboardLauncher {
  /**
   * Options for the constructor.
   */
  export interface IOptions {
    /**
     * A function that attempts to find a link to
     * a bokeh bokeh server in the current application
     * context.
     */
    linkFinder?: () => Promise<string>;

    /**
     * A callback to launch a dashboard item.
     */
    launchItem: (item: IDashboardItem) => void;

    /**
     * A list of items for the launcher.
     */
    items?: IDashboardItem[];
  }
}

/**
 * A React component for a launcher button listing.
 */
function DashboardListing(props: IDashboardListingProps) {
  const listing = props.items.map(item => {
    return (
      <li className="nvdashboardListing-item" key={item.route}>
        <button
          className="jp-mod-styled jp-mod-accept"
          value={item.label}
          onClick={() => props.launchItem(item)}
        >
          {item.label}
        </button>
      </li>
    );
  });

  // Return the JSX component.
  return (
    <div>
      <ul className="nvdashboardListing-list">{listing}</ul>
    </div>
  );
}

/**
 * Props for the dashboard listing component.
 */
export interface IDashboardListingProps {
  /**
   * A list of dashboard items to render.
   */
  items: IDashboardItem[];

  /**
   * A callback to launch a dashboard item.
   */
  launchItem: (item: IDashboardItem) => void;
}

/**
 * An interface dashboard launcher item.
 */
export interface IDashboardItem extends JSONObject {
  /**
   * The route to add the the base url.
   */
  route: string;

  /**
   * The display label for the item.
   */
  label: string;
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  export function createInactivePanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'bokeh-BokehDashboard-inactive';
    return panel;
  }
}
