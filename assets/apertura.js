// Apertura de La Represa: 5 momentos de cámara guiados por el scroll (ida y vuelta)
// y un modo libre para recorrer a mano con tutorial de gestos y puntos.
import { crearEscena } from './escena.js';

const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
// En BewPro la página vive dentro de un Shadow DOM (theme.js define __lrRaiz y __lrClase); suelta, en el documento.
const R = window.__lrRaiz || document;
const $ = s => R.querySelector(s);
const sec = $('#lugar'), lienzo = $('#lienzo'), raiz = window.__lrClase || document.documentElement;
const conWebGL = (() => { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); })();

// A = pose al entrar al momento, B = pose al salir (deriva lenta). [posición, objetivo]
const MOMENTOS = [
  // en celular el agua va al centro: el texto ocupa la parte de abajo, no la izquierda
  { A: [[-150, 95, 150], [-58, 0, -38]], B: [[-92, 52, 92], [-44, 0, -32]], celA: [[-95, 95, 120], [-6, 0, -12]], celB: [[-62, 62, 80], [-4, 0, -14]] },
  { A: [[-52, 22, 58], [2, 0, -4]], B: [[-30, 16, 60], [6, 0, -6]] },
  { A: [[-2, 20, 46], [-14, 2, -24]], B: [[-6, 11, 20], [-16, 2, -26]] },
  { A: [[-8, 2.2, -21], [20, 0.8, 10]], B: [[-9, 2.2, -21.5], [25, 0.8, 3]] },
  { A: [[40, 90, 260], [20, 0, 120]], B: [[90, 230, 420], [40, 0, 80]] },
];
const RETENER = 0.72;
const suave = k => k * k * (3 - 2 * k);
const mezclar = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const vertical = () => innerWidth < innerHeight;
const ajustar = ([p, t], propio) => {
  if (!vertical() || propio) return [p, t];
  const k = 1.45; // en celular la cámara se aleja para que entre el conjunto
  return [t.map((v, i) => v + (p[i] - v) * k), t];
};
function poseScroll(prog) {
  const n = MOMENTOS.length, s = Math.min(prog * n, n - 1e-6), i = Math.floor(s), f = s - i;
  const cel = m => vertical() && m.celA ? { A: m.celA, B: m.celB } : m;
  const m = cel(MOMENTOS[i]);
  let pose;
  if (f < RETENER || i === n - 1) {
    const k = suave(Math.min(1, f / (i === n - 1 ? 1 : RETENER)));
    pose = [mezclar(m.A[0], m.B[0], k), mezclar(m.A[1], m.B[1], k)];
  } else {
    const k = suave((f - RETENER) / (1 - RETENER)), sig = cel(MOMENTOS[i + 1]);
    pose = [mezclar(m.B[0], sig.A[0], k), mezclar(m.B[1], sig.A[1], k)];
  }
  return { pose: ajustar(pose, !!MOMENTOS[i].celA), i, f };
}

/* ---------- textos de cada momento ---------- */
const textos = [...R.querySelectorAll('.momento')];
const rail = [...R.querySelectorAll('.rail button')];
const progreso = () => {
  const r = sec.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / (sec.offsetHeight - innerHeight)));
};
let actual = -1;
const marcar = (i, f) => {
  const ver = i === 0 ? f < RETENER : f > 0.05 && f < RETENER + 0.04;
  textos.forEach((t, k) => t.classList.toggle('ver', k === i && (ver || quieto)));
  if (i !== actual) {
    actual = i;
    rail.forEach((b, k) => { b.classList.toggle('activo', k === i); b.setAttribute('aria-current', k === i ? 'step' : 'false'); });
    sec.dataset.momento = i;
  }
};
const irA = i => {
  const top = sec.getBoundingClientRect().top + scrollY + (sec.offsetHeight - innerHeight) * ((i + 0.3) / MOMENTOS.length);
  scrollTo({ top, behavior: quieto ? 'auto' : 'smooth' });
};
rail.forEach((b, i) => b.addEventListener('click', () => irA(i)));
$('#explorar').addEventListener('click', () => irA(1));

/* ---------- sin WebGL o con movimiento reducido: imágenes fijas ---------- */
function modoFijo() {
  raiz.classList.add('apertura-fija');
  $('#carga').classList.add('fuera');
  const cuadro = () => { const { i, f } = poseScroll(progreso()); marcar(i, f); };
  addEventListener('scroll', () => requestAnimationFrame(cuadro), { passive: true });
  cuadro();
}

/* ---------- 3D ---------- */
function modo3D() {
  const esc = crearEscena(lienzo, { sombras: !vertical() });
  const { THREE, camara, PUNTOS } = esc;
  let libre = null; // estado del modo libre; null = cámara del scroll
  let ultimo = performance.now();

  const cuadro = t => {
    const { pose, i, f } = poseScroll(progreso());
    if (libre) {
      libre.paso(t);
    } else {
      // respiración mínima de la cámara cuando el visitante está quieto
      const r = Math.min(1, (t - ultimo) / 1500) * 0.35;
      const p = pose[0].map((v, k) => v + (k === 1 ? Math.sin(t * 0.0005) : Math.sin(t * 0.0003 + k)) * r);
      esc.pose(p, pose[1]);
      marcar(i, f);
    }
    esc.render(t);
    if (libre) libre.puntos();
    requestAnimationFrame(cuadro);
  };
  addEventListener('scroll', () => { ultimo = performance.now(); }, { passive: true });
  requestAnimationFrame(t => { cuadro(t); $('#carga').classList.add('fuera'); raiz.classList.add('apertura-3d'); });

  /* ---------- modo libre ---------- */
  const capa = $('#libre'), tuto = $('#tuto'), cajon = $('#cajon'), capaPuntos = $('#puntos');
  const tactil = matchMedia('(pointer: coarse)').matches;
  const PASOS = [
    ['Arrastrá para girar', tactil ? 'Deslizá un dedo sobre la escena' : 'Mantené apretado y arrastrá'],
    [tactil ? 'Pellizcá para acercarte' : 'Usá la rueda para acercarte', 'Mirá el conjunto de cerca'],
    ['Tocá un punto', 'Cada punto cuenta una parte del lugar'],
  ];
  const SECTORES = [
    { id: 'represa', t: 'La represa', x: 'El pulmón del campo: un espejo de agua en el punto donde corre el agua. Objetivo del proyecto: 3.500 m² y 2 m de profundidad media.', e: 'Proyectado' },
    { id: 'casa', t: 'Casa principal', x: 'Una casa de una planta con galería orientada al agua.', e: 'Proyectada' },
    { id: 'quincho', t: 'Quincho', x: 'Un quincho abierto junto a la casa, para compartir frente al agua.', e: 'Proyectado' },
    { id: 'modulos', t: 'Módulos para huéspedes', x: 'Tres o cuatro módulos independientes, con buena vista y galería propia.', e: 'Proyectados' },
    { id: 'produccion', t: 'Producción', x: 'Alrededor del agua, un campo de aproximadamente 2.200 hectáreas que es la base de nuestra producción rural.', e: 'Actividad del grupo' },
  ];
  let paso = 0, giro = 0, zoom = 0;
  const cam = { tx: 0, tz: -8, dist: 120, polar: 1.0, azim: -0.6 };
  let vuelo = null;
  const volar = (dest, ms = 1400) => {
    const desde = { ...cam }, t0 = performance.now();
    vuelo = t => { const k = Math.min(1, (t - t0) / ms), s = suave(k); for (const c in dest) cam[c] = desde[c] + (dest[c] - desde[c]) * s; if (k >= 1) vuelo = null; };
  };
  const pasoTuto = n => {
    paso = n;
    tuto.classList.toggle('fuera', n >= PASOS.length);
    if (n < PASOS.length) { tuto.dataset.paso = n; tuto.querySelector('b').textContent = PASOS[n][0]; tuto.querySelector('small').textContent = PASOS[n][1]; }
  };
  const puntos = SECTORES.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'punto';
    b.innerHTML = `<span aria-hidden="true">+</span><em>${s.t}</em>`;
    b.setAttribute('aria-label', 'Ver ' + s.t);
    b.addEventListener('click', () => abrirSector(i));
    capaPuntos.appendChild(b);
    return b;
  });
  const abrirSector = i => {
    const s = SECTORES[i], v = PUNTOS[s.id];
    volar({ tx: v.x, tz: v.z, dist: s.id === 'produccion' ? 200 : 46, polar: s.id === 'produccion' ? 0.9 : 1.05 });
    cajon.querySelector('.estado').textContent = s.e;
    cajon.querySelector('h3').textContent = s.t;
    cajon.querySelector('.texto').textContent = s.x;
    cajon.classList.add('abierto'); cajon.setAttribute('aria-hidden', 'false');
    puntos.forEach((b, k) => b.classList.toggle('activo', k === i));
    if (paso < PASOS.length) pasoTuto(PASOS.length);
  };
  const cerrarCajon = () => {
    cajon.classList.remove('abierto'); cajon.setAttribute('aria-hidden', 'true');
    puntos.forEach(b => b.classList.remove('activo'));
    volar({ tx: 0, tz: -8, dist: 120, polar: 1.0 });
  };
  cajon.querySelector('.cerrar').addEventListener('click', cerrarCajon);

  const punteros = new Map();
  let pinch = 0;
  const acercar = d => { cam.dist = THREE.MathUtils.clamp(cam.dist + d * 0.12, 22, 320); vuelo = null; zoom += Math.abs(d); if (paso === 1 && zoom > 300) pasoTuto(2); };
  lienzo.addEventListener('pointerdown', ev => { if (!libre) return; lienzo.setPointerCapture(ev.pointerId); punteros.set(ev.pointerId, [ev.clientX, ev.clientY]); });
  const soltar = ev => { punteros.delete(ev.pointerId); pinch = 0; };
  lienzo.addEventListener('pointerup', soltar); lienzo.addEventListener('pointercancel', soltar);
  lienzo.addEventListener('pointermove', ev => {
    if (!libre || !punteros.has(ev.pointerId)) return;
    const [x0, y0] = punteros.get(ev.pointerId);
    punteros.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (punteros.size === 2) {
      const [a, b] = [...punteros.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) acercar((pinch - d) * 6);
      pinch = d; return;
    }
    cam.azim -= (ev.clientX - x0) * 0.006;
    cam.polar = THREE.MathUtils.clamp(cam.polar - (ev.clientY - y0) * 0.004, 0.35, 1.42);
    vuelo = null;
    giro += Math.hypot(ev.clientX - x0, ev.clientY - y0);
    if (paso === 0 && giro > 160) pasoTuto(1);
  });
  lienzo.addEventListener('wheel', ev => { if (!libre) return; ev.preventDefault(); acercar(ev.deltaY); }, { passive: false });

  const entrarLibre = () => {
    // arranca desde donde dejó el scroll
    const d = camara.position.clone().sub(new THREE.Vector3(0, 0, -8));
    Object.assign(cam, { tx: 0, tz: -8, dist: THREE.MathUtils.clamp(d.length(), 40, 320), polar: Math.acos(THREE.MathUtils.clamp(d.y / d.length(), -1, 1)), azim: Math.atan2(d.x, d.z) });
    volar({ dist: 120, polar: 1.0 }, 1200);
    giro = zoom = 0;
    pasoTuto(paso >= PASOS.length ? PASOS.length : 0);
    raiz.classList.add('en-libre');
    capa.hidden = false;
    // se bloquea en <html>: en <body> lo volvería su propio contenedor de scroll y la escena fija se iría de pantalla
    document.documentElement.style.overflow = 'hidden';
    libre = {
      paso(t) {
        if (vuelo) vuelo(t);
        const sp = Math.sin(cam.polar);
        esc.pose([cam.tx + cam.dist * sp * Math.sin(cam.azim), Math.max(1.5, cam.dist * Math.cos(cam.polar)), cam.tz + cam.dist * sp * Math.cos(cam.azim)], [cam.tx, 0, cam.tz]);
      },
      puntos() {
        SECTORES.forEach((s, i) => {
          const p = esc.proyectar(PUNTOS[s.id]);
          puntos[i].style.transform = `translate(${p.x}px,${p.y}px)`;
          puntos[i].classList.toggle('ver', p.visible);
        });
      },
    };
    $('#volver-recorrido').focus({ preventScroll: true });
  };
  const salirLibre = () => {
    if (!libre) return;
    libre = null;
    cajon.classList.remove('abierto'); cajon.setAttribute('aria-hidden', 'true');
    raiz.classList.remove('en-libre');
    capa.hidden = true;
    document.documentElement.style.overflow = '';
  };
  R.querySelectorAll('.abrir-libre').forEach(b => { b.hidden = false; b.addEventListener('click', entrarLibre); });
  $('#volver-recorrido').addEventListener('click', salirLibre);
  addEventListener('keydown', ev => {
    if (!libre || ev.key !== 'Escape') return;
    cajon.classList.contains('abierto') ? cerrarCajon() : salirLibre();
  });
}

if (conWebGL && !quieto) {
  try { modo3D(); } catch (e) { console.error(e); modoFijo(); }
} else modoFijo();
