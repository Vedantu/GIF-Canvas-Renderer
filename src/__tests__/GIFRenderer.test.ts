/**
 * @jest-environment jsdom
 */
 const fs = require('fs');

 import 'jest-canvas-mock';
import { parseGIF, decompressFrames } from 'gifuct-js';

import GIFRenderer from '../index'

test("test all frames of the gif is parsed", () => {
    const gifRendererObject = new GIFRenderer({
        gifSource: './some-gif.gif',
        // @ts-ignore
        canvasElement: {width: 500, height: 100},
        delay: 100,
        useRequestAnimationFrame : false,
        runGifOnce: true, // will run only and test the total frames parsed
    });

    const data = fs.readFileSync('./gif/some-gif.gif')

    const parsedData = parseGIF(data);

    gifRendererObject.validateAndFix(parsedData);

    gifRendererObject.frames = decompressFrames(parsedData, true);
    gifRendererObject.initandParse();
    
    // expecting currentFrameIndex === frames.length 
    // so all the frames are parsed

    expect(gifRendererObject.currentFrameIndex).toEqual(gifRendererObject.frames.length)
});