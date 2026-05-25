/* ============================================================
   PRODE REFUGIO — Datos del Mundial 2026
   48 selecciones, partidos fase de grupos, jugadores demo
   ============================================================ */

// Country code → display name (es). Used for flag image + label.
window.TEAMS = {
  ARG: "Argentina",   BRA: "Brasil",     URU: "Uruguay",    COL: "Colombia",
  ECU: "Ecuador",     PAR: "Paraguay",   VEN: "Venezuela",  CHI: "Chile",
  CRC: "Costa Rica",  MEX: "México",     USA: "EE.UU.",     CAN: "Canadá",
  PAN: "Panamá",      JAM: "Jamaica",    HON: "Honduras",   HAI: "Haití",
  ESP: "España",      FRA: "Francia",    GER: "Alemania",   ITA: "Italia",
  POR: "Portugal",    ENG: "Inglaterra", NED: "Países Bajos", BEL: "Bélgica",
  CRO: "Croacia",     SUI: "Suiza",      DEN: "Dinamarca",  AUT: "Austria",
  POL: "Polonia",     SRB: "Serbia",     TUR: "Turquía",    NOR: "Noruega",
  MAR: "Marruecos",   SEN: "Senegal",    EGY: "Egipto",     CIV: "Costa de Marfil",
  ALG: "Argelia",     NGA: "Nigeria",    GHA: "Ghana",      TUN: "Túnez",
  CMR: "Camerún",     JPN: "Japón",      KOR: "Corea",      IRN: "Irán",
  AUS: "Australia",   QAT: "Catar",      KSA: "Arabia",     UZB: "Uzbekistán",
};

// Helper for flags — use circle-flags CDN (MIT). Map FIFA → ISO.
window.FLAG = (code) => {
  const map = {
    ARG:"ar", BRA:"br", URU:"uy", COL:"co", ECU:"ec", PAR:"py", VEN:"ve", CHI:"cl",
    CRC:"cr", MEX:"mx", USA:"us", CAN:"ca", PAN:"pa", JAM:"jm", HON:"hn", HAI:"ht",
    ESP:"es", FRA:"fr", GER:"de", ITA:"it", POR:"pt", ENG:"gb-eng", NED:"nl", BEL:"be",
    CRO:"hr", SUI:"ch", DEN:"dk", AUT:"at", POL:"pl", SRB:"rs", TUR:"tr", NOR:"no",
    MAR:"ma", SEN:"sn", EGY:"eg", CIV:"ci", ALG:"dz", NGA:"ng", GHA:"gh", TUN:"tn",
    CMR:"cm", JPN:"jp", KOR:"kr", IRN:"ir", AUS:"au", QAT:"qa", KSA:"sa", UZB:"uz",
  };
  return `https://hatscripts.github.io/circle-flags/flags/${map[code] || "xx"}.svg`;
};

// Partidos — primeros días del Mundial 2026 (arranca 11 jun · Estadio Azteca)
// Estados: "abierto" (futuro), "vivo", "finalizado"
window.MATCHES = [
  // Hoy: jueves 11 jun 2026
  { id:"m01", phase:"GRUPO A · J1", date:"Jue 11 Jun", time:"18:00", venue:"Estadio Azteca, CDMX",
    a:"MEX", b:"KSA", status:"vivo", scoreA:1, scoreB:0, minute:"34'", featured:true },
  { id:"m02", phase:"GRUPO B · J1", date:"Vie 12 Jun", time:"12:00", venue:"BC Place, Vancouver",
    a:"CAN", b:"AUS", status:"abierto" },
  { id:"m03", phase:"GRUPO B · J1", date:"Vie 12 Jun", time:"15:00", venue:"SoFi, Los Ángeles",
    a:"ESP", b:"JAM", status:"abierto" },
  { id:"m04", phase:"GRUPO C · J1", date:"Vie 12 Jun", time:"18:00", venue:"MetLife, NJ",
    a:"ARG", b:"CRO", status:"abierto", featured:true },
  { id:"m05", phase:"GRUPO C · J1", date:"Vie 12 Jun", time:"21:00", venue:"Lumen, Seattle",
    a:"NGA", b:"USA", status:"abierto" },
  { id:"m06", phase:"GRUPO D · J1", date:"Sáb 13 Jun", time:"12:00", venue:"Hard Rock, Miami",
    a:"BRA", b:"MAR", status:"abierto" },
  { id:"m07", phase:"GRUPO D · J1", date:"Sáb 13 Jun", time:"15:00", venue:"AT&T, Dallas",
    a:"POR", b:"KOR", status:"abierto" },
  { id:"m08", phase:"GRUPO E · J1", date:"Sáb 13 Jun", time:"18:00", venue:"Mercedes-Benz, Atlanta",
    a:"FRA", b:"SEN", status:"abierto", featured:true },
  { id:"m09", phase:"GRUPO E · J1", date:"Sáb 13 Jun", time:"21:00", venue:"Arrowhead, KC",
    a:"GER", b:"JPN", status:"abierto" },
  { id:"m10", phase:"GRUPO F · J1", date:"Dom 14 Jun", time:"12:00", venue:"Estadio Akron, GDL",
    a:"URU", b:"EGY", status:"abierto" },
  { id:"m11", phase:"GRUPO F · J1", date:"Dom 14 Jun", time:"15:00", venue:"NRG, Houston",
    a:"ENG", b:"IRN", status:"abierto" },
  { id:"m12", phase:"GRUPO G · J1", date:"Dom 14 Jun", time:"18:00", venue:"Gillette, Boston",
    a:"COL", b:"GHA", status:"abierto" },
  { id:"m13", phase:"GRUPO G · J1", date:"Dom 14 Jun", time:"21:00", venue:"Levi's, SF",
    a:"NED", b:"PAR", status:"abierto" },
  { id:"m14", phase:"GRUPO H · J1", date:"Lun 15 Jun", time:"12:00", venue:"Lincoln Fin., Philly",
    a:"ECU", b:"TUN", status:"abierto" },
  { id:"m15", phase:"GRUPO H · J1", date:"Lun 15 Jun", time:"15:00", venue:"Estadio BBVA, MTY",
    a:"ITA", b:"CRC", status:"abierto", featured:true },

  // Ya jugados (para el historial de Tomás)
  { id:"m00a", phase:"AMISTOSO", date:"Sáb 7 Jun", time:"19:00", venue:"Estadio Monumental",
    a:"ARG", b:"COL", status:"finalizado", scoreA:2, scoreB:1 },
  { id:"m00b", phase:"AMISTOSO", date:"Dom 8 Jun", time:"16:00", venue:"Wembley",
    a:"ENG", b:"BEL", status:"finalizado", scoreA:1, scoreB:1 },
];

// Mis predicciones (jugador actual = Tomás)
window.MY_PREDICTIONS = {
  m00a: { a:2, b:1, points:5 },                  // exacto
  m00b: { a:2, b:0, points:0 },                  // fallado
  m01:  { a:1, b:0, points:null },               // vivo, va por exacto
  m04:  { a:3, b:1, points:null },
  m08:  { a:2, b:0, points:null },
};

// Ranking general (top demo). Realista, mezcla tica/argentina/expat.
window.RANKING = [
  { rank:1, name:"Joaco \"El Profeta\"", avatar:"JP", pts:147, exact:8, winner:14, streak:5,
    nat:"ARG", badge:"profeta", trend:"up", you:false },
  { rank:2, name:"Sofi Vargas",          avatar:"SV", pts:138, exact:6, winner:16, streak:3,
    nat:"CRC", badge:"casi",    trend:"up", you:false },
  { rank:3, name:"Diego Maradoneta",     avatar:"DM", pts:131, exact:7, winner:12, streak:2,
    nat:"ARG", badge:"scaloneta", trend:"down", you:false },
  { rank:4, name:"Lalo \"Pulpo\" Méndez",avatar:"LM", pts:128, exact:5, winner:15, streak:4,
    nat:"MEX", badge:"casi",    trend:"up", you:false },
  { rank:5, name:"Tomás Belaún (vos)",   avatar:"TB", pts:122, exact:6, winner:12, streak:3,
    nat:"ARG", badge:"cafe",    trend:"up", you:true },
  { rank:6, name:"Mati Surfeador",       avatar:"MS", pts:117, exact:4, winner:15, streak:2,
    nat:"CRC", badge:"rey",     trend:"flat", you:false },
  { rank:7, name:"Pancho del Bar",       avatar:"PB", pts:109, exact:5, winner:11, streak:0,
    nat:"CRC", badge:"cafe",    trend:"down", you:false },
  { rank:8, name:"Cami Olivieri",        avatar:"CO", pts:104, exact:3, winner:14, streak:1,
    nat:"ARG", badge:"casi",    trend:"flat", you:false },
  { rank:9, name:"Jeremy from Tamarindo",avatar:"JT", pts: 99, exact:4, winner:11, streak:2,
    nat:"USA", badge:"cafe",    trend:"up", you:false },
  { rank:10,name:"Tincho 9",             avatar:"T9", pts: 92, exact:2, winner:13, streak:0,
    nat:"ARG", badge:"casi",    trend:"down", you:false },
  { rank:11,name:"Naty Pura",            avatar:"NP", pts: 88, exact:3, winner:10, streak:1,
    nat:"CRC", badge:"cafe",    trend:"flat", you:false },
  { rank:12,name:"Bren del Lodge",       avatar:"BL", pts: 81, exact:2, winner:11, streak:0,
    nat:"CRC", badge:"rey",     trend:"down", you:false },
];

// Badges — clave → metadata
window.BADGES = {
  profeta:   { label:"El Profeta",      sub:"6+ resultados exactos",   emoji:"◎", color:"var(--neon-citrus)" },
  casi:      { label:"Casi Brujo",      sub:"3 exactos seguidos",      emoji:"✦", color:"var(--orange-500)" },
  scaloneta: { label:"Modo Scaloneta",  sub:"Le pega a la celeste",    emoji:"★", color:"var(--cream-100)" },
  cafe:      { label:"Café y Fulbo",    sub:"Predice antes del café",  emoji:"☕", color:"var(--tan-300)" },
  rey:       { label:"Rey del Refugio", sub:"Top 3 de la semana",      emoji:"♛", color:"var(--orange-400)" },
};

// Grupos privados
window.GROUPS = [
  { id:"g1", name:"La Mesa del Imperial", code:"IMP-784", members:14, you:5, position:2,
    leader:"Joaco \"El Profeta\"", leaderPts:147, yourPts:122 },
  { id:"g2", name:"Surfers del Lodge",    code:"SRF-221", members:8,  you:1, position:1,
    leader:"Tomás Belaún (vos)",   leaderPts:122, yourPts:122 },
  { id:"g3", name:"Staff Refugio",        code:"REF-001", members:11, you:5, position:4,
    leader:"Pancho del Bar",       leaderPts:109, yourPts:122 },
];

// Anuncios del Refugio (admin panel + landing)
window.ANNOUNCEMENTS = [
  { id:"a1", icon:"tv", title:"México vs Arabia EN VIVO", body:"Pantalla gigante en el deck. Empezó hace 34 minutos.", tag:"AHORA", color:"neon" },
  { id:"a2", icon:"beer", title:"2×1 en Imperial", body:"Durante el primer tiempo del partido de Argentina (mañana 18hs).", tag:"PROMO", color:"orange" },
  { id:"a3", icon:"trophy", title:"Premio fecha 1", body:"Mejor puntaje de la fecha se lleva una cena para dos en Refugio.", tag:"FECHA 1", color:"sage" },
];

// Predicciones especiales del usuario
window.MY_SPECIALS = {
  campeon:    "ARG",
  subcampeon: "FRA",
  goleador:   "Kylian Mbappé",
  arquero:    "Emiliano Martínez",
  sorpresa:   "MAR",
  decepcion:  "GER",
};
