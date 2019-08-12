import setuptools

setuptools.setup(
    name="jupyterlab-nvdashboard",
    version='0.1.0',
    url="",
    author="NV Dashbaord contributors",
    description="",
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
