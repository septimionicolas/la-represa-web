// Escena 3D conceptual de La Represa: la represa proyectada (3.500 m², escala real),
// casa principal, quincho y 4 módulos frente al agua, monte alrededor y lotes productivos en el borde.
// 1 unidad = 2 m. Todo es visualización conceptual: no reproduce un emplazamiento real.
import * as THREE from './three.module.min.js';

const MUNDO = 640, MEDIO = MUNDO / 2;
// Espejo de agua: semiejes 18,5 × 15 unidades = 37 × 30 m → π·37·30 ≈ 3.490 m².
export const AGUA = { rx: 18.5, rz: 15 };
const CLARO = { rx: 78, rz: 66 };

/* ---------- trazado ---------- */
const lotes = [];
for (let x0 = -300; x0 < 300; x0 += 118) {
  for (let z0 = 150; z0 < 300; z0 += 92) lotes.push({ x0, z0, x1: x0 + 106, z1: z0 + 80 });
}
for (let z0 = -290; z0 < 140; z0 += 92) lotes.push({ x0: 182, z0, x1: 300, z1: z0 + 80 });
const CULTIVOS = ['#6d8f36', '#7f9a3a', '#98943f', '#b59f68', '#6f8a3e'];
lotes.forEach((l, i) => { l.color = CULTIVOS[(i * 3) % CULTIVOS.length]; });

const enLote = (x, z) => lotes.some(l => x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1);
const enClaro = (x, z) => (x / CLARO.rx) ** 2 + (z / CLARO.rz) ** 2 < 1;
const enCamino = (x, z) => (Math.abs(x + 6) < 3 && z < -20) || (Math.abs(z - 144) < 3);
const borde = th => 1 + 0.07 * Math.sin(3 * th + 0.6) + 0.045 * Math.cos(5 * th);
const enAgua = (x, z, m = 1) => {
  const th = Math.atan2(z / AGUA.rz, x / AGUA.rx);
  return (x / AGUA.rx) ** 2 + (z / AGUA.rz) ** 2 < (borde(th) * m) ** 2;
};

/* ---------- ruido ---------- */
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const ruido = (x, z) => {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, z) => ruido(x, z) * 0.6 + ruido(x * 2.1, z * 2.1) * 0.3 + ruido(x * 4.3, z * 4.3) * 0.1;
export const altura = (x, z) => {
  let h = (fbm(x * 0.01, z * 0.01) - 0.5) * 2.2;
  const d = (x / (AGUA.rx * 1.25)) ** 2 + (z / (AGUA.rz * 1.25)) ** 2;
  if (d < 1) h -= 2.4 * (1 - d) ** 1.4;
  return h;
};

/* ---------- textura del suelo ---------- */
const S = 2048, px = v => (v + MEDIO) / MUNDO * S, u = v => v / MUNDO * S;
function pintarSuelo() {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#3a4a2c'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 30000; i++) {
    g.fillStyle = `rgba(${Math.random() < .5 ? '22,32,18' : '96,108,62'},${0.2 + Math.random() * 0.3})`;
    g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 1.5 + Math.random() * 5, 0, 7); g.fill();
  }
  // claro de pasto natural alrededor del agua
  const gr = g.createRadialGradient(px(0), px(0), u(10), px(0), px(0), u(CLARO.rx));
  gr.addColorStop(0, '#8b9152'); gr.addColorStop(0.75, '#7a8448'); gr.addColorStop(1, 'rgba(90,100,60,0)');
  g.save(); g.translate(px(0), px(0)); g.scale(1, CLARO.rz / CLARO.rx); g.translate(-px(0), -px(0));
  g.fillStyle = gr; g.beginPath(); g.arc(px(0), px(0), u(CLARO.rx * 1.08), 0, 7); g.fill(); g.restore();
  for (let i = 0; i < 2500; i++) {
    const a = Math.random() * 7, r = Math.random();
    g.fillStyle = `rgba(${Math.random() < .5 ? '150,150,90' : '90,105,55'},.35)`;
    g.fillRect(px(Math.cos(a) * r * CLARO.rx), px(Math.sin(a) * r * CLARO.rz), 3, 3);
  }
  // orilla de tierra
  g.fillStyle = '#b39a74';
  g.beginPath();
  for (let k = 0; k <= 120; k++) {
    const th = k / 120 * Math.PI * 2, b = borde(th) * 1.16;
    const x = Math.cos(th) * AGUA.rx * b, z = Math.sin(th) * AGUA.rz * b;
    k ? g.lineTo(px(x), px(z)) : g.moveTo(px(x), px(z));
  }
  g.fill();
  // lotes productivos
  for (const l of lotes) {
    const x = px(l.x0), y = px(l.z0), w = u(l.x1 - l.x0), h = u(l.z1 - l.z0);
    g.fillStyle = l.color; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2;
    for (let yy = 3; yy < h; yy += 6) { g.beginPath(); g.moveTo(x, y + yy); g.lineTo(x + w, y + yy); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(x + Math.random() * w, y + Math.random() * h, 40 + Math.random() * 60, 20 + Math.random() * 30, 0, 0, 7); g.fill(); }
  }
  // caminos de tierra y senderos del conjunto
  g.fillStyle = '#cdb68c';
  g.fillRect(px(-6 - 2), 0, u(4), px(-20));
  g.fillRect(0, px(144 - 2), S, u(4));
  g.strokeStyle = '#c4ad84'; g.lineWidth = u(1.4); g.lineCap = 'round';
  g.beginPath(); g.moveTo(px(-6), px(-20)); g.quadraticCurveTo(px(-4), px(-28), px(4), px(-30)); g.stroke();
  g.beginPath(); g.moveTo(px(4), px(-30)); g.quadraticCurveTo(px(22), px(-28), px(30), px(-8)); g.quadraticCurveTo(px(32), px(10), px(22), px(22)); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* ---------- arquitectura (una planta, madera y tonos tierra) ---------- */
const MAT = {
  muro: new THREE.MeshStandardMaterial({ color: '#cdbb9c', roughness: 0.85 }),
  madera: new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.7 }),
  techo: new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 0.55, metalness: 0.25 }),
  vidrio: new THREE.MeshStandardMaterial({ color: '#2b3a3e', roughness: 0.1, metalness: 0.4 }),
  deck: new THREE.MeshStandardMaterial({ color: '#9a7752', roughness: 0.8 }),
  luz: new THREE.MeshStandardMaterial({ color: '#ffd59a', emissive: '#ffb45a', emissiveIntensity: 0.9 }),
};
const caja = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = b.receiveShadow = true; return b; };
const techoDosAguas = (w, d, alto) => {
  const s = new THREE.Shape(); s.moveTo(-d / 2 - .3, 0); s.lineTo(0, alto); s.lineTo(d / 2 + .3, 0); s.lineTo(-d / 2 - .3, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w + .6, bevelEnabled: false }); g.translate(0, 0, -(w + .6) / 2); g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, MAT.techo); m.castShadow = true; return m;
};
// Edificio con galería del lado que mira al agua (+z local).
function edificio({ w, d, alto = 1.6, galeria = 2.2, abierto = false }) {
  const g = new THREE.Group();
  if (abierto) {
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) { const p = caja(.25, alto, .25, MAT.madera); p.position.set(sx * (w / 2 - .2), alto / 2, sz * (d / 2 - .2)); g.add(p); }
    const fondo = caja(w, alto, .3, MAT.muro); fondo.position.set(0, alto / 2, -d / 2 + .15); g.add(fondo);
    const parrilla = caja(1.2, alto + .9, .9, MAT.muro); parrilla.position.set(-w / 2 + 1, (alto + .9) / 2, -d / 2 + .6); g.add(parrilla);
  } else {
    const muros = caja(w, alto, d, MAT.muro); muros.position.y = alto / 2; g.add(muros);
    const vid = caja(w * .7, alto * .62, .05, MAT.vidrio); vid.position.set(0, alto * .45, d / 2 + .03); g.add(vid);
    const luz = caja(w * .5, alto * .3, .04, MAT.luz); luz.position.set(0, alto * .45, d / 2 + .06); g.add(luz);
  }
  const techo = techoDosAguas(w, d, 1.1); techo.position.y = alto; g.add(techo);
  if (galeria) {
    const losa = caja(w, .14, galeria, MAT.madera); losa.position.set(0, alto + .02, d / 2 + galeria / 2); g.add(losa);
    for (const sx of [-1, 1]) { const p = caja(.18, alto, .18, MAT.madera); p.position.set(sx * (w / 2 - .2), alto / 2, d / 2 + galeria - .2); g.add(p); }
    const piso = caja(w, .12, galeria, MAT.deck); piso.position.set(0, .06, d / 2 + galeria / 2); g.add(piso);
  }
  return g;
}

/* ---------- escena ---------- */
export function crearEscena(lienzo, { sombras = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true });
  // en pantallas grandes 1,25 alcanza y libera la placa de video para el scroll
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth > 1100 ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = sombras;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const escena = new THREE.Scene();
  const HORIZONTE = new THREE.Color('#e9d2ad');
  escena.fog = new THREE.Fog(HORIZONTE, 320, 1100);
  escena.background = HORIZONTE;
  const camara = new THREE.PerspectiveCamera(36, 1, 0.3, 3000);

  // cielo de última hora de la tarde
  const cieloGeo = new THREE.SphereGeometry(1600, 32, 16);
  const col = [], pos = cieloGeo.attributes.position, alto = new THREE.Color('#8fa6b3'), bajo = new THREE.Color('#f1d3a2');
  for (let i = 0; i < pos.count; i++) { const k = THREE.MathUtils.clamp(pos.getY(i) / 700, 0, 1); const c = bajo.clone().lerp(alto, Math.pow(k, .6)); col.push(c.r, c.g, c.b); }
  cieloGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const cielo = new THREE.Mesh(cieloGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  escena.add(cielo);
  // el cielo como entorno: el agua y los vidrios lo reflejan
  const soloCielo = new THREE.Scene(); soloCielo.add(cielo.clone());
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(soloCielo, 0.02).texture;
  escena.environmentIntensity = 0.55;

  escena.add(new THREE.HemisphereLight('#ffe8c8', '#4a3a28', 0.6));
  const sol = new THREE.DirectionalLight('#ffc27e', 2.8);
  sol.position.set(-160, 70, -50);
  sol.castShadow = sombras;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 500 });
  sol.shadow.bias = -0.0008;
  escena.add(sol);

  // terreno
  const geo = new THREE.PlaneGeometry(MUNDO, MUNDO, 220, 220);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, altura(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const suelo = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: pintarSuelo(), roughness: 0.95 }));
  suelo.receiveShadow = true;
  escena.add(suelo);
  const llano = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: '#46552f', roughness: 1 }));
  llano.rotation.x = -Math.PI / 2; llano.position.y = -1.6; escena.add(llano);

  // agua
  const forma = new THREE.Shape();
  for (let k = 0; k <= 96; k++) {
    const th = k / 96 * Math.PI * 2, b = borde(th);
    // y = -z para que, al acostar la forma con rotateX(-90°), coincida con la orilla pintada y la cara mire arriba
    const x = Math.cos(th) * AGUA.rx * b, y = -Math.sin(th) * AGUA.rz * b;
    k ? forma.lineTo(x, y) : forma.moveTo(x, y);
  }
  const aguaGeo = new THREE.ShapeGeometry(forma, 24); aguaGeo.rotateX(-Math.PI / 2);
  const aguaMat = new THREE.MeshStandardMaterial({ color: '#1d3f48', roughness: 0.05, metalness: 0, envMapIntensity: 2.4 });
  const agua = new THREE.Mesh(aguaGeo, aguaMat);
  agua.position.y = -0.55; agua.receiveShadow = true;
  escena.add(agua);

  const m4 = new THREE.Matrix4();
  // muelle chico (la pesca como detalle)
  const muelle = new THREE.Group();
  const tabla = caja(1.6, .15, 7, MAT.deck); tabla.position.set(0, .1, 3.5); muelle.add(tabla);
  for (const sz of [1.5, 4, 6.5]) for (const sx of [-.7, .7]) { const p2 = caja(.15, 1.2, .15, MAT.madera); p2.position.set(sx, -.4, sz); muelle.add(p2); }
  const bote = caja(1.1, .35, 3, MAT.madera); bote.position.set(1.6, -.35, 6); bote.rotation.y = .3; muelle.add(bote);
  // pescador sentado en la punta del muelle, con la caña sobre el agua (la pesca, como detalle)
  const piel = new THREE.MeshStandardMaterial({ color: '#c9a07a', roughness: 0.8 });
  const ropa = new THREE.MeshStandardMaterial({ color: '#3f4f5a', roughness: 0.9 });
  const pescador = new THREE.Group();
  const torso = caja(.42, .55, .3, ropa); torso.position.y = .45; pescador.add(torso);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(.15, 10, 8), piel); cabeza.position.y = .85; pescador.add(cabeza);
  const ala = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .04, 12), MAT.madera); ala.position.y = .96; pescador.add(ala);
  for (const sx of [-.13, .13]) { const pierna = caja(.14, .14, .55, ropa); pierna.position.set(sx, .12, .32); pescador.add(pierna); }
  const cana = new THREE.Mesh(new THREE.CylinderGeometry(.015, .03, 2.8, 5), MAT.madera);
  cana.position.set(.25, .9, 1.1); cana.rotation.x = -1.05; pescador.add(cana);
  pescador.position.set(0, .18, 6.6);
  muelle.add(pescador);
  muelle.position.set(-AGUA.rx * 0.98, 0, 4); muelle.rotation.y = Math.PI / 2 + 0.15;
  escena.add(muelle);

  // bandada de torcazas: 60 aves que cruzan en círculo lento sobre el monte y el agua
  const aveGeo = new THREE.BufferGeometry();
  aveGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .35, -.9, 0, -.2, 0, 0, -.1, 0, 0, .35, 0, 0, -.1, .9, 0, -.2], 3));
  aveGeo.computeVertexNormals();
  const AVES = 60;
  const torcazas = new THREE.InstancedMesh(aveGeo, new THREE.MeshStandardMaterial({ color: '#6b6a66', roughness: 1, side: THREE.DoubleSide }), AVES);
  const bandada = Array.from({ length: AVES }, (_, i) => ({ fase: i / AVES * 6.283, r: 30 + (i % 7) * 3, h: 9 + (i % 5) * 1.1, ala: Math.random() * 6.283, vel: .9 + Math.random() * .3 }));
  const posAve = new THREE.Vector3(), escAve = new THREE.Vector3(), qAve = new THREE.Quaternion(), ejeY = new THREE.Vector3(0, 1, 0);
  const moverAves = t => {
    const T = t * 0.00012;
    bandada.forEach((a, i) => {
      const th = a.fase + T * a.vel;
      posAve.set(Math.cos(th) * a.r + 4, a.h + Math.sin(T * 3 + a.fase) * 1.2, Math.sin(th) * a.r * 0.8 - 14);
      qAve.setFromAxisAngle(ejeY, -th);
      const aleteo = 1 + Math.sin(t * 0.012 + a.ala) * 0.45;
      escAve.set(1.7, aleteo * 1.7, 1.7);
      m4.compose(posAve, qAve, escAve);
      torcazas.setMatrixAt(i, m4);
    });
    torcazas.instanceMatrix.needsUpdate = true;
  };
  escena.add(torcazas);

  // conjunto: mira al agua
  const mirarAgua = (obj, x, z) => { obj.position.set(x, altura(x, z) + 0.05, z); obj.rotation.y = Math.atan2(-x, -z); escena.add(obj); };
  const PUNTOS = {};
  const casa = edificio({ w: 10, d: 6, alto: 1.7, galeria: 2.6 }); mirarAgua(casa, -6, -29); PUNTOS.casa = new THREE.Vector3(-6, 5, -29);
  const quincho = edificio({ w: 6, d: 4, alto: 1.6, galeria: 0, abierto: true }); mirarAgua(quincho, 10, -26); PUNTOS.quincho = new THREE.Vector3(10, 4.5, -26);
  [-48, -18, 12, 42].forEach((deg, i) => {
    const th = deg * Math.PI / 180, x = Math.cos(th) * (AGUA.rx + 12), z = Math.sin(th) * (AGUA.rz + 11);
    mirarAgua(edificio({ w: 3.4, d: 2.8, alto: 1.4, galeria: 1.6 }), x, z);
    if (i === 1) PUNTOS.modulos = new THREE.Vector3(x, 4, z);
  });
  PUNTOS.represa = new THREE.Vector3(0, 2.5, 0);
  PUNTOS.produccion = new THREE.Vector3(60, 6, 190);

  // monte: copas bajas y anchas; las cercanas proyectan sombra
  const copaGeo = new THREE.IcosahedronGeometry(1.7, 1); copaGeo.scale(1.25, .7, 1.25); copaGeo.translate(0, 2.6, 0);
  const cerca = [], lejos = [];
  for (let i = 0; i < 60000 && cerca.length + lejos.length < 9000; i++) {
    const x = (Math.random() - .5) * (MUNDO - 6), z = (Math.random() - .5) * (MUNDO - 6);
    if (enLote(x, z) || enCamino(x, z) || enClaro(x * 1.04, z * 1.04)) continue;
    (Math.hypot(x, z) < 140 ? cerca : lejos).push([x, z]);
  }
  for (let i = 0; i < 40; i++) { // algarrobos sueltos dentro del claro
    const a = Math.random() * 7, r = 0.45 + Math.random() * 0.5, x = Math.cos(a) * CLARO.rx * r, z = Math.sin(a) * CLARO.rz * r;
    if (!enAgua(x, z, 1.5) && Math.hypot(x + 6, z + 29) > 9 && Math.hypot(x - 10, z + 26) > 7 && !enCamino(x, z)) cerca.push([x, z, 1.6]);
  }
  const q = new THREE.Quaternion(), e = new THREE.Vector3(), cc = new THREE.Color();
  const plantar = (lista, sombra) => {
    const im = new THREE.InstancedMesh(copaGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), lista.length);
    lista.forEach(([x, z, k = 1], i) => {
      const s = (0.75 + Math.random() * 0.7) * k;
      q.setFromAxisAngle(e.set(0, 1, 0), Math.random() * 6.28);
      m4.compose(new THREE.Vector3(x, altura(x, z) - .4, z), q, new THREE.Vector3(s, s * (0.8 + Math.random() * .5), s));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, cc.set(Math.random() < .5 ? '#34482a' : '#465a31').offsetHSL(0, 0, (Math.random() - .5) * .07));
    });
    im.castShadow = sombra; im.receiveShadow = true;
    escena.add(im);
  };
  plantar(cerca, sombras); plantar(lejos, false);

  const medir = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix();
  };
  medir();
  addEventListener('resize', medir);
  renderer.compile(escena, camara); // shaders listos antes del primer scroll (evita el tirón del primer cuadro)

  const v = new THREE.Vector3();
  return {
    THREE, camara, PUNTOS,
    pose(p, t) { camara.position.set(p[0], p[1], p[2]); camara.lookAt(t[0], t[1], t[2]); },
    render(tiempo = 0) {
      aguaMat.color.setHSL(0.53, 0.36, 0.25 + Math.sin(tiempo * 0.0006) * 0.012);
      moverAves(tiempo);
      renderer.render(escena, camara);
    },
    proyectar(vec) { v.copy(vec).project(camara); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, visible: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 }; },
  };
}
