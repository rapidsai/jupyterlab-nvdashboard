#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2023-2026, NVIDIA CORPORATION
# SPDX-License-Identifier: BSD-3-Clause

# Exit script if any command fails
set -euo pipefail

# Configure sccache and set the date string
source rapids-configure-sccache
source rapids-date-string
source rapids-init-pip

rapids-logger "Install Node.js required for building the extension front-end"

# Install NVM for managing Node.js versions
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js required for building the extension front-end
nvm install 18 && nvm use 18

rapids-generate-version > ./VERSION

# Update the version field in package.json (this is read by hatch-nodejs-version)
jq -e --arg tag "$(head -1 ./VERSION)" '.version=$tag' ./package.json > ./package.json.tmp
mv package.json.tmp package.json

rapids-logger "Begin py build"

# Install build tools for Python
python -m pip install build

# Build the Python package
python -m build --wheel --outdir "${RAPIDS_WHEEL_BLD_OUTPUT_DIR}"

ci/validate_wheel.sh "${RAPIDS_WHEEL_BLD_OUTPUT_DIR}"
