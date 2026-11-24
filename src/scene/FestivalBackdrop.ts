import * as THREE from 'three';
import { COURTYARD_BACK, COURTYARD_HALF_WIDTH } from './TempleEnvironment';

type GroundPoint = [x: number, z: number];
type Placement = [x: number, y: number, z: number, width: number, height: number, depth: number];
const WALL_CLEARANCE = 2;

function clearCourtyardWall(x: number, z: number, halfWidth: number, halfDepth: number): GroundPoint {
  if (z >= 55) return [x, z];
  if (z < COURTYARD_BACK) return [x, Math.min(z, COURTYARD_BACK - WALL_CLEARANCE - halfDepth)];
  const side = Math.sign(x);
  return [side * Math.max(Math.abs(x), COURTYARD_HALF_WIDTH + WALL_CLEARANCE + halfWidth), z];
}

function ridge(radius: number, relief: number, phase: number, color: string): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const segments = 96;
  // A continuous profile gives the orbit camera a skyline in every direction.
  for (let i = 0; i <= segments; i++) {
    const angle = i * Math.PI * 2 / segments;
    const broad = 0.5 + 0.5 * Math.sin(angle * 5 + phase);
    const small = 0.5 + 0.5 * Math.sin(angle * 11 - phase);
    const crest = 3.5 + relief * (0.62 * broad ** 1.3 + 0.32 * small + 0.06 * Math.sin(angle * 27));
    const bend = radius + 4 * Math.sin(angle * 6 + phase);
    positions.push(Math.sin(angle) * bend, -5, Math.cos(angle) * bend);
    positions.push(Math.sin(angle) * (bend + 4), crest, Math.cos(angle) * (bend + 4));
    if (i < segments) {
      const a = 2 * i;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false, toneMapped: false }));
}

function land(outline: GroundPoint[], color: string, height: number): THREE.Mesh {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false }),
    new THREE.MeshBasicMaterial({ color }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = height - 2;
  return mesh;
}

function batch(geometry: THREE.BufferGeometry, color: string, placements: Placement[], varied = false): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ color }), placements.length);
  const part = new THREE.Object3D();
  for (const [i, [x, y, z, width, height, depth]] of placements.entries()) {
    part.position.set(x, y, z);
    part.scale.set(width, height, depth);
    part.updateMatrix();
    mesh.setMatrixAt(i, part.matrix);
    if (varied) mesh.setColorAt(i, new THREE.Color().setHSL(0.48 + (i % 4) * 0.018, 0.27, 0.69 + (i % 5) * 0.055));
  }
  return mesh;
}

export function buildFestivalBackdrop(): THREE.Group {
  const group = new THREE.Group();
  group.add(ridge(132, 26, 0.7, '#484263'), ridge(103, 16, 2.5, '#343653'), ridge(82, 8, 4, '#282f4b'));

  group.add(land([
    [-110, 21], [-59, 18], [-36, 13], [-23, 10], [23, 10], [39, 13], [64, 18], [110, 21],
    [110, -120], [-110, -120]
  ], '#22343f', -0.25));
  group.add(land([
    [-128, 74], [-76, 70], [-44, 65], [-18, 69], [7, 71], [38, 63], [64, 66], [128, 72],
    [128, 121], [-128, 121]
  ], '#283c4c', -0.28));

  const walls: Placement[] = [];
  const roofs: Placement[] = [];
  const windows: Placement[] = [];
  const trunks: Placement[] = [];
  const canopies: Placement[] = [];
  const neighborhoods: GroundPoint[] = [[-29, -34], [1, -35], [30, -34], [-45, -6], [45, -4], [-36, 72], [29, 72]];
  for (const [block, [centerX, centerZ]] of neighborhoods.entries()) {
    for (let house = 0; house < 7; house++) {
      const width = 2.7 + (house % 3) * 0.34;
      const height = 1.9 + ((house + block) % 4) * 0.34;
      const depth = 2.6 + (house % 3) * 0.22;
      const [x, z] = clearCourtyardWall(
        centerX + (house - 3) * 4.7 + 0.7 * Math.sin(house * 3 + block),
        centerZ + 2.5 * Math.sin(house * 2 + block) + (house % 2) * 2,
        width * 0.61, depth * 0.62
      );
      walls.push([x, height / 2 - 0.16, z, width, height, depth]);
      roofs.push([x, height - 0.22, z - depth * 0.62, width * 1.22, 1.15 + height * 0.22, depth * 1.24]);
      const windowY = height * 0.63;
      for (const side of [-1, 1]) {
        windows.push([x + side * width * 0.23, windowY, z + side * (depth / 2 + 0.025), 0.43, 0.52, 0.06]);
        windows.push([x + side * (width / 2 + 0.025), windowY, z - 0.38, 0.06, 0.49, 0.54]);
      }
    }
  }
  const groves: GroundPoint[] = [
    [-32, 1], [-33, -16], [-13, -27], [11, -26], [29, -17], [34, 4],
    [-60, 71], [-22, 74], [0, 79], [48, 70], [66, 75]
  ];
  for (const [index, [centerX, centerZ]] of groves.entries()) {
    for (let tree = 0; tree < 9; tree++) {
      const angle = tree * 2.39996 + index;
      const radius = 1.25 * Math.sqrt(tree) + tree * 0.14;
      const size = 0.83 + ((index + tree * 7) % 9) * 0.11;
      const [x, z] = clearCourtyardWall(centerX + Math.cos(angle) * radius * 1.65,
        centerZ + Math.sin(angle) * radius, 1.8 * size, 1.5 * size);
      trunks.push([x, 1.02 * size, z, 0.25 * size, 2.3 * size, 0.24 * size]);
      canopies.push([x, 2.65 * size, z, 1.55 * size, 1.54 * size, 1.4 * size]);
      if (tree % 2 === 0) canopies.push([x + 0.67 * size, 2.52 * size, z - 0.32, 1.09 * size, 1.13 * size, size]);
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const roof = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0, 1), new THREE.Vector2(0.5, 0)]);
  group.add(
    batch(box, '#524656', walls),
    batch(new THREE.ExtrudeGeometry(roof, { depth: 1, bevelEnabled: false }), '#2d2942', roofs),
    batch(box, '#ffbd74', windows),
    batch(box, '#3a3040', trunks),
    batch(new THREE.IcosahedronGeometry(1, 0), '#4a6668', canopies, true)
  );
  return group;
}
