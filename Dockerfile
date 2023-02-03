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
RUN npm install aws-lambda-ric

# Build Stage 2: Copy Build Stage 1 files in to Stage 2. Install chromium dependencies and chromium.
FROM node:18-buster-slim
# Include global arg in this stage of the build
ARG FUNCTION_DIR
# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}
# Copy in the build image dependencies
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}
RUN ls ${FUNCTION_DIR}

ENV HOME="/tmp"

COPY dist ${FUNCTION_DIR}/dist
COPY package.json ${FUNCTION_DIR}
COPY src ${FUNCTION_DIR}/src
COPY ffmpeg ${FUNCTION_DIR}/ffmpeg
COPY index.js ${FUNCTION_DIR}
COPY node_modules ${FUNCTION_DIR}/node_modules

WORKDIR ${FUNCTION_DIR}

ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD [ "index.handler" ]