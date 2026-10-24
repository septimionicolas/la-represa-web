/* Ambiente de campo sintetizado con Web Audio (0 KB de audio): viento suave, agua de la represa y pájaros.
 * Apagado por defecto (los navegadores bloquean el sonido automático); botón ♪ abajo a la izquierda; recuerda la elección. */
(function () {
    'use strict';
    var ACENTO = '#A8703F', clave = 'lr-ambiente';
    var ctx, master, analizador, encendido = false, timerAves = null, nodos = [];
    var guardar = function (v) { try { localStorage.setItem(clave, v ? '1' : '0'); } catch (e) {} };
    var leer = function () { try { return localStorage.getItem(clave) === '1'; } catch (e) { return false; } };
    var medir = function (n) { try { if (window.gtag) { window.gtag('event', n, {}); } } catch (e) {} };

    function ruido(seg) {
        var b = ctx.createBuffer(1, ctx.sampleRate * seg, ctx.sampleRate), d = b.getChannelData(0), x = 0;
        for (var i = 0; i < d.length; i++) { x = (x + (Math.random() * 2 - 1)) * 0.5; d[i] = x; } // ruido rosado aproximado
        var s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s;
    }
    function lfo(hz, prof, destino, base) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = hz; g.gain.value = prof;
        if (base !== undefined) { destino.value = base; }
        o.connect(g); g.connect(destino); o.start(); nodos.push(o);
    }
    function viento() {
        var s = ruido(4), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.Q.value = 0.6;
        lfo(0.07, 220, f.frequency, 420);
        lfo(0.11, 0.08, g.gain, 0.16);
        s.connect(f); f.connect(g); g.connect(master); s.start(); nodos.push(s);
    }
    function agua() {
        var s = ruido(3), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.4;
        lfo(0.35, 0.025, g.gain, 0.07);
        s.connect(f); f.connect(g); g.connect(master); s.start(); nodos.push(s);
    }
    function pajaro() {
        if (!encendido) { return; }
        var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
        var base = 1800 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4);
        o.type = 'sine'; p.pan.value = Math.random() * 1.6 - 0.8;
        g.gain.setValueAtTime(0, t);
        for (var i = 0; i < n; i++) {
            var a = t + i * 0.16;
            o.frequency.setValueAtTime(base, a);
            o.frequency.exponentialRampToValueAtTime(base * 1.5, a + 0.05);
            o.frequency.exponentialRampToValueAtTime(base * 0.9, a + 0.12);
            g.gain.linearRampToValueAtTime(0.05, a + 0.02);
            g.gain.linearRampToValueAtTime(0, a + 0.13);
        }
        o.connect(g); g.connect(p); p.connect(master); o.start(t); o.stop(t + n * 0.16 + 0.1);
        timerAves = window.setTimeout(pajaro, 1500 + Math.random() * 5000);
    }
    function armar() {
        if (ctx) { return; }
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0;
        analizador = ctx.createAnalyser(); analizador.fftSize = 1024;
        master.connect(analizador); analizador.connect(ctx.destination);
        viento(); agua();
    }
    function prender() {
        armar();
        if (ctx.state !== 'running') { ctx.resume(); }
        encendido = true; guardar(true); pintar();
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
        window.clearTimeout(timerAves); timerAves = window.setTimeout(pajaro, 800);
        medir('lr_ambiente_on');
    }
    function apagar(sinGuardar) {
        encendido = false; if (!sinGuardar) { guardar(false); } pintar();
        window.clearTimeout(timerAves);
        if (!ctx) { return; }
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
        window.setTimeout(function () { if (!encendido && ctx.state === 'running') { ctx.suspend(); } }, 1400);
        if (!sinGuardar) { medir('lr_ambiente_off'); }
    }
    var boton;
    function pintar() {
        if (!boton) { return; }
        boton.classList.toggle('is-on', encendido);
        boton.querySelector('.bew-son__t').textContent = encendido ? 'Silenciar' : 'Sonido del campo';
        boton.setAttribute('aria-pressed', encendido ? 'true' : 'false');
    }
    function crearBoton() {
        var css = document.createElement('style');
        css.textContent = '.bew-son{position:fixed;left:14px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:9px;padding:9px 14px 9px 11px;border:0;border-radius:999px;cursor:pointer;font:600 11px/1 Barlow,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#F3ECDD;background:rgba(10,32,41,.78);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 0 0 1px rgba(243,236,221,.18),0 8px 24px rgba(0,0,0,.4);transition:transform .2s,box-shadow .2s;-webkit-tap-highlight-color:transparent}.bew-son:hover{transform:translateY(-2px)}.bew-son:focus-visible{outline:2px solid ' + ACENTO + ';outline-offset:3px}.bew-son__eq{display:flex;align-items:flex-end;gap:2px;width:16px;height:14px}.bew-son__eq i{display:block;width:3px;height:30%;border-radius:2px;background:' + ACENTO + '}.bew-son.is-on{box-shadow:0 0 0 1px ' + ACENTO + ',0 0 22px ' + ACENTO + '66,0 8px 24px rgba(0,0,0,.4)}.bew-son.is-on .bew-son__eq i{animation:bewEq 1.4s ease-in-out infinite}.bew-son.is-on .bew-son__eq i:nth-child(2){animation-delay:.3s}.bew-son.is-on .bew-son__eq i:nth-child(3){animation-delay:.6s}.bew-son.is-on .bew-son__eq i:nth-child(4){animation-delay:.9s}@keyframes bewEq{0%,100%{height:25%}50%{height:100%}}@media (prefers-reduced-motion:reduce){.bew-son.is-on .bew-son__eq i{animation:none}}';
        document.head.appendChild(css);
        boton = document.createElement('button');
        boton.type = 'button'; boton.className = 'bew-son'; boton.setAttribute('aria-label', 'Sonido del campo: activar o silenciar');
        boton.innerHTML = '<span class="bew-son__eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="bew-son__t">Sonido del campo</span>';
        boton.addEventListener('click', function () { if (encendido) { apagar(false); } else { prender(); } });
        document.body.appendChild(boton);
        pintar();
    }
    function iniciar() {
        crearBoton();
        if (leer()) {
            var primero = function () { document.removeEventListener('pointerdown', primero, true); if (!encendido) { prender(); } };
            document.addEventListener('pointerdown', primero, true);
        }
        document.addEventListener('visibilitychange', function () {
            if (document.hidden && encendido) { apagar(true); encendido = false; boton.dataset.volver = '1'; pintar(); }
            else if (!document.hidden && boton.dataset.volver === '1') { boton.dataset.volver = ''; prender(); }
        });
        window.__bewSonido = { prender: prender, apagar: function () { apagar(false); }, nivel: function () { if (!analizador) { return 0; } var d = new Uint8Array(analizador.fftSize); analizador.getByteTimeDomainData(d); var s = 0; for (var i = 0; i < d.length; i++) { var v = (d[i] - 128) / 128; s += v * v; } return Math.sqrt(s / d.length); } };
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', iniciar); } else { iniciar(); }
})();
