import { WasmModule } from './faceDetectWasmModule'

declare var VideoFrame: {
  prototype: VideoFrame
  // new(source: CanvasImageSource | OffscreenCanvas, init?: VideoFrameInit): VideoFrame;
  new (data: AllowSharedBufferSource, init: VideoFrameBufferInit): VideoFrame
}

export function getFaceDetectTransformer (
  faceDetectModule: WasmModule
): (
  videoFrame: VideoFrame,
  controller: TransformStreamDefaultController<VideoFrame>
) => void {
  console.log(faceDetectModule)
  console.log(faceDetectModule.getBuildInfo())
  try{
    faceDetectModule.initialize()
  } catch(ex) {
    if (typeof ex === 'number') {
      console.log(faceDetectModule.getExceptionMsg(ex as number))
    } else {
      console.log(ex)
    }
  }
  const inputImageOffset = faceDetectModule.getInputImageBuffer()
  const outputImageOffset = faceDetectModule.getOutputImageBuffer()

  return (videoFrame, controller) => {
    try {
      const opts = {
        rect: {
          x: 0,
          y: 0,
          width: videoFrame.codedWidth,
          height: videoFrame.codedHeight
        }
      }
      const size = videoFrame.allocationSize(opts)
      // console.log(
      //   'videoFrame.format',
      //   videoFrame.format,
      //   videoFrame.codedWidth,
      //   videoFrame.codedHeight,
      //   videoFrame.allocationSize(opts)
      // )
      videoFrame.copyTo(
        faceDetectModule.HEAPU8.subarray(
          inputImageOffset,
          inputImageOffset + size
        ),
        opts
      )
      try {
        faceDetectModule.detectFace(
          videoFrame.codedWidth,
          videoFrame.codedHeight
        )
      } catch (ex) {
        if (typeof ex === 'number') {
          console.log(faceDetectModule.getExceptionMsg(ex as number))
        } else {
          console.log(ex)
        }
        controller.enqueue(videoFrame)
        return
      }
      const output = faceDetectModule.HEAPU8.subarray(
        outputImageOffset,
        outputImageOffset + size
      )
      const newFrame = new VideoFrame(output, {
        codedHeight: videoFrame.codedHeight,
        codedWidth: videoFrame.codedWidth,
        format: videoFrame.format!,
        duration: videoFrame.duration!,
        timestamp: videoFrame.timestamp!,
        visibleRect: videoFrame.visibleRect!
      })
      videoFrame.close()
      controller.enqueue(newFrame)
    } catch (ex) {
      console.log(ex)
    }
  }
}
