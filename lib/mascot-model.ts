import { BufferAttribute, BufferGeometry, CapsuleGeometry, CatmullRomCurve3, Color, ExtrudeGeometry, Group, Matrix4, Mesh, MeshPhysicalMaterial, Quaternion, Shape, SphereGeometry, TubeGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original, code-built cacomixtle. Colours are baked into the geometry so the
// entire character takes only three draw calls and needs no texture downloads.
const ivory = '#f1eee5', blue = '#b6cce0', cobalt = '#193f7d', ink = '#102950';
type Part = { geometry: BufferGeometry; color: string; at?: [number, number, number]; scale?: [number, number, number]; rotate?: number };

function combine(parts: Part[]) {
  const geometries = parts.map(({ geometry, color, at = [0, 0, 0], scale = [1, 1, 1], rotate = 0 }) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    flat.applyMatrix4(new Matrix4().compose(new Vector3(...at), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), rotate), new Vector3(...scale)));
    const rgb = new Color(color), colors = new Float32Array(flat.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = rgb.r; colors[i + 1] = rgb.g; colors[i + 2] = rgb.b; }
    flat.setAttribute('color', new BufferAttribute(colors, 3));
    // All parts share this minimal layout, including the extruded ear shapes.
    for (const key of Object.keys(flat.attributes)) if (!['position', 'normal', 'color'].includes(key)) flat.deleteAttribute(key);
    return flat;
  });
  const geometry = mergeGeometries(geometries, false);
  geometries.forEach(part => part.dispose());
  if (!geometry) throw new Error('The mascot geometry could not be assembled.');
  return geometry;
}

function ball(color: string, at: Part['at'], scale: Part['scale'], rotate = 0): Part {
  return { geometry: new SphereGeometry(1, 24, 16), color, at, scale, rotate };
}

function stroke(points: number[][], color: string, radius = .018): Part {
  return { geometry: new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p as [number, number, number]))), 24, radius, 6, false), color };
}

function ear() {
  const shape = new Shape();
  shape.moveTo(-.28, -.36);
  shape.bezierCurveTo(-.40, -.10, -.34, .39, -.14, .68);
  shape.bezierCurveTo(-.09, .75, -.03, .76, .05, .68);
  shape.bezierCurveTo(.31, .43, .42, -.03, .26, -.34);
  shape.quadraticCurveTo(0, -.50, -.28, -.36);
  return new ExtrudeGeometry(shape, { depth: .12, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .055, bevelThickness: .055, curveSegments: 10 });
}

function bib() {
  const shape = new Shape();
  shape.moveTo(-.27, .18); shape.quadraticCurveTo(0, .10, .27, .18);
  shape.quadraticCurveTo(.17, -.14, 0, -.35); shape.quadraticCurveTo(-.17, -.14, -.27, .18);
  return new ExtrudeGeometry(shape, { depth: .015, bevelEnabled: true, bevelSegments: 2, bevelSize: .015, bevelThickness: .01, curveSegments: 8 });
}

function tail() {
  const path = new CatmullRomCurve3([
    new Vector3(.15, -1.20, -.35), new Vector3(.90, -1.00, -.42),
    new Vector3(1.38, -.35, -.42), new Vector3(1.32, .45, -.35),
    new Vector3(1.22, 1.05, -.28), new Vector3(1.42, 1.40, -.25),
  ]);
  const count = 96, radial = 16, frames = path.computeFrenetFrames(count, false);
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count, point = path.getPointAt(t);
    // Rounded, closed ends; broad alternating bands follow the length of the tail.
    const cap = Math.min(1, Math.sqrt(Math.max(0, Math.min(t / .065, (1 - t) / .075))));
    const radius = (.21 + .06 * Math.sin(t * Math.PI)) * cap;
    const color = new Color(Math.floor(t * 11) % 2 === 0 ? cobalt : ivory);
    for (let j = 0; j <= radial; j++) {
      const angle = j / radial * Math.PI * 2;
      const p = point.clone().addScaledVector(frames.normals[i], Math.cos(angle) * radius).addScaledVector(frames.binormals[i], Math.sin(angle) * radius);
      positions.push(p.x, p.y, p.z); colors.push(color.r, color.g, color.b);
      if (i < count && j < radial) {
        const a = i * (radial + 1) + j, b = a + radial + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function createMascotModel() {
  const body: Part[] = [
    ball(blue, [-.25, -.52, 0], [.59, .87, .43]),
    ball(ivory, [-.25, .27, .08], [.32, .32, .30]),
    ball(ivory, [-.25, .90, .02], [.82, .65, .50]),
    // Soft cheeks and muzzle, without the dark full-face mask of a raccoon.
    ball(ivory, [-.65, .69, .20], [.38, .32, .36]),
    ball(ivory, [.15, .69, .20], [.38, .32, .36]),
    ball(ivory, [-.39, .54, .48], [.23, .17, .16]),
    ball(ivory, [-.11, .54, .48], [.23, .17, .16]),
    { geometry: ear(), color: ivory, at: [-.82, 1.43, -.03], rotate: .31 },
    { geometry: ear(), color: ivory, at: [.32, 1.43, -.03], rotate: -.31 },
    { geometry: ear(), color: blue, at: [-.82, 1.45, .115], scale: [.69, .75, .20], rotate: .31 },
    { geometry: ear(), color: blue, at: [.32, 1.45, .115], scale: [.69, .75, .20], rotate: -.31 },
    { geometry: new CapsuleGeometry(.165, .52, 5, 16), color: blue, at: [-.83, -.40, .02], rotate: -.33 },
    { geometry: new CapsuleGeometry(.165, .52, 5, 16), color: blue, at: [.33, -.40, .02], rotate: .33 },
    ball(ivory, [-.94, -.77, .12], [.18, .21, .18], -.25),
    ball(ivory, [.44, -.77, .12], [.18, .21, .18], .25),
    ball(blue, [-.56, -1.19, .01], [.26, .40, .29]),
    ball(blue, [.06, -1.19, .01], [.26, .40, .29]),
    ball(ivory, [-.57, -1.51, .16], [.28, .15, .36]),
    ball(ivory, [.07, -1.51, .16], [.28, .15, .36]),
    { geometry: bib(), color: cobalt, at: [-.25, -.02, .432] },
    // A small, original stepped relief inspired by Tenayuca; no lettering.
    stroke([[-.40, -.09, .479], [-.36, -.09, .479], [-.36, -.02, .479], [-.30, -.02, .479], [-.30, .06, .479], [-.20, .06, .479], [-.20, -.02, .479], [-.14, -.02, .479], [-.14, -.09, .479], [-.10, -.09, .479]], ivory, .018),
  ];
  const features: Part[] = [];
  for (const side of [-1, 1]) {
    const ex = -.25 + side * .32;
    body.push(ball(blue, [ex, .96, .465], [.195, .25, .047], -side * .11));
    body.push(ball(cobalt, [-.25 + side * .65, .87, .355], [.055, .205, .022], side * .35));
    features.push(ball(ink, [ex, .94, .51], [.126, .173, .073], -side * .08));
    features.push(ball('#fffaf0', [ex - .025, 1.007, .575], [.028, .031, .012]));
  }
  features.push(ball(ink, [-.25, .626, .652], [.080, .052, .052]));
  features.push(stroke([[-.25, .594, .650], [-.25, .55, .651], [-.33, .493, .639], [-.41, .51, .607], [-.455, .55, .59]], ink, .012));
  features.push(stroke([[-.25, .55, .651], [-.17, .493, .639], [-.09, .51, .607], [-.045, .55, .59]], ink, .012));

  const satin = new MeshPhysicalMaterial({ vertexColors: true, roughness: .48, metalness: 0, clearcoat: .16, clearcoatRoughness: .5 });
  const gloss = new MeshPhysicalMaterial({ vertexColors: true, roughness: .24, metalness: 0, clearcoat: .5, clearcoatRoughness: .2 });
  const root = new Group(); root.name = 'Cacomixtle de Tlalnepantla';
  root.add(new Mesh(combine(body), satin), new Mesh(combine(features), gloss), new Mesh(tail(), satin));
  // Centre the full silhouette (including ears and tail), not just the torso.
  for (const mesh of root.children) mesh.position.set(-.16, -.21, 0);
  let disposed = false;
  return {
    root,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const child of root.children) (child as Mesh).geometry.dispose();
      satin.dispose(); gloss.dispose();
    },
  };
}
