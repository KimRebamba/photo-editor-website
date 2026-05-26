
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function toast(msg, icon, color) {
  icon = icon || 'fa-check-circle';
  color = color || '#4ade80';
  var box = document.getElementById('toastBox');
  var el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<i class="fas ' + icon + '" style="color:' + color + '"></i> ' + msg;
  box.appendChild(el);
  setTimeout(function() { el.remove(); }, 3000);
}


var S = {
  origData: null,      // ImageData of the original image
  procData: null,      // ImageData after processing
  loaded: false,
  processing: false,
  compare: true,      
  comparePos: 0.5,    
  zoom: 1,

  p: {
    temp: 15, tint: 5, sat: -8, vib: 10,
    exp: 5, con: -10, hi: -15, sh: 20, vig: 20,
    grain: 12, sharp: 8, skin: 10
  }
};

var canvas = document.getElementById('mainCanvas');
var ctx = canvas.getContext('2d', { willReadFrequently: true });
var canvasWrap = document.getElementById('canvasWrap');
var placeholder = document.getElementById('placeholderBox');
var fileInput = document.getElementById('fileInput');
var previewBar = document.getElementById('previewBar');
var compareOverlay = document.getElementById('compareOverlay');
var compareLine = document.getElementById('compareLine');
var compareHandle = document.getElementById('compareHandle');

var sliders = {
  sTemp:    { key: 'temp',    vid: 'vTemp' },
  sTint:    { key: 'tint',    vid: 'vTint' },
  sSat:     { key: 'sat',     vid: 'vSat' },
  sVib:     { key: 'vib',     vid: 'vVib' },
  sExp:     { key: 'exp',     vid: 'vExp' },
  sCon:     { key: 'con',     vid: 'vCon' },
  sHi:      { key: 'hi',      vid: 'vHi' },
  sSh:      { key: 'sh',      vid: 'vSh' },
  sVig:     { key: 'vig',     vid: 'vVig' },
  sGrain:   { key: 'grain',   vid: 'vGrain' },
  sSharp:   { key: 'sharp',   vid: 'vSharp' },
  sSkin:    { key: 'skin',    vid: 'vSkin' }
};

Object.keys(sliders).forEach(function(id) {
  var el = document.getElementById(id);
  var info = sliders[id];
  el.addEventListener('input', function() {
    var val = parseInt(el.value);
    S.p[info.key] = val;
    document.getElementById(info.vid).textContent = val;
    scheduleProcess();
  });
});

//  presets 
var presets = {
  natural: { temp:15, tint:5, sat:-8, vib:10, exp:5, con:-10, hi:-15, sh:20, vig:20, grain:12, sharp:8, skin:10 },
  film:    { temp:22, tint:8, sat:-18, vib:5, exp:-2, con:5, hi:-20, sh:15, vig:40, grain:30, sharp:-5, skin:5 },
  soft:    { temp:30, tint:10, sat:-5, vib:15, exp:8, con:-18, hi:-10, sh:25, vig:15, grain:5, sharp:-10, skin:20 },
  studio:  { temp:5, tint:0, sat:-3, vib:8, exp:3, con:8, hi:-25, sh:15, vig:10, grain:3, sharp:20, skin:8 }
};

document.querySelectorAll('.preset-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.preset-btn').forEach(function(b) { b.classList.remove('on'); });
    btn.classList.add('on');
    applyPreset(presets[btn.dataset.preset]);
    toast('Applied "' + btn.textContent + '" preset', 'fa-wand-magic-sparkles', '#ffffff');
  });
});

function applyPreset(pr) {
  Object.keys(pr).forEach(function(k) {
    S.p[k] = pr[k];
  
    Object.keys(sliders).forEach(function(sid) {
      if (sliders[sid].key === k) {
        document.getElementById(sid).value = pr[k];
        document.getElementById(sliders[sid].vid).textContent = pr[k];
      }
    });
  });
  scheduleProcess();
}

document.querySelectorAll('.sec-head').forEach(function(head) {
  head.addEventListener('click', function() {
    var sec = head.dataset.sec;
    var body = document.querySelector('.sec-body[data-sec="' + sec + '"]');
    var chev = document.querySelector('.chevron[data-chev="' + sec + '"]');
    if (body.classList.contains('hidden')) {
      body.classList.remove('hidden');
      chev.classList.remove('up');
    } else {
      body.classList.add('hidden');
      chev.classList.add('up');
    }
  });
});


placeholder.addEventListener('click', function() { fileInput.click(); });

document.getElementById('btnUpload').addEventListener('click', function() { fileInput.click(); });

fileInput.addEventListener('change', function(e) {
  if (e.target.files.length > 0) loadFile(e.target.files[0]);
});


placeholder.addEventListener('dragover', function(e) {
  e.preventDefault();
  placeholder.style.borderColor = 'var(--accent)';
});
placeholder.addEventListener('dragleave', function() {
  placeholder.style.borderColor = '';
});
placeholder.addEventListener('drop', function(e) {
  e.preventDefault();
  placeholder.style.borderColor = '';
  if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
});

function loadFile(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      setupCanvas(img);
      toast('Image loaded', 'fa-check-circle', '#4ade80');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

(function() {
  var url = 'https://z-cdn-media.chatglm.cn/files/8b732b43-1841-4104-bf48-e008b7100bbd.png?auth_key=1879466079-4b05f387dc514b43b66b06c14c8baba8-0-06b59c6a245990322668f01569f20682';
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    setupCanvas(img);
  };
  img.onerror = function() {
  
    console.log('Could not auto-load image, upload manually.');
  };
  img.src = url;
})();

function setupCanvas(img) {
 
  var maxW = 1100, maxH = 850;
  var w = img.naturalWidth || img.width;
  var h = img.naturalHeight || img.height;
  if (w > maxW) { h = h * maxW / w; w = maxW; }
  if (h > maxH) { w = w * maxH / h; h = maxH; }
  w = Math.round(w);
  h = Math.round(h);

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);


  S.origData = ctx.getImageData(0, 0, w, h);
  S.loaded = true;

  placeholder.style.display = 'none';
  canvasWrap.style.display = 'block';
  previewBar.style.display = 'flex';

  processImage();
}

// for image processing
var processTimer = null;
function scheduleProcess() {
  clearTimeout(processTimer);
  processTimer = setTimeout(processImage, 40);
}

function processImage() {
  if (!S.loaded || S.processing) return;
  S.processing = true;

  var src = S.origData;
  var w = src.width, h = src.height;
  var p = S.p;

  var tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  var tc = tmp.getContext('2d', { willReadFrequently: true });

  var dst = tc.createImageData(w, h);
  var sd = src.data;
  var dd = dst.data;

  var exposure  = 1.0 + p.exp / 100;
  var contrast  = 1.0 + p.con / 100;
  var satur     = 1.0 + p.sat / 100;
  var hiShift   = p.hi / 100;   // negative = bring down highlights
  var shShift   = p.sh / 100;   // positive = lift shadows
  var tempShift = p.temp / 100;  // positive = warmer
  var tintShift = p.tint / 100;  // positive = magenta
  var vibShift  = p.vib / 100;

  // loop for each pixel
  for (var i = 0; i < sd.length; i += 4) {
    var r = sd[i];
    var g = sd[i + 1];
    var b = sd[i + 2];

    // exposure 
    r *= exposure;
    g *= exposure;
    b *= exposure;

    // white balance (temp + tint)
    if (tempShift > 0) {
      r += tempShift * 40;
      b -= tempShift * 25;
    } else {
      b -= tempShift * 40;
      r += tempShift * 25;
    }
    g -= tintShift * 15;
    r += tintShift * 8;
    b += tintShift * 8;

    // contrast 
    r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
    g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
    b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

    //  highlights & shadows 
    var lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    if (lum > 0.5) {
      var f = (lum - 0.5) * 2;
      var cut = hiShift * f * 60;
      r -= cut; g -= cut; b -= cut;
    } else {
      var f2 = (0.5 - lum) * 2;
      var lift = shShift * f2 * 50;
      r += lift; g += lift; b += lift;
    }

    // saturation +&vibrance
    var gray = 0.299 * r + 0.587 * g + 0.114 * b;
    var curSat = Math.max(Math.abs(r - gray), Math.abs(g - gray), Math.abs(b - gray)) / 128;
    var vibFactor = vibShift * (1 - curSat) * 0.5;
    var totalSat = satur - 1 + vibFactor;

    r = gray + (r - gray) * (1 + totalSat);
    g = gray + (g - gray) * (1 + totalSat);
    b = gray + (b - gray) * (1 + totalSat);

    dd[i]     = clamp(Math.round(r), 0, 255);
    dd[i + 1] = clamp(Math.round(g), 0, 255);
    dd[i + 2] = clamp(Math.round(b), 0, 255);
    dd[i + 3] = sd[i + 3];
  }

  tc.putImageData(dst, 0, 0);

  // vignette 
  if (p.vig > 0) {
    var str = p.vig / 100;
    var cx = w / 2, cy = h / 2;
    var maxR = Math.sqrt(cx * cx + cy * cy);
    var grad = tc.createRadialGradient(cx, cy, maxR * 0.4, cx, cy, maxR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,' + (str * 0.7) + ')');
    tc.fillStyle = grad;
    tc.fillRect(0, 0, w, h);
  }

  // random noise
  if (p.grain > 0) {
    var gd = tc.getImageData(0, 0, w, h);
    var gdd = gd.data;
    var amt = p.grain * 0.8;
    for (var j = 0; j < gdd.length; j += 4) {
      var n = (Math.random() - 0.5) * amt;
      gdd[j]     = clamp(gdd[j] + n, 0, 255);
      gdd[j + 1] = clamp(gdd[j + 1] + n, 0, 255);
      gdd[j + 2] = clamp(gdd[j + 2] + n, 0, 255);
    }
    tc.putImageData(gd, 0, 0);
  }

  // skin softening (blur skin-tone pixels only) 
  if (p.skin > 0) {
    var skinD = tc.getImageData(0, 0, w, h);
    var sdd = skinD.data;
    var rad = Math.round(p.skin / 8);
    if (rad > 0) {
      var cp = new Uint8ClampedArray(sdd); 
      for (var y = rad; y < h - rad; y++) {
        for (var x = rad; x < w - rad; x++) {
          var idx = (y * w + x) * 4;
          var pr = cp[idx], pg = cp[idx+1], pb = cp[idx+2];
    
          var isSkin = (pr > 80 && pg > 50 && pb > 30) &&
                       (pr > pg) && (pr > pb) &&
                       (Math.abs(pr - pg) > 10) &&
                       (pr - pb > 15);
          if (isSkin) {
            var sr = 0, sg = 0, sb = 0, cnt = 0;
            for (var dy = -rad; dy <= rad; dy++) {
              for (var dx = -rad; dx <= rad; dx++) {
                var ni = ((y + dy) * w + (x + dx)) * 4;
                sr += cp[ni]; sg += cp[ni+1]; sb += cp[ni+2]; cnt++;
              }
            }
            var blend = p.skin / 60;
            sdd[idx]     = Math.round(cp[idx]     * (1-blend) + (sr/cnt) * blend);
            sdd[idx + 1] = Math.round(cp[idx + 1] * (1-blend) + (sg/cnt) * blend);
            sdd[idx + 2] = Math.round(cp[idx + 2] * (1-blend) + (sb/cnt) * blend);
          }
        }
      }
      tc.putImageData(skinD, 0, 0);
    }
  }

  // save processed data
  S.procData = tc.getImageData(0, 0, w, h);
  drawCompare();

  S.processing = false;
}


function drawCompare() {
  if (!S.origData || !S.procData) return;

  var w = canvas.width, h = canvas.height;

  ctx.putImageData(S.procData, 0, 0);

  if (S.compare) {
    var splitX = Math.round(w * S.comparePos);
    if (splitX > 0) {
      var mixed = ctx.getImageData(0, 0, w, h);
      var md = mixed.data;
      var od = S.origData.data;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < splitX; x++) {
          var i = (y * w + x) * 4;
          md[i]     = od[i];
          md[i + 1] = od[i + 1];
          md[i + 2] = od[i + 2];
          md[i + 3] = od[i + 3];
        }
      }
      ctx.putImageData(mixed, 0, 0);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.89)';
      ctx.fillRect(splitX - 1, 0, 2, h);
    }
  }

  updateSliderUI();
}

function updateSliderUI() {
  if (!S.compare) {
    compareLine.style.display = 'none';
    compareHandle.style.display = 'none';
    return;
  }
  compareLine.style.display = 'block';
  compareHandle.style.display = 'flex';
  var pct = S.comparePos * 100;
  compareLine.style.left = pct + '%';
  compareHandle.style.left = pct + '%';
}

// compare slider 
var dragging = false;

compareOverlay.addEventListener('mousedown', function(e) {
  if (!S.compare) return;
  dragging = true;
  updatePos(e);
});
document.addEventListener('mousemove', function(e) {
  if (dragging) updatePos(e);
});
document.addEventListener('mouseup', function() { dragging = false; });


compareOverlay.addEventListener('touchstart', function(e) {
  if (!S.compare) return;
  dragging = true;
  updatePos(e.touches[0]);
  e.preventDefault();
});
document.addEventListener('touchmove', function(e) {
  if (dragging) updatePos(e.touches[0]);
});
document.addEventListener('touchend', function() { dragging = false; });

function updatePos(e) {
  var rect = compareOverlay.getBoundingClientRect();
  S.comparePos = clamp((e.clientX - rect.left) / rect.width, 0.02, 0.98);
  drawCompare();
}



document.getElementById('btnReset').addEventListener('click', function() {
  applyPreset(presets.natural);
  document.querySelectorAll('.preset-btn').forEach(function(b) { b.classList.remove('on'); });
  document.querySelector('[data-preset="natural"]').classList.add('on');
  toast('Reset to default', 'fa-rotate-left', '#7f828e');
});


document.getElementById('btnExport').addEventListener('click', function() {
  if (!S.loaded) {
    toast('Load an image first', 'fa-exclamation-triangle', '#fbbf24');
    return;
  }

  var wasCompare = S.compare;
  S.compare = false;
  ctx.putImageData(S.procData, 0, 0);

  var link = document.createElement('a');
  link.download = 'output.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  S.compare = wasCompare;
  drawCompare();
  toast('Image exported', 'fa-download', '#4ade80');
});


document.getElementById('btnCompare').addEventListener('click', function() {
  S.compare = !S.compare;
  drawCompare();
  this.style.borderColor = S.compare ? 'var(--accent)' : '';
  this.style.color = S.compare ? 'var(--accent)' : '';
});


document.getElementById('btnZIn').addEventListener('click', function() {
  S.zoom = Math.min(3, S.zoom + 0.25);
  applyZoom();
});
document.getElementById('btnZOut').addEventListener('click', function() {
  S.zoom = Math.max(0.25, S.zoom - 0.25);
  applyZoom();
});

function applyZoom() {
  canvas.style.transform = 'scale(' + S.zoom + ')';
  canvas.style.transformOrigin = 'center center';
  document.getElementById('zoomLabel').textContent = Math.round(S.zoom * 100) + '%';
}

//shortcut
document.addEventListener('keydown', function(e) {
  if (e.key === 'c' || e.key === 'C') {
    S.compare = !S.compare;
    drawCompare();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('btnExport').click();
  }
});