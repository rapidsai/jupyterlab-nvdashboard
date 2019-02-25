# jupyterlab-bokeh-server

A JupyterLab extension for displaying the contents of a Bokeh server.


## Prerequisites

* JupyterLab 1.0

## Installation

```bash
jupyter labextension install jupyterlab-bokeh-server
```

## Development

For a development install (requires node version 8 or later), do the following in the repository directory:

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

