#!/bin/bash
# Copyright (c) 2018, NVIDIA CORPORATION.
set -e
NUMARGS=$#
ARGS=$*

# Logger function for build status output
function logger() {
  echo -e "\n>>>> $@\n"
}

# Arg parsing function
function hasArg {
    (( ${NUMARGS} != 0 )) && (echo " ${ARGS} " | grep -q " $1 ")
}

# Set path and build parallel level
export PATH=/conda/bin:/usr/local/cuda/bin:$PATH
export PARALLEL_LEVEL=4
export CUDA_REL=${CUDA_VERSION%.*}

# Set home to the job's workspace
export HOME=$WORKSPACE

# Parse git describe
cd $WORKSPACE
export GIT_DESCRIBE_TAG=`git describe --tags`
export MINOR_VERSION=`echo $GIT_DESCRIBE_TAG | grep -o -E '([0-9]+\.[0-9]+)'`

################################################################################
# SETUP - Check environment
################################################################################

logger "Check environment..."
env

logger "Check GPU usage..."
nvidia-smi

logger "Activate conda env..."
source activate gdf

logger "Install conda dependencies"
conda install -y nodejs=10 jupyterlab

################################################################################
# TEST
################################################################################

if hasArg --skip-tests; then
    logger "Skipping Tests..."
else
    logger "Check GPU usage..."
    nvidia-smi

    cd $WORKSPACE
    logger "Python py.test for jupyterlab_nvdashboard..."
    python -m pip install -e .
    py.test --cache-clear --junitxml=${WORKSPACE}/junit-nvstrings.xml -v jupyterlab_nvdashboard

    logger "Node jlpm test for jupyterlab_nvdashboard..."
    jlpm install
    jlpm test
fi