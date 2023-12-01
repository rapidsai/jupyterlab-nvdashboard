#!/bin/bash
# Copyright (c) 2023, NVIDIA CORPORATION.

# Exit script if any command fails
set -euo pipefail

# Set the package name
package_name="jupyterlab-nvdashboard"

# Configure sccache and set the date string
source rapids-configure-sccache
source rapids-date-string

rapids-logger "Install Node.js required for building the extension front-end"

# Install NVM for managing Node.js versions
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js required for building the extension front-end
nvm install 18 && nvm use 18

# Generate version and replace any letter with a hyphen
version=$(rapids-generate-version)
node_version=$(echo "$version" | sed 's/[a-zA-Z]/-\0/' | sed 's/^-//')

# Log message: Update the version field in package.json
rapids-logger "Updating version in package.json to $node_version"
jq -e --arg tag "$node_version" '.version=$tag' package.json > package.json.tmp
mv package.json.tmp package.json

# Log message: Begin py build
rapids-logger "Begin py build"

# Install build tools for Python
python -m pip install build

# Build the Python package
python -m build -s -w

rapids-logger "Uploading JupyterLab NVDashboard wheels to S3"
# Upload Python wheels to S3
RAPIDS_PY_WHEEL_NAME="${package_name}" rapids-upload-wheels-to-s3 dist
