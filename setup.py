import setuptools

setuptools.setup(
    name="jupyterlab-bokeh-server",
    version='1.0dev',
    url="https://github.com/ian-r-rose/jupyterlab-bokeh-server",
    author="Matt Rocklin and Ian Rose",
    description="projectjupyter@gmail.com",
    packages=setuptools.find_packages(),
	keywords=['Jupyter'],
	classifiers=['Framework :: Jupyter'],
    install_requires=[
        'jupyter-server-proxy'
    ],
    entry_points={
        'jupyter_serverproxy_servers': [
            'bokeh-dashboard = jupyterlab_bokeh_server:launch_server',
        ]
    },
    package_data={
        'jupyterlab_bokeh_server': ['icons/*'],
    },
)
