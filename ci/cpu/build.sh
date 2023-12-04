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

# Setup 'gpuci_conda_retry' for build retries (results in 2 total attempts)
export GPUCI_CONDA_RETRY_MAX=1
export GPUCI_CONDA_RETRY_SLEEP=30

################################################################################
# SETUP - Check environment
################################################################################

gpuci_logger "Get env"
env

gpuci_logger "Activate conda env"
. /opt/conda/etc/profile.d/conda.sh
conda activate rapids

gpuci_logger "Check versions"
python --version
$CC --version
$CXX --version
conda info
conda config --show-sources
conda list --show-channel-urls

# FIX Added to deal with Anancoda SSL verification issues during conda builds
conda config --set ssl_verify False

# FIXME: Remove
gpuci_mamba_retry install -c conda-forge boa

################################################################################
# BUILD - Conda & pip package
################################################################################

gpuci_logger "Build conda pkg for jupyterlab-nvdashboard"
# TODO: Remove `--no-test` flag once importing on a CPU
# node works correctly
gpuci_conda_retry mambabuild --no-test conda/recipes/jupyterlab-nvdashboard --python=$PYTHON

gpuci_logger "Build pip pkg for jupyterlab-nvdashboard"
rm -rf dist/
pip install build
python -m build -s

################################################################################
# UPLOAD - Packages
################################################################################

gpuci_logger "Upload packages"
source ci/cpu/upload.sh