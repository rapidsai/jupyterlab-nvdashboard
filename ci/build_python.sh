#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2023-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

#!/bin/bash
# Copyright (c) 2023-2025, NVIDIA CORPORATION.

# Exit script if any command fails
set -euo pipefail

source rapids-date-string

rapids-print-env

# Generate version and replace any letter with a hyphen (hatch-nodejs-version does not like pre-release versions)
version=$(rapids-generate-version)
node_version=$(echo "$version" | sed 's/[a-zA-Z]/-\0/' | sed 's/^-//')

RAPIDS_PACKAGE_VERSION=$version
export RAPIDS_PACKAGE_VERSION

# Update the version field in package.json
rapids-logger "Updating version in package.json to $node_version"
jq -e --arg tag "$node_version" '.version=$tag' package.json > package.json.tmp
mv package.json.tmp package.json

# populates `RATTLER_CHANNELS` array and `RATTLER_ARGS` array
source rapids-rattler-channel-string

rapids-logger "Building jupyterlab-nvdashboard"

rattler-build build --recipe conda/recipes/jupyterlab-nvdashboard \
                    --test skip \
                    "${RATTLER_ARGS[@]}" \
                    "${RATTLER_CHANNELS[@]}"

# remove build_cache directory to avoid uploading the entire source tree
# tracked in https://github.com/prefix-dev/rattler-build/issues/1424
rm -rf "$RAPIDS_CONDA_BLD_OUTPUT_DIR"/build_cache

RAPIDS_PACKAGE_NAME="$(rapids-artifact-name conda_python jupyterlab-nvdashboard jupyterlab-nvdashboard --pure --arch any)"
export RAPIDS_PACKAGE_NAME
