# Example Docker Image
This Dockerfile builds an image based on nvidia/cuda:10.1-devel-ubuntu18.04 with Jupyter and Nvidia dashboard setup. This can be used in tools like KubeFlow.

Update requirements.txt to match your dependencies. The yaml file only contains the conda virtual environment & RAPIDSAI setup. Because some of packages conflict or missing in conda repos, the pip corresponding to the conda's virtual env is used for package management. 

To build it run `Docker build -t YOURTAG -f Docker/Dockerfile_python_base ./Docker`