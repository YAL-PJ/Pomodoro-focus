/**
 * Six hidden things live on this desk.
 *
 * They are deliberately *findable*: the stats view lists six locked slots, so
 * poking around feels like a collection rather than a rumour. None of them
 * touch the timer or your stats — they are pure delight.
 */

import { burst, emojiBurst, centerOf } from "./fx.js";

export const SECRETS = [
  { id: "konami", icon: "🕹️", name: "Disco" },
  { id: "meow", icon: "💗", name: "Meow" },
  { id: "zoomies", icon: "💨", name: "Zoomies" },
  { id: "poster", icon: "📜", name: "Poster" },
  { id: "catnip", icon: "🌿", name: "Catnip" },
  { id: "nightowl", icon: "🦉", name: "Night owl" }
];

const KONAMI = [
  "arrowup", "arrowup", "arrowdown", "arrowdown",
  "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"
];

const POSTER_SLOGANS = [
  "STAY<br>PAWSITIVE",
  "HANG IN<br>THERE",
  "NAPS ARE<br>DEEP WORK",
  "THE DESK<br>IS LAVA",
  "KNOCK IT<br>OFF",
  "YOU'RE<br>DOING GREAT"
];

const DISCO_MS = 16000;

export function createEasterEggs({ stage, sound, unlock, toast }) {
  let keyBuffer = "";
  let plantClicks = [];
  let posterIndex = 0;
  let discoTimer = null;

  function startDisco() {
    unlock("konami");
    document.body.classList.add("disco");
    sound.riff();
    const { x, y } = centerOf(document.getElementById("deskCard"));
    burst(x, y, { count: 40, power: 260 });
    clearTimeout(discoTimer);
    discoTimer = setTimeout(() => document.body.classList.remove("disco"), DISCO_MS);
  }

  function meowStorm() {
    unlock("meow");
    const { x, y } = centerOf(document.getElementById("cat"));
    emojiBurst(x, y - 30, ["💗", "💖", "😻", "💕"], { count: 12 });
    sound.meow();
    setTimeout(() => sound.meow(), 260);
    setTimeout(() => sound.meow(), 520);
  }

  /** Called by the app when the cat has been poked too many times too fast. */
  function zoomies() {
    unlock("zoomies");
    stage.zoomies();
    sound.zoomies();
    toast("ZOOMIES! Nobody is safe.");
  }

  function cyclePoster(posterText, poster) {
    unlock("poster");
    posterIndex = (posterIndex + 1) % POSTER_SLOGANS.length;
    poster.classList.remove("flip");
    void poster.offsetWidth;
    poster.classList.add("flip");
    setTimeout(() => { posterText.innerHTML = POSTER_SLOGANS[posterIndex]; }, 220);
    sound.blip();
  }

  function pokePlant(plant) {
    plant.classList.remove("wiggle");
    void plant.offsetWidth;
    plant.classList.add("wiggle");
    sound.blip(660);

    const { x, y } = centerOf(plant);
    emojiBurst(x, y, ["🍃"], { count: 3, rise: 90 });

    const now = Date.now();
    plantClicks = plantClicks.filter(stamp => now - stamp < 4000);
    plantClicks.push(now);
    if (plantClicks.length < 3) return;

    plantClicks = [];
    unlock("catnip");
    stage.dizzy(4200);
    emojiBurst(centerOf(stage.cat).x, centerOf(stage.cat).y - 20, ["🌿", "✨", "😵‍💫"], { count: 10 });
    toast("It was catnip all along.");
  }

  function attach() {
    const poster = document.getElementById("poster");
    const posterText = document.getElementById("posterText");
    const plant = document.getElementById("plant");

    poster?.addEventListener("click", () => cyclePoster(posterText, poster));
    plant?.addEventListener("click", event => {
      event.stopPropagation();
      pokePlant(plant);
    });

    document.addEventListener("keydown", event => {
      // Ignore typing inside fields; secrets should never fight with input.
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) return;

      // Arrow keys report as "arrowup" etc, so the buffer has to hold ~72 chars
      // for the full Konami sequence to fit.
      keyBuffer = (keyBuffer + event.key.toLowerCase()).slice(-80);
      if (keyBuffer.endsWith(KONAMI.join(""))) startDisco();
      if (keyBuffer.endsWith("meow")) meowStorm();
    });
  }

  /** Visiting between midnight and 5am earns the owl. */
  function checkNightOwl(hour = new Date().getHours()) {
    if (hour >= 0 && hour < 5) unlock("nightowl");
  }

  return { attach, zoomies, checkNightOwl, startDisco };
}
