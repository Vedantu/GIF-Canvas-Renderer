import { parseGIF, decompressFrames } from 'gifuct-js';

// types
import { constructorObjType, frameChange, onCompletionLoopObj } from './parserTypes';


declare const window: any;

class GIFParser {
    // url of the gif
    gifSource: string;

    // one every frame change this function is called
    onFrameChangeListener: frameChange;

    // on every gif loop completion this function is called -- optional
    handleOnCompleteLoop: onCompletionLoopObj;
    
    // canvas element where GIF will be rendered
    canvasElement: HTMLCanvasElement;

    // boolean to check if gif needs to be rendered
    renderGif: boolean;

    // array to store all the frames parsed from GIF
    frames: Array<any>;

    // no of interation done for the given gif
    iterationCount: number;

    // current frame index that is getting rendered
    currentFrameIndex: number;

    // stop rendering gif 
    stopRenderingGif: boolean;

    // is GIF playing or rendering
    playing: boolean;

    //delay between two frames
    delay: number;

    frameImageData: ImageData | undefined;
    patchCanvas: any; // error on using type HTMLCanvasElement ->  Type 'OffscreenCanvas' is missing the following properties from type 'HTMLCanvasElement'
    patchCanvasCtx: CanvasRenderingContext2D | null;
    fullGifCanvas: any; // error on using type HTMLCanvasElement ->  Type 'OffscreenCanvas' is missing the following properties from type 'HTMLCanvasElement'
    fullGifCanvasCtx: CanvasRenderingContext2D | null;


    constructor(constructorObj: constructorObjType){
        this.gifSource = constructorObj.gifSource;
        this.onFrameChangeListener = constructorObj.on_frame_change;
        this.handleOnCompleteLoop = constructorObj.handleOnCompleteLoop;
        this.canvasElement = constructorObj.canvasElement;
        this.renderGif = constructorObj.renderGif;
        this.delay = constructorObj.delay || 100;

        this.frames = [];
        this.iterationCount = 0;
        this.currentFrameIndex = 0;
        this.stopRenderingGif = true;
        this.playing = true;

        this.frameImageData = undefined;
        this.patchCanvas = null;
        this.patchCanvasCtx = null;
        this.fullGifCanvas = null;
        this.fullGifCanvasCtx = null;
    }

    /**
     * function to clear all variable and stop parsing
     */
    stopParsingGIF = () => {
        this.frames = [];
        this.patchCanvas = null;
        this.patchCanvasCtx = null;
        this.fullGifCanvas = null;
        this.fullGifCanvasCtx = null;
        this.stopRenderingGif = true;
    }

    /**
     * function that returns the total frames count
     */
    getLength = () => this.frames.length

    /**
     * function to update the flag of gif playing
     */
    play = () => {
      this.playing = true;
    }
  
    /**
     * function to pause the gif
     */
    pause = () => {
      this.playing = false;
    }
  
    /**
     * function to get if gif is playing
     */
    isPlaying = () => this.playing

    /**
     * function to add gce if gce ismissing
     * issue: https://github.com/matt-way/gifuct-js/issues/30
     */
    validateAndFix = (gif: any) => {
        let currentGce = null;
        for (const frame of gif.frames) {
          currentGce = frame.gce ? frame.gce : currentGce;
          if ('image' in frame && !('gce' in frame)) {
            frame.gce = currentGce;
          }
        }
    }

    drawPatch = () => {
        const frame = this.frames[this.currentFrameIndex];
        const dims = frame.dims;
        if (
          !this.frameImageData
           || dims.width != this.frameImageData.width
           || dims.height != this.frameImageData.height
        ) {
            if(this.patchCanvas){
                this.patchCanvas.width = dims.width;
                this.patchCanvas.height = dims.height;
            }
          this.frameImageData = this.patchCanvasCtx?.createImageData(dims.width, dims.height);
        }
   
        // set the patch data as an override
        this.frameImageData?.data.set(frame.patch);
   
        // draw the patch back over the canvas
        if(this.frameImageData){
            this.patchCanvasCtx?.putImageData(this.frameImageData, 0, 0);
        }
    
        if(this.fullGifCanvasCtx){
            this.fullGifCanvasCtx.globalCompositeOperation = 'source-over';
        }
   
        if(this.patchCanvas){
            this.fullGifCanvasCtx?.drawImage(this.patchCanvas, dims.left, dims.top);
        }

        let imageData;
        if(this.fullGifCanvas){
            imageData = this.fullGifCanvasCtx?.getImageData(0, 0, this.fullGifCanvas.width, this.fullGifCanvas.height);
        }
        
        return imageData
      }

      putFrame = () => {
        // lets not render disposal method 3 as it is not getting handled well
        if (this.frames[this.currentFrameIndex]?.disposalType === 3) {
          return;
        }
        if (this.currentFrameIndex > this.frames.length - 1) {
          this.currentFrameIndex = 0;
        }
   
        if (this.currentFrameIndex < 0) {
          this.currentFrameIndex = 0;
        }
   
        const prevFrame = this.frames[this.currentFrameIndex - 1];
        if (prevFrame?.disposalType === 2) {
          const {
            width, height, left, top,
          } = prevFrame.dims;
          this.fullGifCanvasCtx?.clearRect(left, top, width, height);
        }
        const imageData = this.drawPatch();
   
        if (this.onFrameChangeListener !== null) {
          this.onFrameChangeListener({
            currentIndex: this.currentFrameIndex,
            data: imageData,
            totalFrames: this.frames.length,
          });
        }
      }

      requestTimeout = (fn: ()=> void, delay: number) => {
        const start = new Date().getTime();
        let rqstAnimation: number;
    
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
        this.currentFrameIndex += 1;
   
        if (!this.stopRenderingGif && this.playing) {
          if (this.frames.length === this.currentFrameIndex) {
            this.completeLoop();
          }
          this.requestTimeout(this.doStep, 100);
        }
      };

      initandParse = () => {
        this.frameImageData = undefined;
        if (window.OffscreenCanvas) {
          this.patchCanvas = new OffscreenCanvas(this.canvasElement?.width || 0, this.canvasElement?.height || 0);
          this.fullGifCanvas = new OffscreenCanvas(this.canvasElement?.width || 0, this.canvasElement?.height || 0);
        } else {
          this.patchCanvas = document.createElement('canvas');
          this.patchCanvas.width = this.canvasElement?.width || 0;
          this.patchCanvas.height = this.canvasElement?.height || 0;
   
          this.fullGifCanvas = document.createElement('canvas');
          this.fullGifCanvas.width = this.canvasElement?.width || 0;
          this.fullGifCanvas.height = this.canvasElement?.height || 0;
        }
        if(this.patchCanvas){
            this.patchCanvasCtx = this.patchCanvas.getContext('2d');
        }
        if(this.fullGifCanvas){
            this.fullGifCanvasCtx = this.fullGifCanvas.getContext('2d');
        }
        this.stopRenderingGif = false;
        this.doStep();
      }

      load_url = (src: string, callback: () => void ) => {
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
    
      load = (callback: ()=> void) => this.load_url(this.gifSource, callback)
}

export default GIFParser;