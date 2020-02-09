
FROM nvidia/cuda:10.1-devel-ubuntu18.04

# Install ubuntu18 packages 

RUN apt-get update && apt-get install -y --no-install-recommends  curl git bash wget sed grep dpkg libc6 libpam-modules  dnsutils iputils-ping ca-certificates unixodbc-dev libglib2.0-0 libxext6 libsm6 libxrender1 nodejs npm &&\
    TINI_VERSION=`curl https://github.com/krallin/tini/releases/latest | grep -o "/v.*\"" | sed 's:^..\(.*\).$:\1:'` && \
    curl -L "https://github.com/krallin/tini/releases/download/v${TINI_VERSION}/tini_${TINI_VERSION}.deb" > tini.deb && \
    dpkg -i tini.deb && \
    rm tini.deb 

# Install conda

ENV CONDA_DIR="/opt/conda"
ENV PATH="$CONDA_DIR/envs/py37/bin:$CONDA_DIR/bin:$PATH"
ENV BASH_ENV ~/.bashrc
SHELL ["/bin/bash", "-c"]
COPY py-env.yml .
COPY requirements.txt .

RUN wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-4.7.12-Linux-x86_64.sh -O ~/miniconda.sh && \
    /bin/bash ~/miniconda.sh -b -p /opt/conda && \
    rm ~/miniconda.sh && \
    /opt/conda/bin/conda clean -tipsy && \
    ln -s /opt/conda/etc/profile.d/conda.sh /etc/profile.d/conda.sh && \
    echo ". /opt/conda/etc/profile.d/conda.sh" >> ~/.bashrc && \
    conda env create -f py-env.yml && \
    conda init bash && \
    echo "source activate py37" > ~/.bashrc &&\
    pip install -r requirements.txt &&\
    conda clean -afy  && \
    mkdir -p /.local && \
    chmod -R 777 /.local &&\
    jupyter labextension install jupyterlab-nvdashboard
ENV NB_PREFIX /
CMD ["/bin/bash","-c", "jupyter notebook --notebook-dir=/home/jovyan --ip=0.0.0.0 --no-browser --allow-root --port=8888 --NotebookApp.token='' --NotebookApp.password='' --NotebookApp.allow_origin='*' --NotebookApp.base_url=${NB_PREFIX}"]



