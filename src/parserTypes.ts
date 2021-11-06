export type frameObj = {
  currentIndex: number;
  data: ImageData | undefined;
  totalFrames: number;
};
export type frameChange = (obj: frameObj) => void;
export type onCompletionLoopObj = (iterationCount: number, frameLength: number) => void;

export type constructorObjType = {
  gifSource: string;
  on_frame_change: frameChange;
  canvasElement: HTMLCanvasElement;
  renderGif: boolean;
  handleOnCompleteLoop: onCompletionLoopObj;
  delay: number;
};
