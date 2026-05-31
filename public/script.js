const socket = io();

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WIDTH = 1500;
const HEIGHT = 1500;

let scale = 10;
let offsetX = 0;
let offsetY = 0;

let isDrawing = false;
let isPanning = false;

let currentColor = "#FF0000";

let localCanvas = new Map();

// resize
function resize() {
  canvas.width = window.innerWidth - 120;
  canvas.height = window.innerHeight;
  requestDraw();
}
window.addEventListener("resize", resize);

// optimisé
let needDraw = false;

function requestDraw() {
  if (needDraw) return;
  needDraw = true;

  requestAnimationFrame(() => {
    draw();
    needDraw = false;
  });
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  const startX = Math.max(0, Math.floor(-offsetX / scale));
  const startY = Math.max(0, Math.floor(-offsetY / scale));
  const endX = Math.min(WIDTH, Math.ceil((canvas.width - offsetX) / scale));
  const endY = Math.min(HEIGHT, Math.ceil((canvas.height - offsetY) / scale));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const color = localCanvas.get(`${x},${y}`);
      if (!color) continue;

      ctx.fillStyle = color;
      ctx.fillRect(x*scale, y*scale, scale, scale);
    }
  }

  ctx.restore();
}

// coords
function screenToCanvas(mx,my){
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor((mx-rect.left-offsetX)/scale),
    y: Math.floor((my-rect.top-offsetY)/scale)
  };
}

// draw
function drawPixel(x,y){
  if (x<0||y<0||x>=WIDTH||y>=HEIGHT) return;

  localCanvas.set(`${x},${y}`, currentColor);

  socket.emit("draw-pixel", {x,y,color:currentColor});

  requestDraw();
}

// events
canvas.addEventListener("mousedown",(e)=>{
  if (e.button===0){
    isDrawing=true;
    const p = screenToCanvas(e.clientX,e.clientY);
    drawPixel(p.x,p.y);
  }
  if (e.button===2){
    isPanning=true;
  }
});

canvas.addEventListener("mouseup",()=>{
  isDrawing=false;
  isPanning=false;
});

canvas.addEventListener("mousemove",(e)=>{
  if (isDrawing){
    const p = screenToCanvas(e.clientX,e.clientY);
    drawPixel(p.x,p.y);
  }

  if (isPanning){
    offsetX += e.movementX;
    offsetY += e.movementY;
    requestDraw();
  }
});

canvas.addEventListener("contextmenu",e=>e.preventDefault());

// palette
document.getElementById("zoomIn").onclick=()=>{
  scale=Math.min(scale+1,20);
  requestDraw();
};

document.getElementById("zoomOut").onclick=()=>{
  scale=Math.max(scale-1,1);
  requestDraw();
};

// palette
document.querySelectorAll(".color-btn").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".selected").forEach(b=>b.classList.remove("selected"));
    btn.classList.add("selected");
    currentColor=btn.dataset.color;
  };
});

// socket
socket.on("canvas-data",(data)=>{
  localCanvas = new Map(data);
  requestDraw();
});

socket.on("pixel-updated",({x,y,color})=>{
  localCanvas.set(`${x},${y}`,color);
  requestDraw();
});

resize();
