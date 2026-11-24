import * as THREE from 'three';

let sharedGlowTexture: THREE.CanvasTexture | null = null;
let sharedContactShadowTexture: THREE.CanvasTexture | null = null;
let sharedTileTexture: THREE.CanvasTexture | null = null;
let sharedWoodTexture: THREE.CanvasTexture | null = null;
let sharedMoonTexture: THREE.CanvasTexture | null = null;

export function getGlowTexture(): THREE.CanvasTexture {
  if (sharedGlowTexture) return sharedGlowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 255, 240, 1)');
  grad.addColorStop(0.25, 'rgba(255, 224, 130, 0.85)');
  grad.addColorStop(0.6, 'rgba(255, 165, 80, 0.28)');
  grad.addColorStop(1, 'rgba(255, 140, 60, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  sharedGlowTexture = new THREE.CanvasTexture(canvas);
  sharedGlowTexture.needsUpdate = true;
  return sharedGlowTexture;
}

export function createGlowSprite(
  color = '#ffd27d',
  scale = 1.0,
  opacity = 0.85,
  fog = true
): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedContactShadowTexture) return sharedContactShadowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(8, 6, 18, 0.58)');
  grad.addColorStop(0.55, 'rgba(8, 6, 18, 0.24)');
  grad.addColorStop(1, 'rgba(8, 6, 18, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  sharedContactShadowTexture = new THREE.CanvasTexture(canvas);
  sharedContactShadowTexture.needsUpdate = true;
  return sharedContactShadowTexture;
}

export function createGroundGlowDisc(
  color = '#ffc86b',
  radius = 2.0,
  opacity = 0.22
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  return new THREE.Mesh(geo, mat);
}

export function createCourtyardTileTexture(repeatX = 12, repeatY = 10): THREE.CanvasTexture {
  if (!sharedTileTexture) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3b334e';
    ctx.fillRect(0, 0, size, size);

    const cells = 4;
    const step = size / cells;
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const shade = ((r * 7 + c * 13) % 5) - 2;
        const baseR = 64 + shade * 3;
        const baseG = 54 + shade * 3;
        const baseB = 84 + shade * 4;
        ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
        ctx.fillRect(c * step + 3, r * step + 3, step - 6, step - 6);

        ctx.strokeStyle = 'rgba(255, 224, 178, 0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * step + 4, r * step + 4, step - 8, step - 8);
      }
    }

    sharedTileTexture = new THREE.CanvasTexture(canvas);
    sharedTileTexture.wrapS = THREE.RepeatWrapping;
    sharedTileTexture.wrapT = THREE.RepeatWrapping;
    sharedTileTexture.colorSpace = THREE.SRGBColorSpace;
  }
  const tex = sharedTileTexture.clone();
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function createWoodPlankTexture(repeatX = 2, repeatY = 2): THREE.CanvasTexture {
  if (!sharedWoodTexture) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8b5736';
    ctx.fillRect(0, 0, size, size);

    const planks = 4;
    const h = size / planks;
    for (let i = 0; i < planks; i++) {
      const y = i * h;
      const tone = (i % 2 === 0 ? 8 : -6);
      ctx.fillStyle = `rgb(${152 + tone}, ${97 + tone}, ${61 + Math.round(tone * 0.6)})`;
      ctx.fillRect(0, y + 2, size, h - 4);

      // Subtle wood grain streaks
      ctx.strokeStyle = 'rgba(65, 34, 18, 0.25)';
      ctx.lineWidth = 2;
      for (let g = 0; g < 5; g++) {
        const gy = y + 8 + g * 10;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.33, gy + 2, size * 0.66, gy - 2, size, gy);
        ctx.stroke();
      }
    }

    sharedWoodTexture = new THREE.CanvasTexture(canvas);
    sharedWoodTexture.wrapS = THREE.RepeatWrapping;
    sharedWoodTexture.wrapT = THREE.RepeatWrapping;
    sharedWoodTexture.colorSpace = THREE.SRGBColorSpace;
  }
  const tex = sharedWoodTexture.clone();
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function createMoonTexture(): THREE.CanvasTexture {
  if (sharedMoonTexture) return sharedMoonTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size * 0.42, size * 0.4, 20, size / 2, size / 2, size * 0.55);
  grad.addColorStop(0, '#fffdf2');
  grad.addColorStop(0.65, '#fff0be');
  grad.addColorStop(1, '#f3d284');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Painterly soft craters
  const craters: [number, number, number, number][] = [
    [90, 95, 26, 0.08],
    [155, 115, 34, 0.07],
    [118, 165, 20, 0.09],
    [175, 170, 14, 0.06],
    [72, 150, 16, 0.06]
  ];
  for (const [cx, cy, r, a] of craters) {
    ctx.fillStyle = `rgba(195, 154, 86, ${a})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  sharedMoonTexture = new THREE.CanvasTexture(canvas);
  sharedMoonTexture.colorSpace = THREE.SRGBColorSpace;
  sharedMoonTexture.needsUpdate = true;
  return sharedMoonTexture;
}

export function createSignTexture(
  title: string,
  subtitle: string,
  bgColor = '#2c1842',
  borderColor = '#ffd573'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 176;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const r = 24;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, r);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 232, 168, 0.45)';
    ctx.beginPath();
    ctx.roundRect(18, 18, canvas.width - 36, canvas.height - 36, 16);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffe599';
    ctx.font = 'bold 46px "Mali", "Prompt", sans-serif';
    ctx.fillText(title, canvas.width / 2, 68, canvas.width - 64);

    ctx.fillStyle = '#ffe3f1';
    ctx.font = '500 26px "Prompt", "Mali", sans-serif';
    ctx.fillText(subtitle, canvas.width / 2, 122, canvas.width - 64);

    tex.needsUpdate = true;
  };

  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }
  return tex;
}

export function createNamePillTexture(name: string, accent = '#ff9ec6'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 288;
  canvas.height = 84;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer soft gold halo rim so real players stand out clearly from NPCs
    ctx.fillStyle = 'rgba(22, 18, 48, 0.9)';
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 30);
    ctx.fill();

    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#ffd573';
    ctx.stroke();

    ctx.lineWidth = 2.2;
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.roundRect(15, 15, canvas.width - 30, canvas.height - 30, 25);
    ctx.stroke();

    const cleanName = name.slice(0, 12) || 'เพื่อนรัก';
    ctx.font = 'bold 28px "Mali", "Prompt", sans-serif';
    const starText = '★ ';
    const starWidth = ctx.measureText(starText).width;
    const nameWidth = Math.min(ctx.measureText(cleanName).width, canvas.width - 52 - starWidth);
    const totalWidth = starWidth + nameWidth;
    const startX = canvas.width / 2 - totalWidth / 2;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd573';
    ctx.fillText(starText, startX, canvas.height / 2 + 1);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(cleanName, startX + starWidth, canvas.height / 2 + 1, canvas.width - 52 - starWidth);
    tex.needsUpdate = true;
  };

  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }
  return tex;
}

export function createNpcTagTexture(roleLabel: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 58;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(22, 24, 38, 0.62)';
    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 20);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(176, 184, 210, 0.45)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c7cde0';
    ctx.font = '500 22px "Prompt", "Mali", sans-serif';
    ctx.fillText(`NPC • ${roleLabel.slice(0, 14)}`, canvas.width / 2, canvas.height / 2 + 1, canvas.width - 28);
    tex.needsUpdate = true;
  };

  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }
  return tex;
}

export function createNpcBubbleTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 84;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(28, 24, 42, 0.78)';
    ctx.beginPath();
    ctx.roundRect(10, 8, canvas.width - 20, 56, 18);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 9, 63);
    ctx.lineTo(canvas.width / 2 + 9, 63);
    ctx.lineTo(canvas.width / 2, 77);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 216, 140, 0.45)';
    ctx.beginPath();
    ctx.roundRect(10, 8, canvas.width - 20, 56, 18);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5e8cc';
    ctx.font = '500 22px "Prompt", "Mali", sans-serif';
    const clipped = text.length > 24 ? `${text.slice(0, 23)}…` : text;
    ctx.fillText(clipped, canvas.width / 2, 37, canvas.width - 32);
    tex.needsUpdate = true;
  };

  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }
  return tex;
}

export function createSpeechBubbleTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 136;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 250, 244, 0.96)';
    ctx.beginPath();
    ctx.roundRect(14, 10, canvas.width - 28, 92, 24);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 14, 100);
    ctx.lineTo(canvas.width / 2 + 14, 100);
    ctx.lineTo(canvas.width / 2, 124);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff9ec6';
    ctx.beginPath();
    ctx.roundRect(14, 10, canvas.width - 28, 92, 24);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2d1e38';
    ctx.font = 'bold 26px "Mali", "Prompt", sans-serif';
    const clipped = text.length > 26 ? `${text.slice(0, 25)}…` : text;
    ctx.fillText(clipped, canvas.width / 2, 57);
    tex.needsUpdate = true;
  };

  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }
  return tex;
}

export function createRectangularWishBoxesTexture(
  entries: { name: string; wish: string }[]
): THREE.CanvasTexture {
  const isTwo = entries.length >= 2;
  const canvas = document.createElement('canvas');
  canvas.width = isTwo ? 760 : 420;
  canvas.height = 176;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pad = 10;
    const gap = 16;
    const boxW = isTwo ? (canvas.width - pad * 2 - gap) / 2 : canvas.width - pad * 2;
    const boxH = canvas.height - pad * 2;

    entries.slice(0, 2).forEach((entry, idx) => {
      const bx = pad + idx * (boxW + gap);
      const by = pad;

      // Crisp rectangular card with warm gold border
      ctx.fillStyle = 'rgba(18, 20, 48, 0.9)';
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 10);
      ctx.fill();

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffd573';
      ctx.stroke();

      // Header bar divider
      ctx.fillStyle = 'rgba(255, 213, 115, 0.16)';
      ctx.fillRect(bx + 3, by + 3, boxW - 6, 46);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ffd573';
      ctx.font = 'bold 24px "Mali", "Prompt", sans-serif';
      ctx.fillText(`🪷 ${entry.name.slice(0, 12)}`, bx + boxW / 2, by + 27);

      ctx.fillStyle = '#fff8fb';
      ctx.font = '500 22px "Prompt", "Mali", sans-serif';
      const raw = entry.wish.trim() || 'ขอให้มีความสุขสมหวัง';
      if (raw.length <= 20) {
        ctx.fillText(raw, bx + boxW / 2, by + 100);
      } else {
        const line1 = raw.slice(0, 19);
        const line2 = raw.length > 38 ? `${raw.slice(19, 37)}…` : raw.slice(19);
        ctx.fillText(line1, bx + boxW / 2, by + 84);
        ctx.fillText(line2, bx + boxW / 2, by + 118);
      }
    });

    tex.needsUpdate = true;
  };

  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }
  return tex;
}

export function createWishLabelTexture(wishText: string, namesLabel: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 152;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(22, 21, 52, 0.84)';
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 26);
    ctx.fill();

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffd573';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffd573';
    ctx.font = 'bold 24px "Mali", "Prompt", sans-serif';
    ctx.fillText(`✨ ${namesLabel} ✨`, canvas.width / 2, 46);

    ctx.fillStyle = '#fff5fa';
    ctx.font = '500 25px "Prompt", "Mali", sans-serif';
    const clipped = wishText.length > 34 ? `${wishText.slice(0, 33)}…` : wishText;
    ctx.fillText(clipped, canvas.width / 2, 98);
    tex.needsUpdate = true;
  };

  draw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(draw).catch(() => {});
  }
  return tex;
}
