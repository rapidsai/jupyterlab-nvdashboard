#!/bin/bash
# Copyright (c) 2023, NVIDIA CORPORATION.

# Exit script if any command fails
set -euo pipefail

rapids-configure-conda-channels

source rapids-configure-sccache

source rapids-date-string

# Print the Rapids environment for debugging purposes
rapids-print-env

# Generate version and replace any letter with a hyphen
version=$(rapids-generate-version)
node_version=$(echo "$version" | sed 's/[a-zA-Z]/-\0/' | sed 's/^-//')

# Update the version field in package.json
rapids-logger "Updating version in package.json to $node_version"
jq -e --arg tag "$node_version" '.version=$tag' package.json > package.json.tmp
mv package.json.tmp package.json

# Generate jupyterlab_nvdashboard/_version.py since hatch version hook isn't working with conda-build
echo "__version__ = '$version'" > jupyterlab_nvdashboard/_version.py

# TODO: Remove `--no-test` flag once importing on a CPU
# node works correctly
rapids-logger "Building JupyterLab NVDashboard conda package"
RAPIDS_PACKAGE_VERSION=${version} rapids-conda-retry build --no-test conda/recipes/jupyterlab-nvdashboard

rapids-logger "Uploading JupyterLab NVDashboard conda package to S3"
rapids-upload-conda-to-s3 python
