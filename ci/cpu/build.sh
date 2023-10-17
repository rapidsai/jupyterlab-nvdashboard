#!/bin/bash
# Copyright (c) 2020-2022, NVIDIA CORPORATION.
set -e

# Set path and build parallel level
export PATH=/opt/conda/bin:/usr/local/cuda/bin:$PATH
export PARALLEL_LEVEL=${PARALLEL_LEVEL:-4}

# Set home to the job's workspace
export HOME="$WORKSPACE"

# Switch to project root; also root of repo checkout
cd "$WORKSPACE"

# Get latest tag and number of commits since tag
export GIT_DESCRIBE_TAG=`git describe --abbrev=0 --tags`
export GIT_DESCRIBE_NUMBER=`git rev-list ${GIT_DESCRIBE_TAG}..HEAD --count`
export RAPIDS_DATE_STRING=$(date +%y%m%d)

################################################################################
# SETUP - Check environment
################################################################################

rapids-logger "Get env"
env

rapids-logger "Activate conda env"
. /opt/conda/etc/profile.d/conda.sh
# conda create -n rapids
conda activate rapids

rapids-logger "Check versions"
python --version
conda info
conda config --show-sources
conda list --show-channel-urls

# FIX Added to deal with Anancoda SSL verification issues during conda builds
conda config --set ssl_verify False

# FIXME: Remove
# rapids-mamba-retry install -c conda-forge boa

################################################################################
# BUILD - Conda & pip package
################################################################################

# rapids-logger "Build conda pkg for jupyterlab-nvdashboard"
# rapids-mamba-retry mambabuild conda/recipes/jupyterlab-nvdashboard --python=$PYTHON

rapids-logger "Build pip pkg for jupyterlab-nvdashboard"
rm -rf dist/
pip install build
python -m build -s

################################################################################
# UPLOAD - Packages
################################################################################

rapids-logger "Upload packages"
source ci/cpu/upload.sh
