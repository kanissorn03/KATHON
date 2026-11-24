import * as THREE from 'three';

// A folded petal with a raised central rib and a tip that curls outwards.
function lotusPetal(): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const vein = new THREE.Color('#fff1b8');
  const rim = new THREE.Color('#e77889');
  for (let row = 0; row <= 12; row++) {
    const t = row / 12;
    const width = 0.012 + 0.23 * Math.sin(Math.PI * t) ** 0.82;
    for (let col = 0; col <= 6; col++) {
      const u = col / 3 - 1;
      positions.push(u * width, t * 0.72,
        0.08 + t * t * 0.48 + (1 - Math.abs(u)) * width * 0.55);
      const color = vein.clone().lerp(rim, Math.abs(u) * 0.68 + t * 0.30);
      colors.push(color.r, color.g, color.b);
      if (row < 12 && col < 6) {
        const a = row * 7 + col;
        indices.push(a, a + 1, a + 7, a + 1, a + 8, a + 7);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildPierLanterns(): THREE.Group {
  const group = new THREE.Group();
  const lamps: [number, number, number, number][] = [];
  for (const side of [-1, 1]) {
    lamps.push([side * 2.05, 3.58, 9.6, 1.15]);
    for (const x of [4.8, 8.6, 12.4, 16.2]) lamps.push([side * x, 0.89, 9.8, 0.76]);
    for (let z = 10.4; z <= 19.2; z += 2.2) lamps.push([side * 1.78, 1.44, z, 0.47]);
  }
  const brass = new THREE.MeshStandardMaterial({ color: '#d6a358', metalness: 0.48, roughness: 0.36 });
  const baseProfile = [[0.01, 0], [0.29, 0], [0.31, 0.05], [0.19, 0.10],
    [0.22, 0.16], [0.37, 0.21], [0.36, 0.25], [0.01, 0.25]];
  const bases = new THREE.InstancedMesh(new THREE.LatheGeometry(
    baseProfile.map(([r, y]) => new THREE.Vector2(r, y)), 20), brass, lamps.length);
  const cores = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#ffdfa0' }), lamps.length);
  const petals = new THREE.InstancedMesh(lotusPetal(), new THREE.MeshStandardMaterial({
    vertexColors: true, side: THREE.DoubleSide, roughness: 0.65,
    emissive: '#d1725d', emissiveIntensity: 0.45
  }), lamps.length * 16);
  const part = new THREE.Object3D();
  lamps.forEach(([x, y, z, scale], lamp) => {
    part.position.set(x, y, z);
    part.rotation.set(0, 0, 0);
    part.scale.setScalar(scale);
    part.updateMatrix();
    bases.setMatrixAt(lamp, part.matrix);
    part.position.y += scale * 0.48;
    part.scale.set(0.24 * scale, 0.32 * scale, 0.24 * scale);
    part.updateMatrix();
    cores.setMatrixAt(lamp, part.matrix);
    for (let i = 0; i < 16; i++) {
      const inner = i >= 8;
      part.position.y = y + scale * (inner ? 0.24 : 0.16);
      part.rotation.y = (i + (inner ? 0.5 : 0)) * Math.PI / 4;
      const radius = scale * (inner ? 0.68 : 1);
      part.scale.set(radius, scale * (inner ? 1 : 0.77), radius);
      part.updateMatrix();
      petals.setMatrixAt(lamp * 16 + i, part.matrix);
    }
  });
  group.add(bases, cores, petals);

  // Curved lacquer canopy with gold piping along both eaves.
  const roof = new THREE.Shape();
  roof.moveTo(-2.85, 4.83);
  roof.quadraticCurveTo(-2.36, 4.16, -1.72, 4.44);
  roof.quadraticCurveTo(-0.68, 4.69, 0, 5.35);
  roof.quadraticCurveTo(0.68, 4.69, 1.72, 4.44);
  roof.quadraticCurveTo(2.36, 4.16, 2.85, 4.83);
  const eave = roof.getPoints(16);
  roof.quadraticCurveTo(2.38, 3.94, 1.66, 4.23);
  roof.quadraticCurveTo(0.62, 4.42, 0, 4.98);
  roof.quadraticCurveTo(-0.62, 4.42, -1.66, 4.23);
  roof.quadraticCurveTo(-2.38, 3.94, -2.85, 4.83);
  const canopy = new THREE.Mesh(new THREE.ExtrudeGeometry(roof, {
    depth: 0.78, bevelEnabled: false, curveSegments: 16
  }), new THREE.MeshStandardMaterial({ color: '#14625f', roughness: 0.46 }));
  canopy.position.z = 9.21;
  group.add(canopy);
  const curve = new THREE.CatmullRomCurve3(eave.map(p => new THREE.Vector3(p.x, p.y, 0)));
  const piping = new THREE.TubeGeometry(curve, 64, 0.038, 8, false);
  for (const z of [9.21, 9.99]) {
    const trim = new THREE.Mesh(piping, brass);
    trim.position.z = z;
    group.add(trim);
  }
  return group;
}
