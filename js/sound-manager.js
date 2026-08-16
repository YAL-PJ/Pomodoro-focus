export class SoundManager {
  constructor(){this.ctx=null;this.ambient=null;}
  tone(freq=220,duration=.1,type="sine",volume=.035){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx??=new C();const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+duration);o.connect(g).connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+duration);}
  meow(){this.tone(310,.18,"triangle",.03);setTimeout(()=>this.tone(390,.22,"triangle",.025),90)}
  clink(){this.tone(1200,.08,"sine",.025)}
  can(){this.tone(600,.09,"square",.025);setTimeout(()=>this.tone(180,.3,"sawtooth",.015),70)}
  crash(){[100,80,65].forEach((f,i)=>setTimeout(()=>this.tone(f,.35,"square",.045),i*60))}
  setAmbient(on){if(!on){clearInterval(this.ambient);this.ambient=null;return}this.tone(65,.4,"sine",.015);this.ambient=setInterval(()=>this.tone(55+Math.random()*8,.8,"sine",.012),1200)}
}
