ARG FUNCTION_DIR="/function"

# Build Stage 1: Install aws-lambda-ric dependencies, npm install package.json dependencies
FROM node:20-buster as build-image
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
COPY index.js ${FUNCTION_DIR}
COPY rename.js ${FUNCTION_DIR}
COPY tsconfig.json ${FUNCTION_DIR}
RUN tsc
# COPY dist ${FUNCTION_DIR}/dist
# COPY ffmpeg ${FUNCTION_DIR}/ffmpeg

# Build Stage 2: Copy Build Stage 1 files in to Stage 2. Install chromium dependencies and chromium.
FROM node:20-buster-slim

# Include global arg in this stage of the build
ARG FUNCTION_DIR
# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}
# Copy in the build image dependencies
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}
RUN ls ${FUNCTION_DIR}

ENV HOME="/tmp"

WORKDIR ${FUNCTION_DIR}

ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD [ "index.handler" ]
