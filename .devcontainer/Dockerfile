ARG VARIANT=ubuntu-20.04
FROM mcr.microsoft.com/vscode/devcontainers/cpp:0-${VARIANT}

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get -y install --no-install-recommends \
  ca-certificates \
  firefox \
  fonts-liberation \
  gnupg \
  libappindicator1 \
  libdrm2 \
  libgbm1 \
  libjpeg-dev \
  libgtest-dev \
  libnss3 \
  libpng-dev \
  ninja-build \
  python \
  python3-dev \
  python3-numpy \
  xdg-utils \
  libasound2 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

## node.js sources.list
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -

## yarn sources.list
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" > /etc/apt/sources.list.d/yarn.list

RUN apt-get update && apt-get install -y --no-install-recommends nodejs yarn
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
  nodejs \
  yarn \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*


# RUN curl -O https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
#   dpkg -i google-chrome-stable_current_amd64.deb && \
#   rm google-chrome-stable_current_amd64.deb

RUN curl -sSL https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
  echo "deb http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
  apt-get update -y && \
  apt-get install -y --no-install-recommends \
  google-chrome-stable \
  google-chrome-beta \
  google-chrome-unstable

ARG EMSCRIPTEN_VERSION=3.1.4
# ### EMSCRIPTEN for base
WORKDIR /
RUN git clone https://github.com/emscripten-core/emsdk.git --depth 1
WORKDIR /emsdk
RUN ./emsdk install ${EMSCRIPTEN_VERSION} && ./emsdk activate ${EMSCRIPTEN_VERSION}
RUN echo '. /emsdk/emsdk_env.sh > /dev/null 2>&1' >> /home/vscode/.bashrc

ARG OPENCV_VERSION=4.5.5
WORKDIR /
RUN git clone https://github.com/opencv/opencv.git -b ${OPENCV_VERSION} --depth 1
RUN git -C /opencv checkout -b ${OPENCV_VERSION}
# RUN git clone https://github.com/kounoike/opencv_contrib.git -b 4.5.3-simd --depth 1
# RUN git -C /opencv_contrib checkout 4.5.3-simd
RUN git clone https://github.com/opencv/opencv_contrib.git -b ${OPENCV_VERSION} --depth 1
RUN git -C /opencv_contrib checkout ${OPENCV_VERSION}

ENV OPENCV_CMAKE_FLAGS="\
  -DOPENCV_EXTRA_MODULES_PATH=/opencv_contrib/modules \
  -DBUILD_LIST=core,imgproc,calib3d,video,ximgproc,imgcodecs,dnn,objdetect \
  -DBUILD_opencv_imgcodecs=ON \
  -DBUILD_opencv_js=OFF \
  -DBUILD_TESTS=OFF \
  -DBUILD_PERF_TESTS=OFF \
  -DBUILD_EXAMPLES=OFF \
  -DBUILD_opencv_apps=OFF \
  -DWITH_PNG=ON \
  -DWITH_JPEG=OFF \
  -DWITH_TIFF=OFF \
  -DWITH_WEBP=OFF \
  -DWITH_OPENJPEG=OFF \
  -DWITH_JASPER=OFF \
  -DWITH_OPENEXR=OFF \
  -DCMAKE_BUILD_TYPE=Release \
  "

ENV OPENCV_CONFIG_FLAG_EMSCRIPTEN="\
  --config_only \
  --emscripten_dir=/emsdk/upstream/emscripten \
  "

ENV EMSDK=/emsdk

WORKDIR /opencv
RUN python3  platforms/js/build_js.py build_wasm                               ${OPENCV_CONFIG_FLAG_EMSCRIPTEN} $(sh -c 'for x in "$@"; do echo "--cmake_option=$x"; done' "" ${OPENCV_CMAKE_FLAGS})
RUN python3  platforms/js/build_js.py build_wasm_simd --simd                   $OPENCV_CONFIG_FLAG_EMSCRIPTEN $(sh -c 'for x in "$@"; do echo "--cmake_option=$x"; done' "" ${OPENCV_CMAKE_FLAGS})
RUN python3  platforms/js/build_js.py build_wasm_threads --threads             $OPENCV_CONFIG_FLAG_EMSCRIPTEN $(sh -c 'for x in "$@"; do echo "--cmake_option=$x"; done' "" ${OPENCV_CMAKE_FLAGS})
RUN python3  platforms/js/build_js.py build_wasm_simd_threads --simd --threads $OPENCV_CONFIG_FLAG_EMSCRIPTEN $(sh -c 'for x in "$@"; do echo "--cmake_option=$x"; done' "" ${OPENCV_CMAKE_FLAGS})

RUN cmake --build /opencv/build_wasm              --parallel $(nproc)
RUN cmake --build /opencv/build_wasm_simd         --parallel $(nproc)
RUN cmake --build /opencv/build_wasm_threads      --parallel $(nproc)
RUN cmake --build /opencv/build_wasm_simd_threads --parallel $(nproc)

RUN cmake --install /opencv/build_wasm --prefix /opencv/build_wasm/install
RUN cmake --install /opencv/build_wasm_simd --prefix /opencv/build_wasm_simd/install
RUN cmake --install /opencv/build_wasm_threads --prefix /opencv/build_wasm_threads/install
RUN cmake --install /opencv/build_wasm_simd_threads --prefix /opencv/build_wasm_simd_threads/install

## build for host
WORKDIR /opencv/build_native
RUN cmake ${OPENCV_CMAKE_FLAGS} ..
RUN cmake --build . --config Release --parallel $(nproc)
# RUN cmake --install . --prefix /usr/local
RUN cmake --install /opencv/build_native && ldconfig
