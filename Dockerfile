ARG FUNCTION_DIR="/function"

# Build Stage 1: Install aws-lambda-ric dependencies, npm install package.json dependencies
FROM node:24-bookworm as build-image
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

RUN mkdir -p /ffmpeg/
WORKDIR /ffmpeg

COPY --from=mwader/static-ffmpeg:7.1 /ffmpeg ${FUNCTION_DIR}/
COPY --from=mwader/static-ffmpeg:7.1 /ffprobe ${FUNCTION_DIR}/

WORKDIR ${FUNCTION_DIR}

COPY package*.json ${FUNCTION_DIR}/

RUN npm ci && \
    npm install aws-lambda-ric && \
    npm install -g typescript

# COPY entrypoint.sh ${FUNCTION_DIR}
# RUN chmod +x ${FUNCTION_DIR}/entrypoint.sh
COPY src ${FUNCTION_DIR}/src
COPY images ${FUNCTION_DIR}/images
COPY index.mjs ${FUNCTION_DIR}
COPY rename.js ${FUNCTION_DIR}
COPY tsconfig.json ${FUNCTION_DIR}
RUN tsc
# COPY dist ${FUNCTION_DIR}/dist
# COPY ffmpeg ${FUNCTION_DIR}/ffmpeg

# Build Stage 2: Copy Build Stage 1 files in to Stage 2. Install chromium dependencies and chromium.
FROM node:24-bookworm-slim

# Include global arg in this stage of the build
ARG FUNCTION_DIR
# Set working directory to function root directory

# 1. TELL THE RIC PACKAGES WHERE TO FIND THE HANDLER MODULE
ENV LAMBDA_TASK_ROOT=${FUNCTION_DIR}

WORKDIR ${FUNCTION_DIR}
# Copy in the build image dependencies
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}
RUN ls ${FUNCTION_DIR}

ENV HOME="/tmp"

WORKDIR ${FUNCTION_DIR}

ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD [ "/function/index.handler" ]
