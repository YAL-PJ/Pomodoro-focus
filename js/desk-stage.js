export class DeskStage {
  constructor(card,cat,item){this.card=card;this.cat=cat;this.item=item;this.clicks=[];}
  render(s){this.card.classList.toggle("break",s.mode==="short");this.card.classList.toggle("paused",!s.running&&s.left<s.total);const start=72,end=92,pos=start+(end-start)*s.progress;this.item.style.left=`${pos}%`;this.cat.style.left=`${Math.max(38,pos-29)}%`;}
  poke(sound){this.cat.classList.add("poked");setTimeout(()=>this.cat.classList.remove("poked"),500);sound.meow();navigator.vibrate?.(18);const now=Date.now();this.clicks=this.clicks.filter(x=>now-x<1200);this.clicks.push(now);if(this.clicks.length>=4){this.cat.classList.add("stare");setTimeout(()=>this.cat.classList.remove("stare"),1800)}}
  crash(){this.card.classList.add("crash");setTimeout(()=>this.card.classList.remove("crash"),900)}
}
