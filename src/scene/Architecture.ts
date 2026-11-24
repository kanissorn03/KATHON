import * as THREE from 'three';

const block = new THREE.BoxGeometry(1, 1, 1);
type Block = [number, number, number, number, number, number];

// Each entry gives a centre and dimensions in the building's local coordinates.
export function addJoinery(group: THREE.Group, material: THREE.Material, blocks: Block[]) {
  const batch = new THREE.InstancedMesh(block, material, blocks.length);
  const piece = new THREE.Object3D();
  blocks.forEach(([x, y, z, w, h, d], index) => {
    piece.position.set(x, y, z);
    piece.scale.set(w, h, d);
    piece.updateMatrix();
    batch.setMatrixAt(index, piece.matrix);
  });
  batch.castShadow = batch.receiveShadow = true;
  group.add(batch);
}

export function sewAwning(colors: string[]): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const fabric = new THREE.BufferGeometry();
  const panels = 7;
  for (let panel = 0; panel < panels; panel++) {
    const firstIndex = indices.length;
    const start = positions.length / 3;
    for (let row = 0; row <= 13; row++) {
      const t = Math.min(row, 12) / 12;
      for (let col = 0; col <= 10; col++) {
        const u = col / 10;
        const fold = Math.sin(Math.PI * u);
        const hem = row === 13 ? 0.09 + 0.17 * fold : 0;
        const y = 3.19 - 0.49 * t - Math.sin(t * Math.PI) * (0.14 + 0.04 * fold);
        positions.push(-1.9 + (panel + u) * 3.8 / panels, y - hem,
          -0.92 + t * 2.31 + (row === 13 ? 0.025 * fold : 0));
        if (row < 13 && col < 10) {
          const a = start + row * 11 + col;
          indices.push(a, a + 11, a + 1, a + 1, a + 11, a + 12);
        }
      }
    }
    fabric.addGroup(firstIndex, indices.length - firstIndex, panel % colors.length);
  }
  fabric.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  fabric.setIndex(indices);
  fabric.computeVertexNormals();
  const mesh = new THREE.Mesh(fabric, colors.map(color =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.96, side: THREE.DoubleSide })));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function buildSanctuaryRoof(): THREE.Group {
  const group = new THREE.Group();
  const timber = new THREE.MeshStandardMaterial({ color: '#682d24', roughness: 0.83 });
  const glaze = new THREE.MeshStandardMaterial({ color: 'white', roughness: 0.48 });
  const gold = new THREE.MeshStandardMaterial({ color: '#e4ad57', metalness: 0.38, roughness: 0.38 });
  const palette = ['#ad5037', '#ad4831', '#b65a3b', '#993e30', '#b95439'];
  const tile = new THREE.Object3D();
  // Two nested gables, each with a continuous soffit below the overlapping clay courses.
  for (const [width, depth, eave, rise] of [[11.25, 9.2, 4.83, 3.05], [7.65, 8.15, 6.08, 2.52]]) {
    const half = width / 2;
    const height = (u: number) => eave + rise * (1 - u) ** 1.36;
    const section = new THREE.Shape();
    section.moveTo(-half, eave - 0.18);
    for (let i = -12; i <= 12; i++) section.lineTo(half * i / 12, height(Math.abs(i / 12)));
    section.lineTo(half, eave - 0.18);
    section.closePath();
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(section, { depth, bevelEnabled: false }), timber);
    frame.position.z = -depth / 2;
    frame.castShadow = true;
    group.add(frame);

    const rows = Math.ceil(half / 0.32);
    const cols = Math.ceil(depth / 0.31);
    const tiles = new THREE.InstancedMesh(block, glaze, 2 * rows * cols);
    let index = 0;
    for (const side of [-1, 1]) {
      for (let r = 0; r < rows; r++) {
        const dy = height((r + 1) / rows) - height(r / rows);
        const dx = half / rows;
        tile.rotation.z = side * Math.atan2(dy, dx);
        tile.scale.set(Math.hypot(dx, dy) + 0.024, 0.075, depth / cols - 0.009);
        for (let c = 0; c < cols; c++) {
          tile.position.set(side * dx * (r + 0.5), height((r + 0.5) / rows) + 0.045,
            depth * ((c + 0.5) / cols - 0.5));
          tile.updateMatrix();
          tiles.setMatrixAt(index, tile.matrix);
          tiles.setColorAt(index++, new THREE.Color(palette[(r * 17 + c * 13 + r * c) % palette.length]));
        }
      }
    }
    tiles.receiveShadow = true;
    group.add(tiles);
    for (const end of [-1, 1]) {
      const z = end * (depth / 2 + 0.045);
      for (const side of [-1, 1]) {
        const points = Array.from({ length: 13 }, (_, i) =>
          new THREE.Vector3(side * half * i / 12, height(i / 12) + 0.10, z));
        points.push(new THREE.Vector3(side * (half + 0.20), eave + 0.19, z),
          new THREE.Vector3(side * (half + 0.32), eave + 0.47, z));
        group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, 0.075, 8, false), gold));
      }
      const finial = new THREE.Shape();
      finial.moveTo(-0.12, 0);
      finial.quadraticCurveTo(-0.13, 0.48, 0.42, 1.08);
      finial.quadraticCurveTo(0.17, 0.54, 0.23, 0.36);
      finial.quadraticCurveTo(0.13, 0.43, 0.11, 0);
      finial.closePath();
      const chofah = new THREE.Mesh(new THREE.ExtrudeGeometry(finial, {depth: 0.09, bevelEnabled: false}), gold);
      chofah.rotation.y = -end * Math.PI / 2;
      chofah.position.set(end * 0.045, eave + rise + 0.06, z);
      group.add(chofah);
    }
    // A carved sunburst at the centre of the pediment, standing proud of the teak.
    const rays = new THREE.InstancedMesh(block, gold, 13);
    for (let i = 0; i < 13; i++) {
      const angle = (i - 6) * Math.PI / 14;
      const length = 1.12 - Math.abs(i - 6) * 0.068;
      tile.rotation.z = -angle;
      tile.scale.set(0.052, length, 0.07);
      tile.position.set(Math.sin(angle) * length * 0.64, eave + 0.18 + Math.cos(angle) * length * 0.64, depth / 2 + 0.035);
      tile.updateMatrix();
      rays.setMatrixAt(i, tile.matrix);
    }
    group.add(rays);
    for (const side of [-1, 1]) {
      const carving = new THREE.CurvePath<THREE.Vector3>();
      const point = (x: number, y: number) => new THREE.Vector3(side * x * half, eave + y * rise, depth / 2 + 0.055);
      carving.add(new THREE.CubicBezierCurve3(point(0.09, 0.06), point(0.28, 0.34),
        point(0.38, 0.05), point(0.55, 0.18)));
      carving.add(new THREE.CubicBezierCurve3(point(0.55, 0.18), point(0.48, 0.11),
        point(0.41, 0.31), point(0.34, 0.19)));
      group.add(new THREE.Mesh(new THREE.TubeGeometry(carving, 32, 0.042, 6, false), gold));
    }
  }
  return group;
}
