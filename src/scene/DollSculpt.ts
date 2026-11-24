import * as THREE from 'three';
import type { CharacterConfig } from '../types';

type Surface = (u: number, v: number) => THREE.Vector3;

function sculpt(columns: number, rows: number, surface: Surface) {
  const geometry = new THREE.PlaneGeometry(1, 1, columns, rows);
  const points = geometry.attributes.position;
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const p = surface(col / columns, row / rows);
      points.setXYZ(row * (columns + 1) + col, p.x, p.y, p.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function sweptLock(points: number[][], width: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x,y,z]) => new THREE.Vector3(x,y,z)));
  const rows = 32;
  const frames = curve.computeFrenetFrames(rows, false);
  const geometry = sculpt(16, rows, (u, v) => {
    const row = Math.round(v * rows);
    const a = u * Math.PI * 2;
    const radius = width * (0.014 + Math.sin(Math.PI * v) ** 0.64) * (1 - 0.34*v);
    return curve.getPointAt(v)
      .addScaledVector(frames.normals[row], radius * Math.cos(a))
      .addScaledVector(frames.binormals[row], radius * Math.sin(a));
  });
  return new THREE.Mesh(geometry, material);
}

export function sculptHair(config: CharacterConfig) {
  const group = new THREE.Group();
  const color = new THREE.Color(config.hairColor);
  const base = new THREE.MeshStandardMaterial({color, roughness: 0.56, side: THREE.DoubleSide});
  const strand = base.clone();
  strand.color.lerp(new THREE.Color('#a17665'), 0.14);
  const style = config.hairStyle;
  const edge = (a: number) => {
    const back = (1 - Math.cos(a)) / 2;
    if (style === 'french_crop') return 1.13 + 0.91 * back;
    if (style === 'curtain_part') return 0.91 + 1.46 * Math.pow(back, 0.72);
    if (style === 'soft_mullet') return 1.06 + 1.5 * back;
    if (style === 'swept_quiff') return 0.83 + 1.35 * back;
    return 1.04 + 1.33 * Math.pow(back, 0.78) + Math.sin(3*a) * 0.055;
  };
  const surface = (a: number, t: number, relief: number) => {
    const back = (1 - Math.cos(a)) / 2;
    const length = style === 'long_jasmine' ? 0.36 : style === 'bob' ? 0.14 : 0;
    const drape = length * back * Math.pow(t / 2.37, 2.8);
    return new THREE.Vector3((0.379 + relief) * Math.sin(t) * Math.sin(a),
      0.016 + (0.36 + relief) * Math.cos(t) - drape,
      (0.365 + relief) * Math.sin(t) * Math.cos(a) - drape * 0.21);
  };
  const scalp = sculpt(64, 20, (u, v) => {
    const a = u * Math.PI * 2;
    return surface(a, 0.001 + v * edge(a), 0);
  });
  group.add(new THREE.Mesh(scalp, base));
  if (style === 'french_crop') {
    // Close-cut sides under a rounded, textured top with a short blunt fringe.
    const top = sculpt(96, 24, (u, v) => {
      const a = u * Math.PI * 2;
      const front = Math.max(0, Math.cos(a));
      const hem = 1.42 - 0.19 * front + 0.035 * Math.cos(15*a) * front;
      const ridges = (0.5 + 0.5 * Math.cos(14*a + 2*v)) * Math.sin(Math.PI*v);
      return surface(a, 0.001 + v*hem, 0.002 + 0.034*Math.sin(Math.PI*v) + 0.013*ridges);
    });
    group.add(new THREE.Mesh(top, strand));
    return group;
  }
  if (style === 'curtain_part') {
    for (const side of [-1, 1]) {
      for (let layer = 0; layer < 5; layer++) {
        const t = layer/4;
        group.add(sweptLock([[side*0.02,0.36,0.035-0.16*t],
          [side*(0.09+0.07*t),0.34,0.16-0.16*t],
          [side*(0.18+0.11*t),0.25,0.252-0.15*t],
          [side*(0.239+0.08*t),0.16,0.265-0.14*t],
          [side*(0.253+0.096*t),0.094-0.046*t,0.25-0.15*t]],
          0.079, layer%2 ? strand : base));
      }
    }
    return group;
  }
  if (style === 'soft_mullet') {
    for (let i = -5; i <= 5; i++) {
      const a = Math.PI + i*0.265;
      const x = Math.sin(a), z = Math.cos(a);
      group.add(sweptLock([[0.26*x,0.17,0.28*z], [0.35*x,0.025,0.35*z],
        [0.34*x,-0.15,0.33*z], [0.32*x,-0.27,0.31*z],
        [0.37*x,-0.39+0.12*Math.abs(x),0.34*z]],
        0.075, i%3 === 0 ? strand : base));
    }
  }
  // Locks follow the skull from an off-centre part, then taper into individual tips.
  for (let i = 0; i < 16; i++) {
    const a = (i - 8) * Math.PI / 8;
    const sweep = style === 'fluffy_short' ? -0.91 : a < -0.2 ? -0.46 : 0.52;
    const end = edge(a) + 0.16 + 0.09 * Math.cos(i * 2.2);
    const lock = sculpt(10, 18, (u,v) => {
      const cross = 2*u - 1;
      const breadth = 0.25 * (0.04 + 0.96 * Math.pow(Math.sin(Math.PI*v), 0.52));
      const angle = a - sweep * (1-v) + cross * breadth;
      const crest = Math.sin(Math.PI*u) * Math.sin(Math.PI*v);
      return surface(angle, 0.16 + (end - 0.16)*v, 0.004 + crest * (style === 'fluffy_short' ? 0.042 : 0.023));
    });
    group.add(new THREE.Mesh(lock, i % 3 === 0 ? strand : base));
  }
  if (style === 'side_pony') {
    const tie = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12),
      new THREE.MeshStandardMaterial({color: config.accentColor}));
    tie.position.set(0.264, 0.242, -0.12);
    group.add(tie);
    for (let i = -2; i <= 2; i++) {
      group.add(sweptLock([[0.26,0.24,-0.12], [0.39,0.29,-0.14+i*0.023],
        [0.47+i*0.014,0.10,-0.12+i*0.033], [0.45+i*0.013,-0.10,-0.085+i*0.027],
        [0.49+i*0.011,-0.22+i*0.014,-0.048+i*0.018]], 0.075, i === 1 ? strand : base));
    }
  } else if (style === 'twin_braids') {
    const ribbon = new THREE.MeshStandardMaterial({color: config.accentColor});
    const loop = new THREE.SphereGeometry(1, 16, 12);
    for (const side of [-1, 1]) {
      for (let plait = 0; plait < 3; plait++) {
        const path = Array.from({length: 25}, (_, i) => {
          const t = i/24;
          const phase = t * Math.PI * 5 + plait * Math.PI * 2/3;
          return [side*(0.27+0.095*Math.sin(t*Math.PI/1.5)) + 0.035*Math.sin(phase),
            0.035-0.46*t, -0.12+0.27*t+0.027*Math.sin(2*phase)];
        });
        group.add(sweptLock(path, 0.059, plait === 1 ? strand : base));
      }
      for (const wing of [-1,1]) {
        const bow = new THREE.Mesh(loop, ribbon);
        bow.position.set(side*0.36 + wing*0.026,-0.364,0.14);
        bow.rotation.z = wing*0.45;
        bow.scale.set(0.039,0.022,0.015);
        group.add(bow);
      }
    }
  } else if (style === 'swept_quiff') {
    for (let i=0; i<5; i++) {
      const shift=i*0.024;
      group.add(sweptLock([[-0.25,0.16,0.20-shift],[-0.16,0.31,0.21-shift],
        [0.025,0.417+shift*0.26,0.14-shift],[0.17,0.385,0.03-shift],
        [0.225,0.28,-0.10-shift]],0.072,i%2 ? strand : base));
    }
  } else if (style === 'twin_buns') {
    for (const side of [-1,1]) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.147, 24, 16), base);
      bun.position.set(side * 0.276, 0.29, -0.08);
      group.add(bun);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.017, 8, 28),
        new THREE.MeshStandardMaterial({color: config.accentColor}));
      tie.rotation.x = Math.PI / 2;
      tie.position.set(side * 0.26, 0.215, -0.08);
      group.add(tie);
    }
  }
  if (style === 'long_jasmine' || style === 'bob') {
    const pin = flower(style === 'bob' ? '#f79bb5' : '#fff6de');
    pin.position.set(-0.261, 0.145, 0.235);
    group.add(pin);
  }
  return group;
}

export function flower(color: string) {
  const group = new THREE.Group();
  const petal = new THREE.SphereGeometry(1,12,8);
  const silk = new THREE.MeshStandardMaterial({color, roughness:0.58});
  for (let i=0;i<5;i++) {
    const a=i*Math.PI*2/5;
    const p=new THREE.Mesh(petal,silk);
    p.scale.set(0.019,0.032,0.015);
    p.rotation.z=-a;
    p.position.set(0.028*Math.sin(a),0.028*Math.cos(a),0);
    group.add(p);
  }
  const heart=new THREE.Mesh(petal,new THREE.MeshStandardMaterial({color:'#ffd16e'}));
  heart.scale.set(0.016,0.016,0.012);
  heart.position.z=0.015;
  group.add(heart);
  return group;
}

let eyeMap: THREE.CanvasTexture | undefined;
export function paintedEye() {
  if (!eyeMap) {
    const canvas=document.createElement('canvas');
    canvas.width=192; canvas.height=224;
    const c=canvas.getContext('2d')!;
    const oval=(x:number,y:number,w:number,h:number,fill:string | CanvasGradient) => {
      c.fillStyle=fill; c.beginPath(); c.ellipse(x,y,w,h,0,0,2*Math.PI); c.fill();
    };
    oval(96,115,82,98,'#412a36');
    oval(96,119,74,86,'#fff3e2');
    const iris=c.createLinearGradient(0,34,0,200);
    iris.addColorStop(0,'#302436');iris.addColorStop(0.55,'#785055');iris.addColorStop(1,'#edb677');
    oval(97,113,61,84,iris);
    oval(98,103,38,51,'#362636');
    oval(76,75,19,24,'#fffaf1');
    oval(125,130,8,10,'#ffeec8');
    oval(86,176,14,5,'#f9d6a1');
    eyeMap=new THREE.CanvasTexture(canvas);
    eyeMap.colorSpace=THREE.SRGBColorSpace;
  }
  const eye=new THREE.Mesh(new THREE.PlaneGeometry(0.149,0.16),
    new THREE.MeshBasicMaterial({map:eyeMap,transparent:true,depthWrite:false}));
  return eye;
}

export function clothProfile(rings: number[][], pleat=0) {
  const geometry = new THREE.LatheGeometry(rings.map(([r,y]) => new THREE.Vector2(r,y)), 80);
  const p = geometry.attributes.position;
  for (let i=0;i<p.count;i++) {
    const x=p.getX(i), z=p.getZ(i);
    const hem=1-(i % rings.length)/(rings.length-1);
    const fold=1+pleat*hem*Math.cos(12*Math.atan2(x,z));
    p.setXYZ(i,x*fold,p.getY(i),z*fold*0.86);
  }
  geometry.computeVertexNormals();
  return geometry;
}
