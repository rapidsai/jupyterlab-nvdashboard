"""
jupyterlab_nvdashboard setup
"""
import json
import os

from jupyter_packaging import (
    create_cmdclass, install_npm, ensure_targets,
    combine_commands, skip_if_exists
)
import setuptools

HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
name="jupyterlab_nvdashboard"

# Get our version
if 'GIT_DESCRIBE_TAG' in os.environ:
    describe_tag = os.environ['GIT_DESCRIBE_TAG']
    version = describe_tag.lstrip('v') + os.environ.get('VERSION_SUFFIX', '')
    if describe_tag[-1] == 'a':
        version += os.environ['GIT_DESCRIBE_NUMBER']
else:
    # get version from package.json (to avoid duplicating)
    with open(os.path.join(HERE, 'package.json'), encoding='utf-8') as f:
        version = json.load(f)['version']

lab_path = os.path.join(HERE, name, "labextension")

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(lab_path, "package.json"),
]

package_data_spec = {
    name: [
        "*"
    ]
}

labext_name = "jupyterlab-nvdashboard"

data_files_spec = [
    ("share/jupyter/labextensions/%s" % labext_name, lab_path, "**"),
    ("share/jupyter/labextensions/%s" % labext_name, HERE, "install.json"),("etc/jupyter/jupyter_server_config.d",
     "jupyter-config", "jupyterlab_nvdashboard.json"),

]

cmdclass = create_cmdclass("jsdeps",
    package_data_spec=package_data_spec,
    data_files_spec=data_files_spec
)

js_command = combine_commands(
    install_npm(HERE, build_cmd="build:prod", npm=["jlpm"]),
    ensure_targets(jstargets),
)

is_repo = os.path.exists(os.path.join(HERE, ".git"))
if is_repo:
    cmdclass["jsdeps"] = js_command
else:
    cmdclass["jsdeps"] = skip_if_exists(jstargets, js_command)

with open("README.md", "r") as fh:
    long_description = fh.read()

setup_args = dict(
    name=name,
    version=version,
    url="https://github.com/rapidsai/jupyterlab-nvdashboard",
    author="NVDashboard Contributors",
    description="A JupyterLab extension for displaying GPU usage dashboards",
    long_description= long_description,
    long_description_content_type="text/markdown",
    cmdclass= cmdclass,
    packages=setuptools.find_packages(),
    install_requires=list(open("requirements.txt").read().strip().split("\n")),
    entry_points={
        'jupyter_serverproxy_servers': [
            'nvdashboard = jupyterlab_nvdashboard:launch_server',
        ],
        'console_scripts': [
            'nvdashboard = jupyterlab_nvdashboard.server:go',
        ],
    },
    zip_safe=False,
    include_package_data=True,
    python_requires=">=3.7",
    license="BSD-3-Clause",
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "JupyterLab", "JupyterLab3"],
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Framework :: Jupyter",
    ],
)


if __name__ == "__main__":
    setuptools.setup(**setup_args)
