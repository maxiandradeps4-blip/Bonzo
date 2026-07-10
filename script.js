const CONFIG={
  maxVersosVisibles:6,
  duracionDesaparecerMs:3200,
  intervalosPalabra:[4,6,2,3,5],
  posicionesPalabra:[3,6,21],
  espaciosMin:7,
  espaciosMax:12,

  // distancia variable entre versos distintos
  espaciosEntreVersosDesktop:[0.25,1.25,2.25,4.25,7.25],
  espaciosEntreVersosMobile:[0.5,1,1.5,2.5,4],

  sonidos:["sonidos/la.wav","sonidos/do.wav","sonidos/mi.wav","sonidos/fa_sostenido.wav"],
  volumenSonido:0.9
};

let versos=[],versosMezclados=[],indiceActual=0,versosVisibles=0,bloqueado=false;
let indiceIntervalo=0,restanteParaAnimar=CONFIG.intervalosPalabra[indiceIntervalo];
let audioDesbloqueado=false;
let bancoSonidos=[];
const poema=document.getElementById("poema");

iniciar();

async function iniciar(){
  try{versos=await (await fetch("versos.json")).json();}
  catch(e){versos=["conquistar territorios de luz con los dedos","el paisaje se quema como se quema un libro viejo"];}
  versosMezclados=mezclar([...versos]);
  mostrarPrimerVerso();
  document.body.addEventListener("pointerdown",manejarInteraccion);
}

async function manejarInteraccion(){
  await iniciarAudio();
  if(bloqueado||indiceActual>=versosMezclados.length)return;

  if(versosVisibles>=CONFIG.maxVersosVisibles){
    cambiarBloque();
    return;
  }

  const verso=versosMezclados[indiceActual++];
  versosVisibles++;
  poema.appendChild(crearVerso(verso,contarIntervalo()));
  reproducirSonido();
}

function mezclar(lista){
  for(let i=lista.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [lista[i],lista[j]]=[lista[j],lista[i]];
  }
  return lista;
}

function mostrarPrimerVerso(){
  indiceActual=1;
  versosVisibles=1;
  poema.appendChild(crearVerso(versosMezclados[0],contarIntervalo()));
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

  // El interlineado interno queda fijo; lo variable es el espacio entre versos.
  div.style.lineHeight=window.innerWidth<=768 ? "1.25" : "1.25";

  const espacios=window.innerWidth<=768
    ? CONFIG.espaciosEntreVersosMobile
    : CONFIG.espaciosEntreVersosDesktop;

  div.style.marginBottom=elegir(espacios)+"em";

  if(debeSeparar) div.innerHTML=separarPalabra(texto);
  else div.textContent=texto;

  return div;
}

function separarPalabra(texto){
  const palabras=texto.split(" ");
  const posibles=CONFIG.posicionesPalabra.map(p=>p-1).filter(i=>i<palabras.length);
  if(!posibles.length)return texto;

  const idx=elegir(posibles);
  const espacios="&nbsp;".repeat(numeroAleatorio(CONFIG.espaciosMin,CONFIG.espaciosMax));

  return palabras.map((palabra,i)=>{
    if(i===idx)return `${espacios}<span class="palabra-separada">${palabra}</span>`;
    return palabra;
  }).join(" ");
}

function elegir(lista){return lista[Math.floor(Math.random()*lista.length)]}
function numeroAleatorio(min,max){return Math.floor(Math.random()*(max-min+1))+min}

async function iniciarAudio(){
  if(!bancoSonidos.length){
    bancoSonidos=CONFIG.sonidos.map(ruta=>{
      const audio=new Audio(ruta);
      audio.preload="auto";
      audio.volume=CONFIG.volumenSonido;
      return audio;
    });
  }
  if(!audioDesbloqueado){
    for(const audio of bancoSonidos){
      try{
        const volumen=audio.volume;
        audio.volume=0;
        await audio.play();
        audio.pause();
        audio.currentTime=0;
        audio.volume=volumen;
      }catch(e){}
    }
    audioDesbloqueado=true;
  }
}

function reproducirSonido(){
  if(!bancoSonidos.length)return;
  const base=bancoSonidos[Math.floor(Math.random()*bancoSonidos.length)];
  const audio=base.cloneNode(true);
  audio.volume=CONFIG.volumenSonido;
  audio.currentTime=0;
  const promesa=audio.play();
  if(promesa && typeof promesa.catch==="function")promesa.catch(()=>{});
}
