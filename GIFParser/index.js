import { parseGIF, decompressFrames } from './GIFuct';

class GIFParser {
  constructor({
    gifSource, on_frame_change, canvas, renderGif, handleOnCompleteLoop,
  }) {
    this.gifSource = gifSource;
    this.onFrameChangeListener = on_frame_change;
    this.handleOnCompleteLoop = handleOnCompleteLoop;
    this.canvas = canvas;
    this.renderGif = renderGif;
    this.frames = [];
    this.iterationCount = 0;
    this.i = 0;
    this.stopParsing = true;
    this.playing = true;

    this.frameImageData = null;
    this.patchCanvas = null;
    this.patchCanvasCtx = null;
    this.fullGifCanvas = null;
    this.fullGifCanvasCtx = null;
  }

  stopParsingGIF = () => {
    this.frames = [];
    this.patchCanvas = null;
    this.patchCanvasCtx = null;
    this.fullGifCanvas = null;
    this.fullGifCanvasCtx = null;
    this.stopParsing = true;
  }

  getLength = () => this.frames.length

  play = () => {
    this.playing = true;
  }

  pause = () => {
    this.playing = false;
  }

  isPlaying = () => this.playing

   validateAndFix = (gif) => {
     let currentGce = null;
     for (const frame of gif.frames) {
       currentGce = frame.gce ? frame.gce : currentGce;
       if ('image' in frame && !('gce' in frame)) {
         frame.gce = currentGce;
       }
     }
   }

   drawPatch = () => {
     const frame = this.frames[this.i];
     const dims = frame.dims;
     if (
       !this.frameImageData
        || dims.width != this.frameImageData.width
        || dims.height != this.frameImageData.height
     ) {
       this.patchCanvas.width = dims.width;
       this.patchCanvas.height = dims.height;
       this.frameImageData = this.patchCanvasCtx.createImageData(dims.width, dims.height);
     }

     // set the patch data as an override
     this.frameImageData.data.set(frame.patch);

     // draw the patch back over the canvas
     this.patchCanvasCtx.putImageData(this.frameImageData, 0, 0);

     this.fullGifCanvasCtx.globalCompositeOperation = 'source-over';

     this.fullGifCanvasCtx.drawImage(this.patchCanvas, dims.left, dims.top);

     return this.fullGifCanvasCtx.getImageData(0, 0, this.fullGifCanvas.width, this.fullGifCanvas.height);
   }

   putFrame = () => {
     this.i = parseInt(this.i, 10);
     // lets not render disposal method 3 as it is not getting handled well
     if (this.frames[this.i]?.disposalType === 3) {
       return;
     }
     if (this.i > this.frames.length - 1) {
       this.i = 0;
     }

     if (this.i < 0) {
       this.i = 0;
     }

     const prevFrame = this.frames[this.i - 1];
     if (prevFrame?.disposalType === 2) {
       const {
         width, height, left, top,
       } = prevFrame.dims;
       this.fullGifCanvasCtx.clearRect(left, top, width, height);
     }
     const imageData = this.drawPatch();

     if (this.onFrameChangeListener !== null) {
       this.onFrameChangeListener({
         currentIndex: this.i,
         data: imageData,
         totalFrames: this.frames.length,
       });
     }
   }

  requestTimeout = (fn, delay) => {
    const start = new Date().getTime();
    let rqstAnimation;

    const functionToHandleTimeout = () => {
      const timeNow = new Date().getTime();
      if (timeNow - start > delay) {
        cancelAnimationFrame(rqstAnimation);
        requestAnimationFrame(fn);
      } else {
        rqstAnimation = requestAnimationFrame(functionToHandleTimeout);
      }
    };

    rqstAnimation = requestAnimationFrame(functionToHandleTimeout);
  };

   completeLoop = () => {
     this.iterationCount++;
     this.handleOnCompleteLoop?.(this.iterationCount, this.frames.length);
   }

   doStep = () => {
     if (this.frames.length === 0) {
       return;
     }
     this.putFrame();
     this.i += 1;

     if (!this.stopParsing && this.playing) {
       if (this.frames.length === this.i) {
         this.completeLoop();
       }
       this.requestTimeout(this.doStep, 100);
       // requestAnimationFrame(this.doStep);
     }
   };

   initandParse = () => {
     this.frameImageData = null;
     if (window.OffscreenCanvas) {
       this.patchCanvas = new OffscreenCanvas(this.canvas?.width || 0, this.canvas?.height || 0);
       this.fullGifCanvas = new OffscreenCanvas(this.canvas?.width || 0, this.canvas?.height || 0);
     } else {
       this.patchCanvas = document.createElement('canvas');
       this.patchCanvas.width = this.canvas?.width || 0;
       this.patchCanvas.height = this.canvas?.height || 0;

       this.fullGifCanvas = document.createElement('canvas');
       this.fullGifCanvas.width = this.canvas?.width || 0;
       this.fullGifCanvas.height = this.canvas?.height || 0;
     }
     this.patchCanvasCtx = this.patchCanvas.getContext('2d');
     this.fullGifCanvasCtx = this.fullGifCanvas.getContext('2d');
     this.stopParsing = false;
     this.doStep();
   }

  load_url = (src, callback) => {
    const h = new XMLHttpRequest();
    h.open('GET', src, true);
    h.responseType = 'arraybuffer';
    const parentContext = this;

    // eslint-disable-next-line func-names
    h.onload = function () {
      if (this.status != 200) {
        console.warn('Error on gif call', this.status);
      }
      const data = this.response;
      const parsedData = parseGIF(data);

      parentContext.validateAndFix(parsedData);

      parentContext.frames = decompressFrames(parsedData, true);

      if (parentContext.renderGif) {
        parentContext.initandParse();
      }

      if (callback) {
        callback();
      }
    };
    h.onerror = (error) => {
      console.warn('Error on gif call', error);
    };
    h.send();
    return h;
  }

  load = (callback) => this.load_url(this.gifSource, callback)
}

export default GIFParser;
