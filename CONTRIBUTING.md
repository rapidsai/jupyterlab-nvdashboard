# JupyterLab NVdashboard Developer Guide

This guide provides information on how to contribute to the JupyterLab v4 extension jupyterlab-nvdashboard. The project has two main components: a front-end React widget and a back-end Tornado server.

## Development install

> You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
git clone https://github.com/rapidsai/jupyterlab-nvdashboard.git
# Change directory to the jupyterlab_nvdashboard directory
cd jupyterlab-nvdashboard
# Install package in development mode
pip install -e .
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm run build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm run build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

## Linting

Run static analysis / linting via `pre-commit`

```shell
pre-commit run --all-files
```

## Automated Dependency Updates

Bots like `dependabot` may be used to update dependencies automatically.

These may modify `package.json` and `yarn.lock` but leave them in a state that's failing some other CI checks.

To resolve that:

1. pull the branch created by the bot
2. run `pre-commit run --all-files` locally
3. commit and push the changes

## Releasing

Releases are published automatically to the `rapidsai` conda channel and to `pypi.org` by CI workflows.

To cut a new release:

1. push a tag matching the pattern `v[0-9]+.[0-9]+.[0-9]+` (e.g. `v0.14.0`) to the commit you want to release
2. watch for a CI job at https://github.com/rapidsai/jupyterlab-nvdashboard/actions/workflows/build.yaml (triggered by that tag) to complete, confirm that it pushed to all the expected places
3. open a PR updating the version in `package.json` to the likely next version (e.g. `0.15.0`)
4. merge that PR
5. tag the resulting commit on `main` like this:

```shell
git checkout main
TAG="$(jq -r '."version"' < ./package.json)a"
git tag "${TAG}"
git push upstream "${TAG}"
```

## Contributions

### Front-End

To contribute to the front-end of the extension, edit the files in the `src/` directory.

```pre
├── src
│ ├── accelerators
│ │   ├── AcceleratorButton.tsx
│ │   ├── registry.ts
│ │   ├── types.ts
│ │   ├── __tests__
│ │   │   ├── AcceleratorButton.test.tsx
│ │   │   ├── registry.test.ts
│ │   │   └── setup.ts
│ │   └── plugins
│ │       ├── index.ts
│ │       ├── cudfpandas.ts
│ │       └── cumlaccel.ts
│ ├── assets
│ │ ├── constants.ts
│ │ └── icons.ts
│ ├── charts
│ │ ├── GpuMemoryChart.tsx
│ │ ├── GpuResourceChart.tsx
│ │ ├── GpuUtilizationChart.tsx
│ │ ├── index.ts
│ │ ├── MachineResourceChart.tsx
│ │ ├── NvLinkThroughputChart.tsx
│ │ ├── NvLinkTimelineChart.tsx
│ │ └── PciThroughputChart.tsx
│ ├── components
│ │ ├── customLineChart.tsx
│ │ ├── formatUtils.tsx
│ │ └── tooltipUtils.tsx
│ ├── handler.ts
│ ├── index.ts
│ ├── launchWidget.tsx
│ └── svg.d.ts
├── style
 └── base.css

```

The main React widget is located in the `src/index.ts` file.

#### `index.ts`

This file initializes the JupyterLab extension. It sets up the necessary components, such as the ControlWidget and the associated commands.

#### `launchWidget.tsx`

This file contains the ControlWidget class, which serves as the control component for the GPU Dashboard. It includes buttons to open various GPU widgets.

#### `ControlWidget.tsx`

This file defines the Control component, which contains buttons to open different GPU widgets. It also includes functions to handle widget creation and restoration.

#### `src/charts Directory`

The src/charts directory contains React components responsible for rendering various GPU-related charts. Each chart component focuses on a specific aspect of GPU statistics, and they are integrated into the JupyterLab environment via the main ControlWidget.

#### `src/accelerators` (GPU Accelerator Button & Plugins)

The accelerator system provides a toolbar dropdown to enable GPU accelerators (e.g. cuDF pandas, cuML accel) in the current notebook. It includes a plugin registry and backend API for availability checks.

 **To add a new accelerator:**

1. Create a plugin in `src/accelerators/plugins/`.
2. Export it from `plugins/index.ts` and register it in `registry.ts`.
3. Add an availability checker in `jupyterlab_nvdashboard/accelerator_checker.py` and include it in `check_all_accelerators()`.
4. Build and verify your changes (see [Testing](#testing) below).

#### `src/charts` Directory

Each chart contains:

- Data Fetching: Each chart component fetches data from the server using the requestAPI function.

- Real-time Updates: Some charts use a setInterval to continuously fetch and update data, providing a real-time view of the GPU metrics.

- Recharts Library: The charts are implemented using the Recharts library, a React charting library that simplifies the process of creating interactive charts.

#### Add an example new chart:

```typescript

import React, { useEffect, useState } from 'react';
import { requestAPI } from '../handler';
import { ReactWidget } from '@jupyterlab/ui-components';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const NewChart = (): JSX.Element => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => setChartData((await requestAPI<any>('new_chart_endpoint')).data);
    fetchData();
  }, []);

  return (
    <div>
      <strong className="chart-title">New Chart Title</strong>
      <LineChart width={400} height={300} data={chartData}>
        <CartesianGrid stroke="#ccc" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </div>
  );
};

export class NewChartWidget extends ReactWidget {
  render = (): JSX.Element => <NewChart />;
}
```

### Backend (Server) Part

The server part of the extension is going to be presented in this section.

JupyterLab server is built on top of the Tornado Python package. To extend the server, your extension needs to be defined as a proper Python package with some hook functions:

The directory `/jupyterlab-nvdashboard` contains server-side code, including handlers declared in `/jupyterlab-nvdashboard/apps/*`.

#### Adding a New Server-Side Endpoint

Example: Adding a GPU Resource Endpoint

1. Modify `jupyterlab-nvdashboard/handlers.py`:

```python

from jupyter_server.utils import url_path_join
from . import apps

URL_PATH = "nvdashboard"

base_url = web_app.settings["base_url"]

# Add a new route for CPU resource
route_pattern_cpu_resource = url_path_join(
    base_url, URL_PATH, "gpu_resource"
)

# Update handlers list
handlers += [
    (route_pattern_cpu_resource, apps.cpu.CPUResourceHandler),
]
```

2. Create the GPU Resource Handler in `jupyterlab-nvdashboard/apps/gpu.py`:

```python
from jupyter_server.base.handlers import APIHandler
import json

class GPUResourceHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        # Implement GPU resource logic here
        cpu_info = {"gpu_utilization": 70, "gpu_memory_usage": 512}
        self.finish(json.dumps(cpu_info))

```

3. Build and verify your changes (see [Testing](#testing) below), and confirm the new endpoint is accessible (e.g. http://localhost:8888/nvdashboard/gpu_resource).

## Testing

The project uses automated tests for both the backend and the frontend. Run them from the repository root.

### Backend

Backend tests use **pytest**. They live in `jupyterlab_nvdashboard/tests/` and cover server-side logic such as HTTP handlers and package/availability checks. Shared fixtures (e.g. for handlers) are in `conftest.py`. Run all backend tests with:

```bash
python -m pytest jupyterlab_nvdashboard/tests/ -v
```

You can restrict by path or pattern (e.g. `test_accelerator_*.py`) or use standard pytest options (`-x`, `-k EXPR`, etc.).

- Launch JupyterLab and check if the new endpoint is accessible (e.g., http://localhost:8888/nvdashboard/gpu_resource).

### Frontend
Frontend tests use **Jest** with React Testing Library and run in jsdom. They live under `src/` in `__tests__` directories (e.g. `src/accelerators/__tests__/`). Run all frontend tests with:

```bash
jlpm test
```

To run only a subset, pass a path (e.g. `jlpm test src/accelerators/__tests__`). Use `jlpm test --watch` to re-run on file changes.


## Conclusion

This guide has provided a brief overview of how to contribute to the JupyterLab v4 extension jupyterlab-nvdashboard. For more information on developing JupyterLab extensions, please see the following resources:

- Develop JupyterLab Extensions: https://jupyterlab.readthedocs.io/en/stable/extension/extension_dev.html
- Front-End React Widgets: https://jupyterlab.readthedocs.io/en/stable/extension/virtualdom.html
- Back-End Server Extensions: https://github.com/jupyterlab/extension-examples/tree/main/server-extension
