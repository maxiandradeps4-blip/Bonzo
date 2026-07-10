const CONFIG={
  maxVersosVisibles:6,
  duracionDesaparecerMs:3200,
  intervalosPalabra:[4,6,2,3,5],
  posicionesPalabra:[3,6,21],
  espaciosMin:7,
  espaciosMax:12,
  lineHeightsDesktop:[0.25,1.25,2.25,4.25,7.25],
  lineHeightsMobile:[1.0,1.25,2.25,4.25,7.25],
  notas:[110,130.8,164.8,185,440,523.25],
  volumen:0.375,
  dry:0.18,
  wet:1.2,
  duracionTono:0.7,
  duracionReverb:6.8,
  decaimientoReverb:2.4,
  movilFontBase:13,
  movilFontMin:9.5
};

let versos=[];
let versosMezclados=[];
let indiceActual=0;
let versosVisibles=0;
let bloqueado=false;
let indiceIntervalo=0;
let restanteParaAnimar=CONFIG.intervalosPalabra[indiceIntervalo];
let audioCtx=null;
let reverbBuffer=null;

const poema=document.getElementById("poema");

iniciar();

async function iniciar(){
  try{versos=await (await fetch("versos.json")).json();}
  catch(e){versos=["conquistar territorios de luz con los dedos","el paisaje se quema como se quema un libro viejo"];}
  versosMezclados=mezclar([...versos]);
  mostrarPrimerVerso();
  document.body.addEventListener("click",manejarInteraccion);
  document.body.addEventListener("touchstart",manejarInteraccion,{passive:true});
  window.addEventListener("orientationchange",revisarOrientacion);
  window.addEventListener("resize",revisarOrientacion);
}

function manejarInteraccion(){
  if(esMovilVertical())return;
  iniciarAudio();
  agregarVerso();
}

function revisarOrientacion(){
  if(esMovilVertical())return;
  document.querySelectorAll(".verso").forEach(ajustarTipografiaMovil);
}

function esMovilVertical(){return window.innerWidth<=768&&window.innerHeight>window.innerWidth;}

function mezclar(lista){
  for(let i=lista.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [lista[i],lista[j]]=[lista[j],lista[i]];
  }
  return lista;
}

function mostrarPrimerVerso(){
  const verso=versosMezclados[0];
  indiceActual=1;
  versosVisibles=1;
  poema.appendChild(crearVerso(verso,contarIntervalo()));
}

function agregarVerso(){
  if(bloqueado||indiceActual>=versosMezclados.length)return;
  if(versosVisibles>=CONFIG.maxVersosVisibles){cambiarBloque();return;}
  const verso=versosMezclados[indiceActual++];
  versosVisibles++;
  poema.appendChild(crearVerso(verso,contarIntervalo()));
  reproducirSonido();
}

function cambiarBloque(){
  bloqueado=true;
  poema.classList.add("desaparece");
  const verso=versosMezclados[indiceActual++];
  setTimeout(()=>{
    poema.innerHTML="";
    poema.classList.remove("desaparece");
    versosVisibles=1;
    poema.appendChild(crearVerso(verso,contarIntervalo()));
    reproducirSonido();
    bloqueado=false;
  },CONFIG.duracionDesaparecerMs);
}

function contarIntervalo(){
  restanteParaAnimar--;
  if(restanteParaAnimar===0){
    indiceIntervalo=(indiceIntervalo+1)%CONFIG.intervalosPalabra.length;
    restanteParaAnimar=CONFIG.intervalosPalabra[indiceIntervalo];
    return true;
  }
  return false;
}

function crearVerso(texto,debeSeparar){
  const div=document.createElement("div");
  div.className="verso";
  const lineHeights=window.innerWidth<=768?CONFIG.lineHeightsMobile:CONFIG.lineHeightsDesktop;
  div.style.lineHeight=elegir(lineHeights);
  if(debeSeparar){div.innerHTML=separarPalabra(texto);}else{div.textContent=texto;}
  requestAnimationFrame(()=>ajustarTipografiaMovil(div));
  return div;
}

function ajustarTipografiaMovil(div){
  if(window.innerWidth>768)return;
  let size=CONFIG.movilFontBase;
  div.style.fontSize=size+"px";
  div.style.whiteSpace="nowrap";
  while(div.scrollWidth>poema.clientWidth&&size>CONFIG.movilFontMin){
    size-=0.25;
    div.style.fontSize=size+"px";
  }
  if(div.scrollWidth>poema.clientWidth){
    div.style.whiteSpace="normal";
    div.style.lineHeight=Math.max(1,parseFloat(div.style.lineHeight)||1);
  }
}

function separarPalabra(texto){
  const palabras=texto.split(" ");
  const posibles=CONFIG.posicionesPalabra.map(p=>p-1).filter(i=>i<palabras.length);
  if(!posibles.length)return texto;
  const idx=elegir(posibles);
  const espacios="&nbsp;".repeat(numeroAleatorio(CONFIG.espaciosMin,CONFIG.espaciosMax));
  return palabras.map((palabra,i)=>i===idx?`${espacios}<span class="palabra-separada">${palabra}</span>`:palabra).join(" ");
}

function elegir(lista){return lista[Math.floor(Math.random()*lista.length)];}
function numeroAleatorio(min,max){return Math.floor(Math.random()*(max-min+1))+min;}

function iniciarAudio(){
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    reverbBuffer=crearReverb(audioCtx,CONFIG.duracionReverb,CONFIG.decaimientoReverb);
  }
  if(audioCtx.state==="suspended")audioCtx.resume();
}

function reproducirSonido(){
  if(!audioCtx)return;
  const osc=audioCtx.createOscillator();
  const master=audioCtx.createGain();
  const dry=audioCtx.createGain();
  const wet=audioCtx.createGain();
  const convolver=audioCtx.createConvolver();
  convolver.buffer=reverbBuffer;
  osc.type="sine";
  osc.frequency.setValueAtTime(elegir(CONFIG.notas),audioCtx.currentTime);
  master.gain.setValueAtTime(0,audioCtx.currentTime);
  master.gain.linearRampToValueAtTime(CONFIG.volumen,audioCtx.currentTime+0.05);
  master.gain.linearRampToValueAtTime(0,audioCtx.currentTime+CONFIG.duracionTono);
  dry.gain.value=CONFIG.dry;
  wet.gain.value=CONFIG.wet;
  osc.connect(master);
  master.connect(dry);
  dry.connect(audioCtx.destination);
  master.connect(convolver);
  convolver.connect(wet);
  wet.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime+CONFIG.duracionTono);
}

function crearReverb(ctx,duracion=4,decaimiento=2){
  const tasa=ctx.sampleRate;
  const largo=tasa*duracion;
  const impulse=ctx.createBuffer(2,largo,tasa);
  for(let canal=0;canal<2;canal++){
    const datos=impulse.getChannelData(canal);
    for(let i=0;i<largo;i++)datos[i]=(Math.random()*2-1)*Math.pow(1-i/largo,decaimiento);
  }
  return impulse;
}
