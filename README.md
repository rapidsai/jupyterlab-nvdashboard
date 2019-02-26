JupyterLab and Bokeh Server
===========================

A JupyterLab extension for displaying the contents of a Bokeh server.

This project serves as an example for how to integrate a Bokeh server
application into JupyterLab.  This makes it easy for Python developers to
develop rich dashboards and integrate them directly into Jupyter environments.

Motivation
----------

We want to give Jupyter users rich and real-time dashboards while they work.
This can be useful for tracking quantities like the following:

-  Computational resources like CPU, Memory, and Network
-  External instruments or detectors
-  Other resources like GPU accelerators
-  Web APIs
-  ...

[JupyterLab](https://jupyterlab.readthedocs.io/en/stable/) extensions provide
a platform for these dashboards, but require some JavaScript expertise.  For
Python-only developers, this requirement may prove to be a bottleneck.
Fortunately the [Bokeh](https://bokeh.pydata.org) plotting library makes it
easy to produce rich and interactive browser-based visuals from Python,
effectivly crossing this boundary.

This repository serves as an example on how to create rich dashboards in Python
with Bokeh and then smoothly integrate those dashboards into JupyterLab for a
first-class dashboarding experience that is accessible to Python-only
developers.


What's here
-----------

This repository contains two sets of code:

-   Python code defining a Bokeh Server application that generates a couple of
    live plots in the `jupyterlab_bokeh_server/` directory
-   TypeScript code integrating these plots into JupyterLab in the `src/`
    directory

You should be able to modify only the Python code to produce a dashboard system
that works well for you without modifying the TypeScript code.

There are also two branches in this repository:

-  **master** contains a basic dashboard with two plots, a line plot and
   a histogram, that display randomly varying data
-  **resouces** expands on the toy system above to create a real-world example
   that uses the `psutil` module to show CPU, memory, network, and storage
   activity.  This example is installable as follows:

   ```
   TODO
   ```

   And is available in a live notebook here: `TODO binder link`

You can view the [difference between these two branches]().
This should give a sense for what you need to do to construct your own
JupyterLab enabled dashboard.


History
-------

This project is a generalization of the approach taken by the
[Dask JupyterLab Extension](https://github.com/dask/dask-labextension) which
integrates a rich dashboard for distributed computing into JupyterLab, which
has demonstrated value for many Dask and Jupyter users in the past.

![](https://github.com/dask/dask-org/raw/master/images/dask-labextension.png)


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

