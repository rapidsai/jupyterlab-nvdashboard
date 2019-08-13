import setuptools
import json


from os import path
this_directory = path.abspath(path.dirname(__file__))

# read the contents of README file
with open(path.join(this_directory, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

# get version from package.json (to avoid duplicating)
with open(path.join(this_directory, 'package.json'), encoding='utf-8') as f:
    version = json.load(f)['version']


setuptools.setup(
    name="jupyterlab-nvdashboard",
    version=version,
    url="https://github.com/jacobtomlinson/jupyterlab-nvdashboard",
    author="NV Dashbaord contributors",
    description="A JupyterLab extension for displaying dashboards of GPU usage.",
    long_description=long_description,
    long_description_content_type='text/markdown',
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
