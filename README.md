JupyterLab GPU Dashboards
===========================

A JupyterLab extension for displaying dashboards of GPU usage.

![demo](./demo.gif)

Built with [JupyterLab and Bokeh Server](https://github.com/ian-r-rose/jupyterlab-bokeh-server)


What's here
-----------

This repository contains two sets of code:

-   Python code defining a Bokeh Server application that generates the dashboards
    in the `jupyterlab_nvdashboard/` directory
-   TypeScript code integrating these dashboards into JupyterLab in the `src/`
    directory

You should be able to modify only the Python code to edit the dashboards
without modifying the TypeScript code.

## Prerequisites

* JupyterLab 1.0
* bokeh
* pynvml

## Installation

This extension has a server-side (Python) and a client-side (Typescript) component,
and we must install both in order for it to work.

To install the server-side component, run the following in your terminal

```bash
pip install jupyterlab-nvdashboard
```

To install the client-side component, run

```bash
jupyter labextension install jupyterlab-nvdashboard
```

## Development

To install the server-side part, run the following in your terminal from the repository directory:

```bash
pip install -e .
```

In order to install the client-side component (requires node version 8 or later), run the following in the repository directory:

```bash
jlpm install
jlpm run build
jupyter labextension install .
```

To rebuild the package and the JupyterLab app:

```bash
jlpm run build
jupyter lab build
```

## Publishing

In order to distribute your bokeh dashboard application,
you must publish the two subpackages.
The JupyterLab frontend part should be published to [npm](https://npmjs.org),
and the server-side part to [PyPI](https://pypi.org)
or [conda-forge](https://conda-forge.org) (or both).

Instructions for publishing the JupyterLab extension can be found
[here](https://jupyterlab.readthedocs.io/en/stable/developer/xkcd_extension_tutorial.html#publish-your-extension-to-npmjs-org).
A nice write-up for how to publish a package to PyPI can be found in the
[nbconvert documentation](https://nbconvert.readthedocs.io/en/latest/development_release.html).
