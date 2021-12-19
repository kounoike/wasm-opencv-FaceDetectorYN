#include <benchmark/benchmark.h>
#include <fmt/core.h>
#include <opencv2/opencv.hpp>

#ifdef EMSCRIPTEN
const char *imgDir = "/images";
const char *imgPath = "/images/selfie.png";
const char *onnxPath = "/yunet.onnx";
#else
const char *imgDir = "../images";
const char *imgPath = "../images/selfie.png";
const char *onnxPath = "yunet.onnx";
#endif

void BM_FaceDetectYN(benchmark::State &state) {
  cv::Mat origImg = cv::imread(imgPath, cv::IMREAD_COLOR);
  if (origImg.empty()) {
    state.SkipWithError("Load image error");
  }
  cv::Mat img;
  cv::resize(origImg, img, cv::Size(state.range(0), state.range(1)));
  if (img.empty()) {
    state.SkipWithError("Resize error");
  }

  auto faceDetector = cv::FaceDetectorYN::create(onnxPath, "", cv::Size(0, 0));
  if (faceDetector.empty()) {
    state.SkipWithError("ONNX load error");
  }

  faceDetector->setInputSize(cv::Size(img.cols, img.rows));
  for (auto _ : state) {
    cv::Mat faces;
    auto ret = faceDetector->detect(img, faces);
  }
}

BENCHMARK(BM_FaceDetectYN)
    ->Args({320, 180})
    ->Args({640, 360})
    ->Args({1280, 720})
    ->Args({1920, 1080})
    ->Args({640, 480});
