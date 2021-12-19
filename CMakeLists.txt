cmake_minimum_required(VERSION 3.10)
project(wasm LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
if(CMAKE_CROSSCOMPILING)
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -matomics -mbulk-memory")
  file(GLOB opencv_core "/opencv/build_wasm/install/lib/*.a")
  file(GLOB opencv_3rdparty "/opencv/build_wasm/install/lib/opencv4/3rdparty/*.a")
  file(GLOB opencv_core_simd "/opencv/build_wasm_simd/install/lib/*.a")
  file(GLOB opencv_3rdparty_simd "/opencv/build_wasm_simd/install/lib/opencv4/3rdparty/*.a")
  file(GLOB opencv_core_simd_thread "/opencv/build_wasm_simd_threads/install/lib/*.a")
  file(GLOB opencv_3rdparty_simd_thread "/opencv/build_wasm_simd_threads/install/lib/opencv4/3rdparty/*.a")
  else()
  find_package(OpenCV REQUIRED)
endif()

include(FetchContent)
FetchContent_Declare(
  googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG release-1.11.0
)
FetchContent_Declare(
  googlebenchmark
  GIT_REPOSITORY https://github.com/google/benchmark.git
  GIT_TAG v1.6.0
)
FetchContent_Declare(
  fmt
  GIT_REPOSITORY https://github.com/fmtlib/fmt.git
  GIT_TAG 8.0.1
)
set(BENCHMARK_ENABLE_TESTING OFF)
FetchContent_MakeAvailable(googletest googlebenchmark fmt)

  # Main WebAssembly wasm/js
if(CMAKE_CROSSCOMPILING)
  add_executable(wasm opencv_wasm.cpp)
  target_include_directories(wasm PRIVATE "/opencv/build_wasm/install/include/opencv4")
  target_link_libraries(wasm ${opencv_core} ${opencv_3rdparty} fmt::fmt)
  target_link_options(wasm PRIVATE
    "SHELL:--embed-file yunet.onnx@/yunet.onnx"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
    "SHELL:-s TOTAL_MEMORY=65536000"
    "SHELL:-s WASM=1"
    "SHELL:-s MODULARIZE=1"
    "SHELL:-s USE_PTHREADS=0"
    "SHELL:-s EXPORT_NAME=createWasmModule"
    "SHELL:--bind"
  )

  add_executable(wasm_simd_threads opencv_wasm.cpp)
  target_compile_options(wasm_simd_threads PUBLIC "-matomics" "-mbulk-memory")
  target_include_directories(wasm_simd_threads PRIVATE "/opencv/build_wasm_simd_threads/install/include/opencv4")
  target_link_libraries(wasm_simd_threads ${opencv_core_simd_thread} ${opencv_3rdparty_simd_thread} fmt::fmt)
  target_link_options(wasm_simd_threads PRIVATE
    "SHELL:--embed-file yunet.onnx@/yunet.onnx"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
    "SHELL:-s TOTAL_MEMORY=65536000"
    "SHELL:-s WASM=1"
    "SHELL:-s MODULARIZE=1"
    "SHELL:-s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=16"
    "SHELL:-s EXPORT_NAME=createWasmSimdThreadsModule"
    "SHELL:--bind"
  )
endif()


# Test
enable_testing()
include(GoogleTest)

add_executable(opencv_test opencv_test.cpp)
target_link_libraries(opencv_test gtest_main)

file(DOWNLOAD https://github.com/ShiqiYu/libfacedetection.train/raw/master/tasks/task1/onnx/yunet.onnx ${CMAKE_BINARY_DIR}/yunet.onnx)
file(COPY "${CMAKE_SOURCE_DIR}/images/selfie.png" DESTINATION ${CMAKE_BINARY_DIR})

if(CMAKE_CROSSCOMPILING)
  file(COPY "${CMAKE_SOURCE_DIR}/run_test.sh" DESTINATION ${CMAKE_BINARY_DIR} USE_SOURCE_PERMISSIONS)
  target_link_options(opencv_test PRIVATE "--emrun")
  set_property(TARGET opencv_test PROPERTY SUFFIX ".html")
  set_property(TARGET opencv_test PROPERTY CROSSCOMPILING_EMULATOR "./run_test.sh")
  target_include_directories(opencv_test PUBLIC "/opencv/build_wasm/install/include/opencv4")
  target_link_libraries(opencv_test ${opencv_core} ${opencv_3rdparty} fmt::fmt)
  target_link_options(opencv_test PRIVATE
    "SHELL:--embed-file ../images@/images"
    "SHELL:--embed-file yunet.onnx@/yunet.onnx"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
    "SHELL:-s TOTAL_MEMORY=65536000"
  )
else()
  target_include_directories(opencv_test PUBLIC ${OpenCV_INCLUDE_DIRS})
  target_link_libraries(opencv_test ${OpenCV_LIBRARIES})
endif()

gtest_discover_tests(opencv_test DISCOVERY_TIMEOUT 20)

# gtest_discover_tests(wasm_test DISCOVERY_TIMEOUT 20)

# Performance benchmark
if(CMAKE_CROSSCOMPILING)
  add_executable(opencv_perf opencv_perf.cpp)
  target_link_libraries(opencv_perf benchmark_main)
  target_include_directories(opencv_perf PUBLIC "/opencv/build_wasm/install/include/opencv4")
  target_link_options(opencv_perf PRIVATE "--emrun")
  set_property(TARGET opencv_perf PROPERTY SUFFIX ".html")
  target_link_libraries(opencv_perf ${opencv_core} ${opencv_3rdparty} fmt::fmt)
  target_link_options(opencv_perf PRIVATE
    "SHELL:--embed-file ../images@/images"
    "SHELL:--embed-file yunet.onnx@/yunet.onnx"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
    "SHELL:-s TOTAL_MEMORY=65536000"
  )

  add_executable(opencv_perf_simd opencv_perf.cpp)
  target_link_libraries(opencv_perf_simd benchmark_main)
  target_include_directories(opencv_perf_simd PUBLIC "/opencv/build_wasm_simd/install/include/opencv4")
  target_link_options(opencv_perf_simd PRIVATE "--emrun")
  set_property(TARGET opencv_perf_simd PROPERTY SUFFIX ".html")
  target_link_libraries(opencv_perf_simd ${opencv_core_simd} ${opencv_3rdparty_simd} fmt::fmt)
  target_link_options(opencv_perf_simd PRIVATE
    "SHELL:--embed-file ../images@/images"
    "SHELL:--embed-file yunet.onnx@/yunet.onnx"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
    "SHELL:-s TOTAL_MEMORY=65536000"
  )

  add_executable(opencv_perf_simd_thread opencv_perf.cpp)
  target_link_libraries(opencv_perf_simd_thread benchmark_main)
  target_include_directories(opencv_perf_simd_thread PUBLIC "/opencv/build_wasm_simd_threads/install/include/opencv4")
  target_link_options(opencv_perf_simd_thread PRIVATE "--emrun")
  set_property(TARGET opencv_perf_simd_thread PROPERTY SUFFIX ".html")
  target_link_libraries(opencv_perf_simd_thread ${opencv_core_simd_thread} ${opencv_3rdparty_simd_thread} fmt::fmt)
  target_link_options(opencv_perf_simd_thread PRIVATE
    "SHELL:--embed-file ../images@/images"
    "SHELL:--embed-file yunet.onnx@/yunet.onnx"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
    # "SHELL:-s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=16 -s PROXY_TO_PTHREAD"
    "SHELL:-s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=16"
    "SHELL:-s TOTAL_MEMORY=65536000"
  )

else()
  find_package(OpenCV REQUIRED)
  add_executable(opencv_perf opencv_perf.cpp)
  target_link_libraries(opencv_perf benchmark_main)
  target_include_directories(opencv_perf PUBLIC ${OpenCV_INCLUDE_DIRS})
  target_link_libraries(opencv_perf ${OpenCV_LIBRARIES} fmt::fmt)
endif()

