// ThePlug : code partagé par toutes les pages.
// Démo : tout est stocké dans ton navigateur (localStorage + IndexedDB pour les fichiers audio).

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CLE = "theplug";
const GENRES = ["Trap", "Drill", "Boom bap", "Lo-fi", "R&B", "Afrobeat", "Soul / Funk", "Électro", "Pop", "Autre"];
const ROLES = ["Beatmaker", "Rappeur / Rappeuse", "Les deux"];
const TEINTES = ["#b44bff", "#ff4f9a", "#4d6bff", "#19c3a8", "#ffd23f"];

// ----- Icônes -----
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONES = {
  home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  amis: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.5 2.6 3.5 5.5"/>'),
  plug: svg('<path d="M9 2v5M15 2v5"/><path d="M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>'),
  compte: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>'),
  loupe: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>')
};

// ----- Données de départ : 3 artistes de démonstration -----
function graine() {
  const j = 864e5, n = Date.now();
  return {
    session: null,
    users: [
      { email: "kolo@demo", nom: "Kolo Beats", role: ROLES[0], genre: "Boom bap", bio: "Boom bap et samples soul.", amis: [], demo: true, enLigne: true },
      { email: "mina@demo", nom: "Mina Flow", role: ROLES[1], genre: "Rap", bio: "Rap conscient, cherche des prods mélancoliques.", amis: [], demo: true, enLigne: false },
      { email: "sable@demo", nom: "DJ Sable", role: ROLES[0], genre: "Lo-fi", bio: "Instrus lo-fi et jersey club.", amis: [], demo: true, enLigne: true }
    ],
    sons: [
      { id: "d1", auteur: "kolo@demo", titre: "Soul Crate Vol.1", genre: "Boom bap", date: n - j, likes: ["mina@demo", "sable@demo"], fichier: false },
      { id: "d2", auteur: "sable@demo", titre: "Midnight Drive", genre: "Lo-fi", date: n - 2 * j, likes: ["kolo@demo"], fichier: false },
      { id: "d3", auteur: "mina@demo", titre: "Lettre ouverte (a cappella)", genre: "Drill", date: n - 3 * j, likes: [], fichier: false }
    ],
    messages: []
  };
}

function charger() {
  try { const d = JSON.parse(localStorage.getItem(CLE)); if (d && d.users) return d; } catch {}
  return graine();
}
let db = charger();
function sauver() { try { localStorage.setItem(CLE, JSON.stringify(db)); } catch {} }
// Recharge les données, applique la modification, puis sauvegarde
function muter(fn) { db = charger(); fn(); sauver(); }

const moi = () => db.users.find(u => u.email === db.session);
const parEmail = (e) => db.users.find(u => u.email === e);
const enLigne = (u) => u.demo ? u.enLigne : Date.now() - (u.vu || 0) < 45000;
const dateFr = (d) => new Date(d).toLocaleDateString("fr-FR");
const avatar = (u, g = "") =>
  `<span class="avatar ${g}" style="background:${u.teinte || TEINTES[0]}">${esc((u.nom || "?").trim()[0].toUpperCase())}</span>`;

// ----- Fichiers audio : IndexedDB (trop gros pour localStorage) -----
const idb = {
  ouvrir() {
    return new Promise((ok, ko) => {
      const r = indexedDB.open("theplug", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("fichiers");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  },
  async mettre(cle, blob) {
    const d = await this.ouvrir();
    return new Promise((ok, ko) => {
      const t = d.transaction("fichiers", "readwrite");
      t.objectStore("fichiers").put(blob, cle);
      t.oncomplete = ok;
      t.onerror = () => ko(t.error);
    });
  },
  async lire(cle) {
    const d = await this.ouvrir();
    return new Promise((ok, ko) => {
      const q = d.transaction("fichiers").objectStore("fichiers").get(cle);
      q.onsuccess = () => ok(q.result);
      q.onerror = () => ko(q.error);
    });
  }
};

// ----- Comptes -----
async function hasher(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function inscrire(email, nom, mdp) {
  db = charger();
  if (db.users.some(u => u.email === email)) return "Cette adresse e-mail a déjà un compte.";
  if (db.users.some(u => u.nom.toLowerCase() === nom.toLowerCase())) return "Ce nom d’artiste est déjà pris.";
  const h = await hasher(email + ":" + mdp);
  muter(() => {
    db.users.push({ email, nom, role: ROLES[0], genre: "", bio: "", teinte: TEINTES[0], amis: [], mdp: h, vu: Date.now() });
    db.session = email;
  });
  return null;
}
async function connecter(email, mdp) {
  db = charger();
  const u = db.users.find(u => u.email === email);
  if (!u || !u.mdp || u.mdp !== await hasher(email + ":" + mdp)) return "Adresse e-mail ou mot de passe incorrect.";
  muter(() => { db.session = email; });
  return null;
}

// ----- Coque commune : en-tête, recherche, menu (toutes les pages connectées) -----
let rafraichir = () => {};
let battement = null;

function coque(actif) {
  if (!moi()) { location.replace("connexion.html"); return null; }
  const vu = () => muter(() => { const u = moi(); if (u) u.vu = Date.now(); });
  vu();
  if (!battement) battement = setInterval(vu, 20000); // sert à savoir qui est « en ligne »

  const q = new URLSearchParams(location.search).get("q") || "";
  const items = [["home", "home.html", "Accueil"], ["amis", "amis.html", "Amis"], ["plug", "plug.html", "Plug"], ["compte", "compte.html", "Mon compte"]];
  $("#app").innerHTML = `
    <header class="haut">
      <a class="logo" href="home.html">ThePlug</a>
      <form class="recherche" action="home.html" role="search">
        <input name="q" value="${esc(q)}" placeholder="Rechercher un son, un genre ou un artiste…" aria-label="Recherche">
        <button aria-label="Lancer la recherche">${ICONES.loupe}</button>
      </form>
      <button id="quitter" class="lien">Déconnexion</button>
    </header>
    <nav class="menu" aria-label="Navigation">
      ${items.map(([k, h, t]) => `<a href="${h}" class="${k === actif ? "actif" : ""} ${k === "plug" ? "plug" : ""}" ${k === actif ? 'aria-current="page"' : ""}>${ICONES[k]}<span>${t}</span></a>`).join("")}
    </nav>
    <main id="contenu"></main>`;
  return $("#contenu");
}

// ----- Cartes -----
const score = (s) => s.likes.length * 3 + Math.max(0, 7 - (Date.now() - s.date) / 864e5);

function carteSon(s) {
  const a = parEmail(s.auteur) || { nom: "Inconnu" }, m = moi();
  const aime = s.likes.includes(m.email);
  const ajout = s.auteur !== m.email && !m.amis.includes(s.auteur);
  return `
    <article class="carte">
      <div class="ligne">${avatar(a)}
        <div><strong>${esc(a.nom)}</strong><div class="doux">${dateFr(s.date)}</div></div>
        ${ajout ? `<button class="sec petit droite" data-ami="${esc(s.auteur)}">+ Ami</button>` : ""}
      </div>
      <h3>${esc(s.titre)}</h3>
      <span class="tag">${esc(s.genre)}</span>
      <div class="lecteur" id="l-${esc(s.id)}"><button class="btn petit" data-ecouter="${esc(s.id)}">▶ Écouter</button></div>
      <div class="ligne"><button class="sec petit ${aime ? "actif" : ""}" data-like="${esc(s.id)}" aria-label="Aimer">♥ ${s.likes.length}</button></div>
    </article>`;
}

function ligneUser(u) {
  const ami = moi().amis.includes(u.email);
  return `
    <li class="carte ligne">${avatar(u)}
      <div><strong>${esc(u.nom)}</strong><div class="doux">${esc(u.role || "")}${u.genre ? " · " + esc(u.genre) : ""}</div></div>
      ${ami ? `<span class="doux droite">✓ Ami</span>` : `<button class="sec petit droite" data-ami="${esc(u.email)}">+ Ajouter</button>`}
    </li>`;
}

// ----- Clics communs : déconnexion, like, ami, écouter -----
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;

  if (b.id === "quitter") { muter(() => { db.session = null; }); location.href = "connexion.html"; }

  if (d.like) {
    muter(() => {
      const s = db.sons.find(x => x.id === d.like), m = moi(), i = s.likes.indexOf(m.email);
      if (i >= 0) s.likes.splice(i, 1); else s.likes.push(m.email);
    });
    rafraichir();
  }

  if (d.ami) {
    muter(() => {
      const m = moi(), u = parEmail(d.ami);
      if (!m.amis.includes(u.email)) m.amis.push(u.email);
      if (!u.amis.includes(m.email)) u.amis.push(m.email);
    });
    rafraichir();
  }

  if (d.ecouter) {
    const s = db.sons.find(x => x.id === d.ecouter), zone = $("#l-" + d.ecouter);
    if (!s.fichier) { zone.innerHTML = `<span class="doux">Titre de démo : pas de fichier audio.</span>`; return; }
    try {
      const blob = await idb.lire(s.id);
      if (!blob) throw 0;
      zone.innerHTML = `<audio controls autoplay src="${URL.createObjectURL(blob)}"></audio>`;
    } catch { zone.innerHTML = `<span class="doux">Fichier introuvable sur cet appareil.</span>`; }
  }
});

const Pages = {};

// ======================= PAGE : CONNEXION / INSCRIPTION =======================
Pages.connexion = () => {
  if (moi()) { location.replace("home.html"); return; }
  let inscription = false;
  $("#app").innerHTML = `
    <div class="centre"><div class="panneau">
      <a class="retour" href="accueil.html">← Retour à la chambre</a>
      <h1 class="logo grand">ThePlug</h1>
      <p class="doux">Branche-toi. Poste tes prods, trouve ta team.</p>
      <div class="onglets">
        <button type="button" id="t1" class="actif">Connexion</button>
        <button type="button" id="t2">Inscription</button>
      </div>
      <form id="f" class="colonne">
        <label id="l-nom" hidden>Nom d’artiste<input name="nom" maxlength="30" autocomplete="nickname"></label>
        <label>Adresse e-mail<input name="email" type="email" required autocomplete="email"></label>
        <label>Mot de passe<input name="mdp" type="password" required minlength="6" autocomplete="current-password"></label>
        <label id="l-conf" hidden>Confirmer le mot de passe<input name="conf" type="password" minlength="6" autocomplete="new-password"></label>
        <p id="err" class="erreur" role="alert"></p>
        <button class="btn" id="ok">Se connecter</button>
      </form>
      <p class="note">Démo : les comptes restent dans ce navigateur. Pour de vrais comptes partagés entre artistes, il faudra un serveur.</p>
    </div></div>`;

  const f = $("#f");
  const onglet = (c) => {
    inscription = c;
    $("#t1").classList.toggle("actif", !c);
    $("#t2").classList.toggle("actif", c);
    $("#l-nom").hidden = $("#l-conf").hidden = !c;
    f.nom.required = f.conf.required = c;
    $("#ok").textContent = c ? "Créer mon compte" : "Se connecter";
    $("#err").textContent = "";
  };
  $("#t1").onclick = () => onglet(false);
  $("#t2").onclick = () => onglet(true);

  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = new FormData(f), email = d.get("email").trim().toLowerCase(), mdp = d.get("mdp");
    try {
      let erreur;
      if (inscription) {
        erreur = mdp !== d.get("conf") ? "Les deux mots de passe ne correspondent pas."
                                       : await inscrire(email, d.get("nom").trim(), mdp);
      } else {
        erreur = await connecter(email, mdp);
      }
      if (erreur) { $("#err").textContent = erreur; return; }
      location.href = "home.html";
    } catch { $("#err").textContent = "Impossible ici : ouvre la page avec Live Server."; }
  };
};

// ======================= PAGE : ACCUEIL (tendances + recherche) =======================
Pages.home = () => {
  const c = coque("home");
  if (!c) return;
  const q = (new URLSearchParams(location.search).get("q") || "").trim().toLowerCase();

  rafraichir = () => {
    db = charger();
    const m = moi();
    if (!q) {
      const tri = [...db.sons].sort((a, b) => score(b) - score(a));
      c.innerHTML = `<h2>Tendances</h2><div class="grille">${tri.map(carteSon).join("")}</div>`;
      return;
    }
    const users = db.users.filter(u => u.email !== m.email && u.nom.toLowerCase().includes(q));
    const sons = db.sons.filter(s => [s.titre, s.genre, (parEmail(s.auteur) || {}).nom || ""].some(t => t.toLowerCase().includes(q)));
    c.innerHTML = `
      <h2>Résultats pour « ${esc(q)} »</h2>
      <h3>Artistes</h3>
      <ul class="liste">${users.map(ligneUser).join("") || `<li class="doux">Aucun artiste trouvé.</li>`}</ul>
      <h3>Sons</h3>
      <div class="grille">${sons.map(carteSon).join("") || `<p class="doux">Aucun son trouvé.</p>`}</div>`;
  };
  rafraichir();
};

// ======================= PAGE : AMIS + MESSAGES =======================
Pages.amis = () => {
  const c = coque("amis");
  if (!c) return;
  let actif = null;

  function chat() {
    const m = moi(), u = parEmail(actif), zone = $("#chat");
    if (!u) { zone.innerHTML = `<p class="doux">Choisis un ami pour discuter.</p>`; return; }
    const msgs = db.messages.filter(x => (x.de === m.email && x.a === u.email) || (x.de === u.email && x.a === m.email));
    zone.innerHTML = `
      <div class="ligne">${avatar(u)}<strong>${esc(u.nom)}</strong><span class="doux">${enLigne(u) ? "en ligne" : "hors ligne"}</span></div>
      <div class="fil" id="fil">${msgs.map(x => `<p class="msg ${x.de === m.email ? "moi" : ""}">${esc(x.texte)}</p>`).join("") || `<p class="doux">Dis salut 👋</p>`}</div>
      <form id="envoi" class="ligne"><input name="t" placeholder="Ton message…" maxlength="500" required autocomplete="off" aria-label="Message"><button class="btn">Envoyer</button></form>`;
    $("#fil").scrollTop = 1e9;
    $("#envoi").onsubmit = (ev) => {
      ev.preventDefault();
      const t = new FormData(ev.target).get("t").trim();
      if (!t) return;
      muter(() => db.messages.push({ de: m.email, a: u.email, texte: t, date: Date.now() }));
      chat();
      $("#envoi input").focus();
    };
  }

  rafraichir = () => {
    db = charger();
    const liste = moi().amis.map(parEmail).filter(Boolean).sort((a, b) => enLigne(b) - enLigne(a));
    c.innerHTML = `
      <h2>Amis</h2>
      <div class="amis">
        <ul class="liste">${liste.map(u => `
          <li><button class="ami ${u.email === actif ? "actif" : ""}" data-chat="${esc(u.email)}">
            ${avatar(u)}<span>${esc(u.nom)}</span><i class="point ${enLigne(u) ? "on" : ""}" title="${enLigne(u) ? "En ligne" : "Hors ligne"}"></i>
          </button></li>`).join("") || `<li class="doux">Pas encore d’amis. Cherche des artistes avec la barre de recherche.</li>`}
        </ul>
        <section class="carte" id="chat"></section>
      </div>`;
    chat();
  };
  c.onclick = (e) => {
    const b = e.target.closest("[data-chat]");
    if (b) { actif = b.dataset.chat; rafraichir(); }
  };
  rafraichir();
};

// ======================= PAGE : MON COMPTE =======================
Pages.compte = () => {
  const c = coque("compte");
  if (!c) return;
  const m = moi(), nb = db.sons.filter(s => s.auteur === m.email).length;
  c.innerHTML = `
    <h2>Mon compte</h2>
    <form id="f" class="carte colonne">
      <div class="ligne">${avatar(m, "grand")}
        <div><strong>${esc(m.nom)}</strong><div class="doux">${esc(m.email)}</div>
        <div class="doux">${nb} son(s) posté(s) · ${m.amis.length} ami(s)</div></div></div>
      <label>Nom d’artiste<input name="nom" value="${esc(m.nom)}" required maxlength="30"></label>
      <label>Profil<select name="role">${ROLES.map(r => `<option ${m.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
      <label>Genre préféré<select name="genre"><option value="">—</option>${GENRES.map(g => `<option ${m.genre === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></label>
      <label>Bio<textarea name="bio" maxlength="160" rows="3">${esc(m.bio || "")}</textarea></label>
      <fieldset class="teintes"><legend>Couleur de l’avatar</legend>
        ${TEINTES.map(t => `<label class="pastille" style="background:${t}"><input type="radio" name="teinte" value="${t}" ${(m.teinte || TEINTES[0]) === t ? "checked" : ""}><span class="sr-only">${t}</span></label>`).join("")}
      </fieldset>
      <p id="msg" class="ok" role="status"></p>
      <button class="btn">Enregistrer</button>
    </form>`;

  $("#f").onsubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.target), nom = d.get("nom").trim();
    db = charger();
    if (db.users.some(u => u.email !== m.email && u.nom.toLowerCase() === nom.toLowerCase())) {
      $("#msg").textContent = "Ce nom d’artiste est déjà pris."; $("#msg").className = "erreur"; return;
    }
    muter(() => {
      const u = moi();
      Object.assign(u, { nom, role: d.get("role"), genre: d.get("genre"), bio: d.get("bio").trim(), teinte: d.get("teinte") });
    });
    Pages.compte();
    $("#msg").textContent = "Profil enregistré ✓";
  };
};

// ======================= PAGE : PLUG (envoyer un projet) =======================
Pages.plug = () => {
  const c = coque("plug");
  if (!c) return;
  c.innerHTML = `
    <h2>Plug ton projet</h2>
    <p class="doux">Envoie ta prod ou ton son (MP3, WAV ou M4A) pour que la communauté l’écoute.</p>
    <form id="f" class="carte colonne">
      <label>Nom du projet<input name="titre" required maxlength="80"></label>
      <label>Fichier audio<input name="fichier" type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a" required></label>
      <label>Genre<select name="genre">${GENRES.map(g => `<option>${esc(g)}</option>`).join("")}</select></label>
      <p id="msg" class="erreur" role="alert"></p>
      <button class="btn">Brancher mon son</button>
    </form>`;

  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = new FormData(e.target), fichier = d.get("fichier"), msg = $("#msg");
    if (!/\.(mp3|wav|m4a)$/i.test(fichier.name)) { msg.textContent = "Format non accepté : choisis un MP3, un WAV ou un M4A."; return; }
    if (fichier.size > 30 * 1024 * 1024) { msg.textContent = "Fichier trop lourd (30 Mo maximum)."; return; }
    const id = Date.now().toString(36);
    try {
      await idb.mettre(id, fichier);
      muter(() => db.sons.push({ id, auteur: moi().email, titre: d.get("titre").trim(), genre: d.get("genre"), date: Date.now(), likes: [], fichier: true }));
      location.href = "home.html";
    } catch { msg.textContent = "Impossible d’enregistrer le fichier ici : ouvre la page avec Live Server."; }
  };
};
