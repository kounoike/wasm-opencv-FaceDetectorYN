export interface WasmModule extends EmscriptenModule {
  getExceptionMsg(ex: number): string
  initialize(): number
  getInputImageBuffer(): number
  getOutputImageBuffer(): number
  detectFace(width: number, height: number): number
}

export declare function createWasmModule(): Promise<WasmModule>
