#include <emscripten/bind.h>
#include <fmt/format.h>
#include <opencv2/opencv.hpp>

#ifdef EMSCRIPTEN
const char *onnxPath = "/yunet.onnx";
const char *prototxtPath = "/deploy.prototxt";
const char *modelPath = "/res10_300x300_ssd_iter_140000_fp16.caffemodel";
#else
const char *onnxPath = "yunet.onnx";
const char *prototxtPath = "deploy.prototxt";
const char *modelPath = "res10_300x300_ssd_iter_140000_fp16.caffemodel";
#endif

namespace {
const int MAX_WIDTH = 1920;
const int MAX_HEIGHT = 1080;
int currentWidth = 0;
int currentHeight = 0;
cv::dnn::dnn4_v20211220::Net faeceDetectorNet;
uint8_t inputImageBuffer[MAX_WIDTH * MAX_HEIGHT * 4];
uint8_t outputImageBuffer[MAX_WIDTH * MAX_HEIGHT * 4];
} // namespace

std::string getBuildInfo() { return cv::getBuildInformation(); }

std::string getExceptionMsg(intptr_t ptr) {
  auto e = reinterpret_cast<std::exception *>(ptr);
  return std::string(e->what());
}

intptr_t getInputImageBuffer() {
  return reinterpret_cast<intptr_t>(inputImageBuffer);
}

intptr_t getOutputImageBuffer() {
  return reinterpret_cast<intptr_t>(outputImageBuffer);
}

int initialize() {
  faeceDetectorNet = cv::dnn::readNetFromCaffe(prototxtPath, modelPath);
  fmt::print("empty:{}\n", faeceDetectorNet.empty());
  faeceDetectorNet.setPreferableBackend(6);
  currentWidth = 0;
  currentHeight = 0;
  return 0;
}

int detectFace(int width, int height) {
  if (width == 0 || height == 0) {
    return -1;
  }
  // fmt::print("detectFace {}x{}\n", width, height);
  if (currentWidth != width || currentHeight != height) {
    fmt::print("setInputSize {}x{}\n", width, height);
    currentWidth = width;
    currentHeight = height;
  }
  cv::Mat inputImageMat(height * 3 / 2, width, CV_8UC1, inputImageBuffer);
  cv::Mat outputImageMat(height * 3 / 2, width, CV_8UC1, outputImageBuffer);
  cv::Mat bgrInputImageMat;
  cv::cvtColor(inputImageMat, bgrInputImageMat, cv::COLOR_YUV2BGR_I420);
  cv::resize(bgrInputImageMat, bgrInputImageMat, cv::Size(300, 300));
  auto blob = cv::dnn::blobFromImage(bgrInputImageMat, 1.0, cv::Size(300, 300),
                                     cv::Scalar(104.0, 17.0, 123.0));
  faeceDetectorNet.setInput(blob);

  auto detections = faeceDetectorNet.forward();
  fmt::print("detection size:{}x{}x{} dim:{}\n", detections.size().width,
             detections.size().height, detections.channels(), detections.dims);

  // cv::Mat faces;
  // faceDetector->detect(bgrInputImageMat, faces);
  // // fmt::print("face: {}x{}@{} depth:{}\n", faces.cols, faces.rows,
  // //            faces.channels(), faces.depth());
  // for (int i = 0; i < faces.rows; ++i) {
  //   // fmt::print("face[{}] {},{},{},{}\n", i,
  //   faces.at<float>(cv::Point(0, i)),
  //   //            faces.at<float>(cv::Point(1, i)),
  //   //            faces.at<float>(cv::Point(2, i)),
  //   //            faces.at<float>(cv::Point(3, i)));
  //   cv::rectangle(bgrInputImageMat,
  //                 cv::Rect(faces.at<float>(cv::Point(0, i)),
  //                          faces.at<float>(cv::Point(1, i)),
  //                          faces.at<float>(cv::Point(2, i)),
  //                          faces.at<float>(cv::Point(3, i))),
  //                 cv::Scalar(255, 0, 0));
  // }

  cv::cvtColor(bgrInputImageMat, outputImageMat, cv::COLOR_BGR2YUV_I420);

  return 0;
}

EMSCRIPTEN_BINDINGS(wasm_module) {
  emscripten::function("getBuildInfo", &getBuildInfo);
  emscripten::function("getExceptionMsg", &getExceptionMsg,
                       emscripten::allow_raw_pointers());
  emscripten::function("getInputImageBuffer", &getInputImageBuffer,
                       emscripten::allow_raw_pointers());
  emscripten::function("getOutputImageBuffer", &getOutputImageBuffer,
                       emscripten::allow_raw_pointers());
  emscripten::function("initialize", &initialize);
  emscripten::function("detectFace", &detectFace);
}
