// const image = new Image();
// image.src = "image.jpg";

let gl;
let brightnessLocation;
let copyVideo = false;
let texture;

window.onload = function () {

    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    // canvas.width = image.naturalWidth;
    // canvas.height = image.naturalHeight;

    gl = canvas.getContext("webgl");

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.clearColor(1.0, 0.8, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vertShaderSource = `
    attribute vec2 position;

    varying vec2 texCoords;

    void main() {
        texCoords = (position + 1.0) / 2.0;
        texCoords.y = 1.0 - texCoords.y; // flip image vertically
        gl_Position = vec4(position, 0, 1.0);
    }
`;

    const fragShaderSource = `
    precision highp float;

    varying vec2 texCoords;

    uniform sampler2D textureSampler;

    uniform float warmth;
    uniform float brightness;

    void main() {
        vec4 color = texture2D(textureSampler, texCoords);

        color.r += warmth;
        color.b -= warmth;

        color.rgb += brightness;
                
        gl_FragColor = color;
    }
`;

    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertShader, vertShaderSource);
    gl.shaderSource(fragShader, fragShaderSource);

    gl.compileShader(vertShader);
    gl.compileShader(fragShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([
        -1, -1,
        -1, 1,
        1, 1,

        -1, -1,
        1, 1,
        1, -1
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');

    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(positionLocation);

    // create a texture
    texture = initTexture(gl);

    // pass warmth attribute to shader
    const warmthLocation = gl.getUniformLocation(program, "warmth");
    gl.uniform1f(warmthLocation, 0.2);

    // pass brightness attribute to shader
    brightnessLocation = gl.getUniformLocation(program, "brightness");
    gl.uniform1f(brightnessLocation, 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    render();
}

const initTexture = gl => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because video has to be download over the internet
    // they might take a moment until it's ready so
    // put a single pixel in the texture so we can
    // use it immediately.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    // Turn off mips and set  wrapping to clamp to edge so it
    // will work regardless of the dimensions of the video.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture;
}

const updateTexture = (gl, texture, video) => {
    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        srcFormat, srcType, video);
}

const changeBrightness = (gl, brightnessLocation, value) => {
    gl.uniform1f(brightnessLocation, value);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

const range = document.getElementById("range");
const rangeVal = document.getElementById("rangeVal");

range.addEventListener("input", event => {
    const { value } = event.target;
    rangeVal.innerText = value;

    changeBrightness(gl, brightnessLocation, value);
});

const setupVideo = url => {
    const video = document.createElement('video');

    let playing = false;
    let timeupdate = false;

    video.autoplay = true;
    video.muted = true;
    video.loop = true;

    // Waiting for these 2 events ensures
    // there is data in the video

    video.addEventListener('playing', function () {
        playing = true;
        checkReady();
    }, true);

    video.addEventListener('timeupdate', function () {
        timeupdate = true;
        checkReady();
    }, true);

    video.src = url;
    video.play();

    function checkReady() {
        if (playing && timeupdate) {
            copyVideo = true;
        }
    }

    return video;
};

const video = setupVideo('sample.mp4');

const render = () => {
    if (copyVideo) {
        updateTexture(gl, texture, video);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.drawArrays(gl.TRIANGLES, 0, 6);


    requestAnimationFrame(render);
}