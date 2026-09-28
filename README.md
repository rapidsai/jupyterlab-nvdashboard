# JupyterLab NVdashboard

NVDashboard is a JupyterLab extension for displaying GPU usage dashboards. It enables JupyterLab users to visualize system hardware metrics within the same interactive environment they use for development. Supported metrics include:

- GPU-compute utilization
- GPU-memory consumption
- PCIe throughput
- NVLink throughput

## Demo

![JupyterLab-nvdashboard Demo](https://raw.githubusercontent.com/rapidsai/jupyterlab-nvdashboard/HEAD/docs/_images/screencast1.gif)

## Table of Contents

- [JupyterLab NVdashboard](#jupyterlab-nvdashboard)
  - [Demo](#demo)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
    - [Brush for Time Series Charts](#brush-for-time-series-charts)
    - [Synced Tooltips](#synced-tooltips)
    - [Theme Compatibility](#theme-compatibility)
      - [Light Theme](#light-theme)
      - [Dark Theme](#dark-theme)
    - [GPU Accelerators](#gpu-accelerators)
  - [Version Compatibility](#version-compatibility)
  - [Installation](#installation)
    - [Conda](#conda)
    - [PyPI](#pypi)
  - [Troubleshoot](#troubleshoot)
  - [Contributing Developers Guide](#contributing-developers-guide)

## Features

JupyterLab-nvdashboard provides tools for exploring GPU metrics in your notebook, from inspecting chart history to enabling GPU accelerators.

### Brush for Time Series Charts

Use brushing to select a time range on time series charts and inspect past activity in more detail.

![JupyterLab-nvdashboard Demo1](https://raw.githubusercontent.com/rapidsai/jupyterlab-nvdashboard/HEAD/docs/_images/screencast2.gif)

### Synced Tooltips

On pages with multiple charts, tooltips align at the same timestamp so you can compare metrics at a given moment.

![JupyterLab-nvdashboard Demo4](https://raw.githubusercontent.com/rapidsai/jupyterlab-nvdashboard/HEAD/docs/_images/screenshot3.png)

### Theme Compatibility

The dashboard follows JupyterLab's light and dark themes, keeping its charts readable in either theme.

#### Light Theme

![JupyterLab-nvdashboard Demo3](https://raw.githubusercontent.com/rapidsai/jupyterlab-nvdashboard/HEAD/docs/_images/screenshot2.png)

#### Dark Theme

![JupyterLab-nvdashboard Demo2](https://raw.githubusercontent.com/rapidsai/jupyterlab-nvdashboard/HEAD/docs/_images/screenshot1.png)

### GPU Accelerators

A GPU accelerator activator button that lets you enable GPU-backed execution with **zero code changes**. When active, your existing `pandas` code runs on the GPU via [cuDF pandas](https://docs.nvidia.com/cudf/latest/cudf_pandas/), and/or your scikit-learn, umap, or hdbscan code runs on the GPU via [cuML accel](https://docs.nvidia.com/cuml/latest/cuml-accel/). Accelerators are shown only when the corresponding dependencies are installed in the notebook's environment: `cuDF` for `pandas` acceleration and `cuML` for `scikit-learn` acceleration.

In the animation, the first `pandas` run uses the CPU: note its execution time and the lack of activity in the GPU dashboard. After turning on **cuDF pandas**, the next run shows GPU activity in the dashboard and completes faster:

![Selecting cuDF pandas from the GPU Accel menu](https://raw.githubusercontent.com/rapidsai/jupyterlab-nvdashboard/HEAD/docs/_images/gpu_toggle_cudfpd.gif)

For a closer look at the controls:

1. Open **GPU Accel** in the notebook toolbar.

   ![GPU Accel menu in the notebook toolbar](https://raw.githubusercontent.com/rapidsai/jupyterlab-nvdashboard/HEAD/docs/_images/gpu_toggle.png)

2. Select **cuDF pandas** or **cuML Accelerator**. Choose **Select All** to enable every available accelerator.

   ![GPU Accel menu with cuDF pandas highlighted](https://raw.githubusercontent.com/rapidsai/jupyterlab-nvdashboard/HEAD/docs/_images/cudf_toggle.png)

3. A check mark shows which accelerator is active, and the number beside **GPU Accel** shows how many are selected. Select a checked accelerator to turn it off, or choose **Clear All** to disable all accelerators. Restart the kernel when prompted so the change takes effect.

   ![GPU Accel menu showing cuDF pandas selected](https://raw.githubusercontent.com/rapidsai/jupyterlab-nvdashboard/HEAD/docs/_images/cudf_pandas_selected.png)

To accelerate scikit-learn, UMAP, or HDBSCAN code, turn on **cuML Accelerator** in the **GPU Accel** menu.

## Version Compatibility

JupyterLab-nvdashboard v4 is designed exclusively for JupyterLab v4 and later versions.

## Installation

### Conda

Releases of the `conda` packages are first published to the `rapidsai` channel,
then generally land on `conda-forge` shortly after.

```bash
# nightly version
conda install -c rapidsai-nightly -c conda-forge jupyterlab-nvdashboard

# stable version
conda install -c rapidsai -c conda-forge jupyterlab-nvdashboard

# stable version (conda-forge only)
conda install -c conda-forge jupyterlab-nvdashboard
```

### PyPI

```bash
# nightly version
pip install --extra-index-url https://pypi.anaconda.org/rapidsai-wheels-nightly/simple 'jupyterlab-nvdashboard>=0.14.0a0'

# stable version
pip install jupyterlab-nvdashboard
```

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```

## Contributing Developers Guide

For more details, check out the [contributing guide](./CONTRIBUTING.md).
