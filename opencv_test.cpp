#include <gtest/gtest.h>
#include <opencv2/opencv.hpp>

#ifdef EMSCRIPTEN
const char *onnxPath = "/yunet.onnx";
const char *imgPath = "/images/selfie.png";
#else
const char *onnxPath = "yunet.onnx";
const char *imgPath = "selfie.png";
#endif

TEST(FaceDetect, LoadModel) {
  auto faceDetector = cv::FaceDetectorYN::create(onnxPath, "", cv::Size(0, 0));
  EXPECT_FALSE(faceDetector.empty());
}

TEST(FaceDetect, Detect) {
  auto faceDetector = cv::FaceDetectorYN::create(onnxPath, "", cv::Size(0, 0));
  EXPECT_FALSE(faceDetector.empty());

  cv::Mat img = cv::imread(imgPath);
  EXPECT_FALSE(img.empty());

  faceDetector->setInputSize(cv::Size(img.cols, img.rows));
  cv::Mat faces;
  auto ret = faceDetector->detect(img, faces);
  EXPECT_FALSE(faces.empty());
  EXPECT_EQ(ret, 1);

  std::cout << faces.size << std::endl;
}
