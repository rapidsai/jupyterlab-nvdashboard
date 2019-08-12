import setuptools

setuptools.setup(
    name="jupyterlab-nvdashboard",
    version='0.1.0',
    url="https://github.com/jacobtomlinson/jupyterlab-nvdashboard",
    author="NV Dashbaord contributors",
    description="A JupyterLab extension for displaying dashboards of GPU usage.",
    packages=setuptools.find_packages(),
        keywords=['Jupyter'],
        classifiers=['Framework :: Jupyter'],
    install_requires=list(open("requirements.txt").read().strip().split("\n")),
    entry_points={
        'jupyter_serverproxy_servers': [
            'nvdashboard = jupyterlab_nvdashboard:launch_server',
        ]
    },
    package_data={
        'jupyterlab_nvdashboard': ['icons/*'],
    },
)
