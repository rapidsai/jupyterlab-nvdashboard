#!/bin/bash
# Copyright (c) 2020, NVIDIA CORPORATION.
set -e
NUMARGS=$#
ARGS=$*

# Logger function for build status output
function gpuci_logger() {
  echo -e "\n>>>> $@\n"
}

# Arg parsing function
function hasArg {
    (( ${NUMARGS} != 0 )) && (echo " ${ARGS} " | grep -q " $1 ")
}

# Set path and build parallel level
export PATH=/opt/conda/bin:/usr/local/cuda/bin:$PATH
export PARALLEL_LEVEL=-4
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

gpuci_logger "Check environment"
env

gpuci_logger "Check GPU usage"
nvidia-smi

gpuci_logger "Activate conda env"
. /opt/conda/etc/profile.d/conda.sh
conda activate rapids

gpuci_logger "Install conda dependencies"
conda install -y nodejs=10 jupyterlab

################################################################################
# TEST
################################################################################

if hasArg --skip-tests; then
    gpuci_logger "Skipping Tests"
else
    gpuci_logger "Check GPU usage"
    nvidia-smi

    cd $WORKSPACE
    gpuci_logger "Python py.test for jupyterlab_nvdashboard"
    python -m pip install -e .
    py.test --cache-clear --junitxml=${WORKSPACE}/junit-nvstrings.xml -v jupyterlab_nvdashboard

    gpuci_logger "Node jlpm test for jupyterlab_nvdashboard"
    jlpm install
    jlpm test
fi