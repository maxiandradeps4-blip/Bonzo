const CONFIG = {
  maxVersosVisibles: 6,
  duracionDesaparecerMs: 3200,
  intervalosPalabra: [4, 6, 2, 3, 5],
  posicionesPalabra: [3, 6, 21],
  espaciosMin: 7,
  espaciosMax: 12,
  lineHeightsDesktop: [0.25, 1.25, 2.25, 4.25, 7.25],
  lineHeightsMobile: [1.0, 1.25, 2.25, 4.25, 7.25],
  notas: [110.0, 130.8, 164.8, 185.0, 440.0, 523.25],
  volumen: 0.375,
  dry: 0.18,
  wet: 0.8,
  duracionTono: 0.7
};

let versos = [];
let versosMezclados = [];
let indiceActual = 0;
let versosVisibles = 0;
let bloqueado = false;
let indiceIntervalo = 0;
let restanteParaAnimar = CONFIG.intervalosPalabra[indiceIntervalo];
let audioCtx = null;
let reverbBuffer = null;

const poema = document.getElementById("poema");
const aviso = document.getElementById("aviso");

iniciar();

async function iniciar() {
  try {
    const respuesta = await fetch("versos.json");
    versos = await respuesta.json();
  } catch (error) {
    versos = ["conquistar territorios de luz con los dedos", "el paisaje se quema como se quema un libro viejo", "nadie lee fuego mientras todo se está quemando"];
  }
  versosMezclados = mezclar([...versos]);
  mostrarPrimerVerso();
  document.body.addEventListener("click", agregarVerso);
  document.body.addEventListener("touchstart", agregarVerso, { passive: true });
}

function mezclar(lista) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

function mostrarPrimerVerso() {
  const verso = versosMezclados[0];
  indiceActual = 1;
  versosVisibles = 1;
  const debeAnimar = contarIntervalo();
  poema.appendChild(crearVerso(verso, debeAnimar));
}

function agregarVerso() {
  iniciarAudio();
  aviso.classList.add("oculto");
  if (bloqueado) return;
  if (indiceActual >= versosMezclados.length) return;
  if (versosVisibles >= CONFIG.maxVersosVisibles) {
    cambiarBloque();
    return;
  }
  const verso = versosMezclados[indiceActual++];
  versosVisibles++;
  const debeAnimar = contarIntervalo();
  poema.appendChild(crearVerso(verso, debeAnimar));
  reproducirSonido();
}

function cambiarBloque() {
  bloqueado = true;
  poema.classList.add("desaparece");
  const verso = versosMezclados[indiceActual++];
  setTimeout(() => {
    poema.innerHTML = "";
    poema.classList.remove("desaparece");
    versosVisibles = 1;
    const debeAnimar = contarIntervalo();
    poema.appendChild(crearVerso(verso, debeAnimar));
    reproducirSonido();
    bloqueado = false;
  }, CONFIG.duracionDesaparecerMs);
}

function contarIntervalo() {
  restanteParaAnimar--;
  if (restanteParaAnimar === 0) {
    siguienteIntervalo();
    return true;
  }
  return false;
}

function siguienteIntervalo() {
  indiceIntervalo = (indiceIntervalo + 1) % CONFIG.intervalosPalabra.length;
  restanteParaAnimar = CONFIG.intervalosPalabra[indiceIntervalo];
}

function crearVerso(texto, debeAnimar) {
  const div = document.createElement("div");
  div.className = "verso";
  const lineHeights = window.innerWidth <= 768 ? CONFIG.lineHeightsMobile : CONFIG.lineHeightsDesktop;
  div.style.lineHeight = elegir(lineHeights);
  div.innerHTML = debeAnimar ? separarPalabra(texto) : escapar(texto);
  return div;
}

function separarPalabra(texto) {
  const palabras = texto.split(" ");
  const posibles = CONFIG.posicionesPalabra.map(p => p - 1).filter(i => i < palabras.length);
  if (!posibles.length) return escapar(texto);
  const indiceEspecial = elegir(posibles);
  const espacios = "&nbsp;".repeat(numeroAleatorio(CONFIG.espaciosMin, CONFIG.espaciosMax));
  return palabras.map((palabra, i) => i === indiceEspecial ? `${espacios}<span class="palabra-separada">${escapar(palabra)}</span>` : escapar(palabra)).join(" ");
}

function escapar(texto) {
  return texto.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function elegir(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
function numeroAleatorio(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function iniciarAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    reverbBuffer = crearReverb(audioCtx, 4.8, 2.6);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function reproducirSonido() {
  if (!audioCtx) return;
  const freq = elegir(CONFIG.notas);
  const osc = audioCtx.createOscillator();
  const master = audioCtx.createGain();
  const dry = audioCtx.createGain();
  const wet = audioCtx.createGain();
  const convolver = audioCtx.createConvolver();
  convolver.buffer = reverbBuffer;
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  master.gain.setValueAtTime(0, audioCtx.currentTime);
  master.gain.linearRampToValueAtTime(CONFIG.volumen, audioCtx.currentTime + 0.05);
  master.gain.linearRampToValueAtTime(0, audioCtx.currentTime + CONFIG.duracionTono);
  dry.gain.value = CONFIG.dry;
  wet.gain.value = CONFIG.wet;
  osc.connect(master);
  master.connect(dry);
  dry.connect(audioCtx.destination);
  master.connect(convolver);
  convolver.connect(wet);
  wet.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + CONFIG.duracionTono);
}

function crearReverb(ctx, duracion = 4, decaimiento = 2) {
  const tasa = ctx.sampleRate;
  const largo = tasa * duracion;
  const impulse = ctx.createBuffer(2, largo, tasa);
  for (let canal = 0; canal < 2; canal++) {
    const datos = impulse.getChannelData(canal);
    for (let i = 0; i < largo; i++) {
      datos[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, decaimiento);
    }
  }
  return impulse;
}
