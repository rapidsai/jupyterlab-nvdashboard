#!/bin/bash
# Copyright (c) 2023-2025, NVIDIA CORPORATION.

# Exit script if any command fails
set -euo pipefail

source rapids-date-string

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
