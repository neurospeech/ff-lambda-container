ARG FUNCTION_DIR="/function"

# Build Stage 1: Install aws-lambda-ric dependencies, npm install package.json dependencies
FROM node:18-buster as build-image
# Include global arg in this stage of the build
ARG FUNCTION_DIR
# AWS Lambda runtime dependencies
RUN apt-get update && \
    apt-get install -y \
        g++ \
        make \
        unzip \
        libcurl4-openssl-dev \
        autoconf \
        libtool \
        cmake
# Copy function code
RUN mkdir -p ${FUNCTION_DIR}/

WORKDIR ${FUNCTION_DIR}

RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar xvf ./ffmpeg-release-amd64-static.tar.xz --one-top-level=ffmpeg2 --strip-components 1 && \
    mv ${FUNCTION_DIR}/ffmpeg2 ${FUNCTION_DIR}/ffmpeg

COPY package*.json ${FUNCTION_DIR}

RUN npm ci && \
    npm install aws-lambda-ric && \
    npm install -g typescript

COPY entrypoint.sh ${FUNCTION_DIR}
RUN chmod +x ${FUNCTION_DIR}/entrypoint.sh
COPY src ${FUNCTION_DIR}/src
COPY index.js ${FUNCTION_DIR}
COPY rename.js ${FUNCTION_DIR}
COPY tsconfig.json ${FUNCTION_DIR}
RUN tsc
# COPY dist ${FUNCTION_DIR}/dist
# COPY ffmpeg ${FUNCTION_DIR}/ffmpeg

# Build Stage 2: Copy Build Stage 1 files in to Stage 2. Install chromium dependencies and chromium.
FROM node:18-buster-slim

RUN apt-get update && \
    apt-get install -y python3 python3-pip
RUN pip3 install tensorflow && \
    pip3 install spleeter

# Include global arg in this stage of the build
ARG FUNCTION_DIR
# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}
# Copy in the build image dependencies
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}
RUN ls ${FUNCTION_DIR}

ENV HOME="/tmp"

WORKDIR ${FUNCTION_DIR}

ENTRYPOINT ["./entrypoint.sh"]
# CMD [ "index.handler" ]