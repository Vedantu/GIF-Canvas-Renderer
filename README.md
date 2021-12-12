# GIF Canvas Renderer

A simple GIF renderer on canvas

We needed an efficient GIF renderer on canvas for our live classroom at Vedantu[https://www.vedantu.com/]
There are some libraries like libgif[https://github.com/buzzfeed/libgif-js] but it has many memory leaks and we found it very inefficient.

we came across an amazing GIF Parser by Matt Way[https://github.com/matt-way] gifuct-js[https://github.com/matt-way/gifuct-js]

It is amazingly efficient and parses the next frame based on what is changed from previous one hence less pixel change on canvas at run time.

### Usage

_Installation:_

    npm install gif-canvas-renderer

-_html_

    <canvas id="canvas-element"></canvas>

-_gifRenderer_

    import GIFRenderer from gif-canvas-renderer

    const gifObject = new GIFRenderer({
        gifSource: gifURL,
        canvasElement: document.getElementById('canvas-element'),
        renderGif: true,
        on_frame_change: (imageData) => {
          // find canvas element
          const canvasElm = document.getElementById('canvas-element')
          const ctx = canvas.getContext('2d');
          // render the imagedata on canvas
          ctx.putImageData(imageData.data, 20, 20);
        },
      });

      //call load() to start parsing

      gifObject.load(()=>{
          //callback
          console.log('do something')
      })
 

