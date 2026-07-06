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
  // Altas del Mundial 2026 (sorteo dic-2025)
  RSA: "Sudáfrica",   CZE: "Chequia",    BIH: "Bosnia",     SCO: "Escocia",
  CUW: "Curazao",     SWE: "Suecia",     NZL: "N. Zelanda", CPV: "Cabo Verde",
  IRQ: "Irak",        JOR: "Jordania",   COD: "R.D. Congo",
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
    RSA:"za", CZE:"cz", BIH:"ba", SCO:"gb-sct", CUW:"cw", SWE:"se", NZL:"nz",
    CPV:"cv", IRQ:"iq", JOR:"jo", COD:"cd",
  };
  return `https://hatscripts.github.io/circle-flags/flags/${map[code] || "xx"}.svg`;
};

// Fixture real Mundial 2026 — fase de grupos (72 partidos). Horarios en hora de
// Costa Rica (Tamarindo, UTC−06:00). Estados: "abierto" | "vivo" | "finalizado".
// Las eliminatorias se cargan luego (dependen de los resultados de grupos).
window.MATCHES = [
  { id:"m01", phase:"GRUPO A · J1", group:"A", date:"Jue 11 Jun", time:"13:00", venue:"Estadio Azteca, CDMX",
    kickoffAt:"2026-06-11T13:00:00-06:00", a:"MEX", b:"RSA", status:"abierto", featured:true },
  { id:"m02", phase:"GRUPO A · J1", group:"A", date:"Jue 11 Jun", time:"20:00", venue:"Zapopan",
    kickoffAt:"2026-06-11T20:00:00-06:00", a:"KOR", b:"CZE", status:"abierto" },
  { id:"m03", phase:"GRUPO B · J1", group:"B", date:"Vie 12 Jun", time:"13:00", venue:"Toronto",
    kickoffAt:"2026-06-12T13:00:00-06:00", a:"CAN", b:"BIH", status:"abierto" },
  { id:"m04", phase:"GRUPO D · J1", group:"D", date:"Vie 12 Jun", time:"19:00", venue:"Inglewood",
    kickoffAt:"2026-06-12T19:00:00-06:00", a:"USA", b:"PAR", status:"abierto" },
  { id:"m05", phase:"GRUPO B · J1", group:"B", date:"Sáb 13 Jun", time:"13:00", venue:"Santa Clara",
    kickoffAt:"2026-06-13T13:00:00-06:00", a:"QAT", b:"SUI", status:"abierto" },
  { id:"m06", phase:"GRUPO C · J1", group:"C", date:"Sáb 13 Jun", time:"16:00", venue:"East Rutherford",
    kickoffAt:"2026-06-13T16:00:00-06:00", a:"BRA", b:"MAR", status:"abierto", featured:true },
  { id:"m07", phase:"GRUPO C · J1", group:"C", date:"Sáb 13 Jun", time:"19:00", venue:"Foxborough",
    kickoffAt:"2026-06-13T19:00:00-06:00", a:"HAI", b:"SCO", status:"abierto" },
  { id:"m08", phase:"GRUPO D · J1", group:"D", date:"Sáb 13 Jun", time:"22:00", venue:"Vancouver",
    kickoffAt:"2026-06-13T22:00:00-06:00", a:"AUS", b:"TUR", status:"abierto" },
  { id:"m09", phase:"GRUPO E · J1", group:"E", date:"Dom 14 Jun", time:"11:00", venue:"Houston",
    kickoffAt:"2026-06-14T11:00:00-06:00", a:"GER", b:"CUW", status:"abierto" },
  { id:"m10", phase:"GRUPO F · J1", group:"F", date:"Dom 14 Jun", time:"14:00", venue:"Arlington",
    kickoffAt:"2026-06-14T14:00:00-06:00", a:"NED", b:"JPN", status:"abierto" },
  { id:"m11", phase:"GRUPO E · J1", group:"E", date:"Dom 14 Jun", time:"17:00", venue:"Philadelphia",
    kickoffAt:"2026-06-14T17:00:00-06:00", a:"CIV", b:"ECU", status:"abierto" },
  { id:"m12", phase:"GRUPO F · J1", group:"F", date:"Dom 14 Jun", time:"20:00", venue:"Guadalupe",
    kickoffAt:"2026-06-14T20:00:00-06:00", a:"SWE", b:"TUN", status:"abierto" },
  { id:"m13", phase:"GRUPO H · J1", group:"H", date:"Lun 15 Jun", time:"10:00", venue:"Atlanta",
    kickoffAt:"2026-06-15T10:00:00-06:00", a:"ESP", b:"CPV", status:"abierto" },
  { id:"m14", phase:"GRUPO G · J1", group:"G", date:"Lun 15 Jun", time:"13:00", venue:"Seattle",
    kickoffAt:"2026-06-15T13:00:00-06:00", a:"BEL", b:"EGY", status:"abierto" },
  { id:"m15", phase:"GRUPO H · J1", group:"H", date:"Lun 15 Jun", time:"16:00", venue:"Miami Gardens",
    kickoffAt:"2026-06-15T16:00:00-06:00", a:"KSA", b:"URU", status:"abierto" },
  { id:"m16", phase:"GRUPO G · J1", group:"G", date:"Lun 15 Jun", time:"19:00", venue:"Inglewood",
    kickoffAt:"2026-06-15T19:00:00-06:00", a:"IRN", b:"NZL", status:"abierto" },
  { id:"m17", phase:"GRUPO I · J1", group:"I", date:"Mar 16 Jun", time:"13:00", venue:"East Rutherford",
    kickoffAt:"2026-06-16T13:00:00-06:00", a:"FRA", b:"SEN", status:"abierto", featured:true },
  { id:"m18", phase:"GRUPO I · J1", group:"I", date:"Mar 16 Jun", time:"16:00", venue:"Foxborough",
    kickoffAt:"2026-06-16T16:00:00-06:00", a:"IRQ", b:"NOR", status:"abierto" },
  { id:"m19", phase:"GRUPO J · J1", group:"J", date:"Mar 16 Jun", time:"19:00", venue:"Kansas City",
    kickoffAt:"2026-06-16T19:00:00-06:00", a:"ARG", b:"ALG", status:"abierto", featured:true },
  { id:"m20", phase:"GRUPO J · J1", group:"J", date:"Mar 16 Jun", time:"22:00", venue:"Santa Clara",
    kickoffAt:"2026-06-16T22:00:00-06:00", a:"AUT", b:"JOR", status:"abierto" },
  { id:"m21", phase:"GRUPO K · J1", group:"K", date:"Mié 17 Jun", time:"11:00", venue:"Houston",
    kickoffAt:"2026-06-17T11:00:00-06:00", a:"POR", b:"COD", status:"abierto" },
  { id:"m22", phase:"GRUPO L · J1", group:"L", date:"Mié 17 Jun", time:"14:00", venue:"Arlington",
    kickoffAt:"2026-06-17T14:00:00-06:00", a:"ENG", b:"CRO", status:"abierto", featured:true },
  { id:"m23", phase:"GRUPO L · J1", group:"L", date:"Mié 17 Jun", time:"17:00", venue:"Toronto",
    kickoffAt:"2026-06-17T17:00:00-06:00", a:"GHA", b:"PAN", status:"abierto" },
  { id:"m24", phase:"GRUPO K · J1", group:"K", date:"Mié 17 Jun", time:"20:00", venue:"CDMX",
    kickoffAt:"2026-06-17T20:00:00-06:00", a:"UZB", b:"COL", status:"abierto" },
  { id:"m25", phase:"GRUPO A · J2", group:"A", date:"Jue 18 Jun", time:"10:00", venue:"Atlanta",
    kickoffAt:"2026-06-18T10:00:00-06:00", a:"CZE", b:"RSA", status:"abierto" },
  { id:"m26", phase:"GRUPO B · J2", group:"B", date:"Jue 18 Jun", time:"13:00", venue:"Inglewood",
    kickoffAt:"2026-06-18T13:00:00-06:00", a:"SUI", b:"BIH", status:"abierto" },
  { id:"m27", phase:"GRUPO B · J2", group:"B", date:"Jue 18 Jun", time:"16:00", venue:"Vancouver",
    kickoffAt:"2026-06-18T16:00:00-06:00", a:"CAN", b:"QAT", status:"abierto" },
  { id:"m28", phase:"GRUPO A · J2", group:"A", date:"Jue 18 Jun", time:"19:00", venue:"Zapopan",
    kickoffAt:"2026-06-18T19:00:00-06:00", a:"MEX", b:"KOR", status:"abierto" },
  { id:"m29", phase:"GRUPO D · J2", group:"D", date:"Vie 19 Jun", time:"13:00", venue:"Seattle",
    kickoffAt:"2026-06-19T13:00:00-06:00", a:"USA", b:"AUS", status:"abierto" },
  { id:"m30", phase:"GRUPO C · J2", group:"C", date:"Vie 19 Jun", time:"16:00", venue:"Foxborough",
    kickoffAt:"2026-06-19T16:00:00-06:00", a:"SCO", b:"MAR", status:"abierto" },
  { id:"m31", phase:"GRUPO C · J2", group:"C", date:"Vie 19 Jun", time:"18:30", venue:"Philadelphia",
    kickoffAt:"2026-06-19T18:30:00-06:00", a:"BRA", b:"HAI", status:"abierto" },
  { id:"m32", phase:"GRUPO D · J2", group:"D", date:"Vie 19 Jun", time:"21:00", venue:"Santa Clara",
    kickoffAt:"2026-06-19T21:00:00-06:00", a:"TUR", b:"PAR", status:"abierto" },
  { id:"m33", phase:"GRUPO F · J2", group:"F", date:"Sáb 20 Jun", time:"11:00", venue:"Houston",
    kickoffAt:"2026-06-20T11:00:00-06:00", a:"NED", b:"SWE", status:"abierto" },
  { id:"m34", phase:"GRUPO E · J2", group:"E", date:"Sáb 20 Jun", time:"14:00", venue:"Toronto",
    kickoffAt:"2026-06-20T14:00:00-06:00", a:"GER", b:"CIV", status:"abierto" },
  { id:"m35", phase:"GRUPO E · J2", group:"E", date:"Sáb 20 Jun", time:"18:00", venue:"Kansas City",
    kickoffAt:"2026-06-20T18:00:00-06:00", a:"ECU", b:"CUW", status:"abierto" },
  { id:"m36", phase:"GRUPO F · J2", group:"F", date:"Sáb 20 Jun", time:"22:00", venue:"Guadalupe",
    kickoffAt:"2026-06-20T22:00:00-06:00", a:"TUN", b:"JPN", status:"abierto" },
  { id:"m37", phase:"GRUPO H · J2", group:"H", date:"Dom 21 Jun", time:"10:00", venue:"Atlanta",
    kickoffAt:"2026-06-21T10:00:00-06:00", a:"ESP", b:"KSA", status:"abierto" },
  { id:"m38", phase:"GRUPO G · J2", group:"G", date:"Dom 21 Jun", time:"13:00", venue:"Inglewood",
    kickoffAt:"2026-06-21T13:00:00-06:00", a:"BEL", b:"IRN", status:"abierto" },
  { id:"m39", phase:"GRUPO H · J2", group:"H", date:"Dom 21 Jun", time:"16:00", venue:"Miami Gardens",
    kickoffAt:"2026-06-21T16:00:00-06:00", a:"URU", b:"CPV", status:"abierto" },
  { id:"m40", phase:"GRUPO G · J2", group:"G", date:"Dom 21 Jun", time:"19:00", venue:"Vancouver",
    kickoffAt:"2026-06-21T19:00:00-06:00", a:"NZL", b:"EGY", status:"abierto" },
  { id:"m41", phase:"GRUPO J · J2", group:"J", date:"Lun 22 Jun", time:"11:00", venue:"Arlington",
    kickoffAt:"2026-06-22T11:00:00-06:00", a:"ARG", b:"AUT", status:"abierto" },
  { id:"m42", phase:"GRUPO I · J2", group:"I", date:"Lun 22 Jun", time:"15:00", venue:"Philadelphia",
    kickoffAt:"2026-06-22T15:00:00-06:00", a:"FRA", b:"IRQ", status:"abierto" },
  { id:"m43", phase:"GRUPO I · J2", group:"I", date:"Lun 22 Jun", time:"18:00", venue:"East Rutherford",
    kickoffAt:"2026-06-22T18:00:00-06:00", a:"NOR", b:"SEN", status:"abierto" },
  { id:"m44", phase:"GRUPO J · J2", group:"J", date:"Lun 22 Jun", time:"21:00", venue:"Santa Clara",
    kickoffAt:"2026-06-22T21:00:00-06:00", a:"JOR", b:"ALG", status:"abierto" },
  { id:"m45", phase:"GRUPO K · J2", group:"K", date:"Mar 23 Jun", time:"11:00", venue:"Houston",
    kickoffAt:"2026-06-23T11:00:00-06:00", a:"POR", b:"UZB", status:"abierto" },
  { id:"m46", phase:"GRUPO L · J2", group:"L", date:"Mar 23 Jun", time:"14:00", venue:"Foxborough",
    kickoffAt:"2026-06-23T14:00:00-06:00", a:"ENG", b:"GHA", status:"abierto" },
  { id:"m47", phase:"GRUPO L · J2", group:"L", date:"Mar 23 Jun", time:"17:00", venue:"Toronto",
    kickoffAt:"2026-06-23T17:00:00-06:00", a:"PAN", b:"CRO", status:"abierto" },
  { id:"m48", phase:"GRUPO K · J2", group:"K", date:"Mar 23 Jun", time:"20:00", venue:"Zapopan",
    kickoffAt:"2026-06-23T20:00:00-06:00", a:"COL", b:"COD", status:"abierto" },
  { id:"m49", phase:"GRUPO B · J3", group:"B", date:"Mié 24 Jun", time:"13:00", venue:"Vancouver",
    kickoffAt:"2026-06-24T13:00:00-06:00", a:"SUI", b:"CAN", status:"abierto" },
  { id:"m50", phase:"GRUPO B · J3", group:"B", date:"Mié 24 Jun", time:"13:00", venue:"Seattle",
    kickoffAt:"2026-06-24T13:00:00-06:00", a:"BIH", b:"QAT", status:"abierto" },
  { id:"m51", phase:"GRUPO C · J3", group:"C", date:"Mié 24 Jun", time:"16:00", venue:"Miami Gardens",
    kickoffAt:"2026-06-24T16:00:00-06:00", a:"SCO", b:"BRA", status:"abierto" },
  { id:"m52", phase:"GRUPO C · J3", group:"C", date:"Mié 24 Jun", time:"16:00", venue:"Atlanta",
    kickoffAt:"2026-06-24T16:00:00-06:00", a:"MAR", b:"HAI", status:"abierto" },
  { id:"m53", phase:"GRUPO A · J3", group:"A", date:"Mié 24 Jun", time:"19:00", venue:"CDMX",
    kickoffAt:"2026-06-24T19:00:00-06:00", a:"CZE", b:"MEX", status:"abierto" },
  { id:"m54", phase:"GRUPO A · J3", group:"A", date:"Mié 24 Jun", time:"19:00", venue:"Guadalupe",
    kickoffAt:"2026-06-24T19:00:00-06:00", a:"RSA", b:"KOR", status:"abierto" },
  { id:"m55", phase:"GRUPO E · J3", group:"E", date:"Jue 25 Jun", time:"14:00", venue:"East Rutherford",
    kickoffAt:"2026-06-25T14:00:00-06:00", a:"ECU", b:"GER", status:"abierto" },
  { id:"m56", phase:"GRUPO E · J3", group:"E", date:"Jue 25 Jun", time:"14:00", venue:"Philadelphia",
    kickoffAt:"2026-06-25T14:00:00-06:00", a:"CUW", b:"CIV", status:"abierto" },
  { id:"m57", phase:"GRUPO F · J3", group:"F", date:"Jue 25 Jun", time:"17:00", venue:"Arlington",
    kickoffAt:"2026-06-25T17:00:00-06:00", a:"JPN", b:"SWE", status:"abierto" },
  { id:"m58", phase:"GRUPO F · J3", group:"F", date:"Jue 25 Jun", time:"17:00", venue:"Kansas City",
    kickoffAt:"2026-06-25T17:00:00-06:00", a:"TUN", b:"NED", status:"abierto" },
  { id:"m59", phase:"GRUPO D · J3", group:"D", date:"Jue 25 Jun", time:"20:00", venue:"Inglewood",
    kickoffAt:"2026-06-25T20:00:00-06:00", a:"TUR", b:"USA", status:"abierto" },
  { id:"m60", phase:"GRUPO D · J3", group:"D", date:"Jue 25 Jun", time:"20:00", venue:"Santa Clara",
    kickoffAt:"2026-06-25T20:00:00-06:00", a:"PAR", b:"AUS", status:"abierto" },
  { id:"m61", phase:"GRUPO I · J3", group:"I", date:"Vie 26 Jun", time:"13:00", venue:"Foxborough",
    kickoffAt:"2026-06-26T13:00:00-06:00", a:"NOR", b:"FRA", status:"abierto" },
  { id:"m62", phase:"GRUPO I · J3", group:"I", date:"Vie 26 Jun", time:"13:00", venue:"Toronto",
    kickoffAt:"2026-06-26T13:00:00-06:00", a:"SEN", b:"IRQ", status:"abierto" },
  { id:"m63", phase:"GRUPO H · J3", group:"H", date:"Vie 26 Jun", time:"18:00", venue:"Houston",
    kickoffAt:"2026-06-26T18:00:00-06:00", a:"CPV", b:"KSA", status:"abierto" },
  { id:"m64", phase:"GRUPO H · J3", group:"H", date:"Vie 26 Jun", time:"18:00", venue:"Zapopan",
    kickoffAt:"2026-06-26T18:00:00-06:00", a:"URU", b:"ESP", status:"abierto" },
  { id:"m65", phase:"GRUPO G · J3", group:"G", date:"Vie 26 Jun", time:"21:00", venue:"Seattle",
    kickoffAt:"2026-06-26T21:00:00-06:00", a:"EGY", b:"IRN", status:"abierto" },
  { id:"m66", phase:"GRUPO G · J3", group:"G", date:"Vie 26 Jun", time:"21:00", venue:"Vancouver",
    kickoffAt:"2026-06-26T21:00:00-06:00", a:"NZL", b:"BEL", status:"abierto" },
  { id:"m67", phase:"GRUPO L · J3", group:"L", date:"Sáb 27 Jun", time:"15:00", venue:"East Rutherford",
    kickoffAt:"2026-06-27T15:00:00-06:00", a:"PAN", b:"ENG", status:"abierto" },
  { id:"m68", phase:"GRUPO L · J3", group:"L", date:"Sáb 27 Jun", time:"15:00", venue:"Philadelphia",
    kickoffAt:"2026-06-27T15:00:00-06:00", a:"CRO", b:"GHA", status:"abierto" },
  { id:"m69", phase:"GRUPO K · J3", group:"K", date:"Sáb 27 Jun", time:"17:30", venue:"Miami Gardens",
    kickoffAt:"2026-06-27T17:30:00-06:00", a:"COL", b:"POR", status:"abierto" },
  { id:"m70", phase:"GRUPO K · J3", group:"K", date:"Sáb 27 Jun", time:"17:30", venue:"Atlanta",
    kickoffAt:"2026-06-27T17:30:00-06:00", a:"COD", b:"UZB", status:"abierto" },
  { id:"m71", phase:"GRUPO J · J3", group:"J", date:"Sáb 27 Jun", time:"20:00", venue:"Kansas City",
    kickoffAt:"2026-06-27T20:00:00-06:00", a:"ALG", b:"AUT", status:"abierto" },
  { id:"m72", phase:"GRUPO J · J3", group:"J", date:"Sáb 27 Jun", time:"20:00", venue:"Arlington",
    kickoffAt:"2026-06-27T20:00:00-06:00", a:"JOR", b:"ARG", status:"abierto" },

  // ---- Fase eliminatoria (28 jun–19 jul). Horarios en hora de Costa Rica (UTC−06:00).
  // Las eliminatorias dependen de los resultados de grupos: la Ronda de 32 ya tiene
  // equipos reales; de Octavos a la Final van "a definir" (a/b null + aLabel/bLabel)
  // y se completan a medida que avanza el cuadro.
  { id:"m73", phase:"RONDA DE 32", round:"r32", date:"Dom 28 Jun", time:"13:00", venue:"Inglewood",
    kickoffAt:"2026-06-28T13:00:00-06:00", a:"RSA", b:"CAN", status:"abierto" },
  { id:"m76", phase:"RONDA DE 32", round:"r32", date:"Lun 29 Jun", time:"11:00", venue:"Houston",
    kickoffAt:"2026-06-29T11:00:00-06:00", a:"BRA", b:"JPN", status:"abierto" },
  { id:"m74", phase:"RONDA DE 32", round:"r32", date:"Lun 29 Jun", time:"14:30", venue:"Foxborough",
    kickoffAt:"2026-06-29T14:30:00-06:00", a:"GER", b:"PAR", status:"abierto" },
  { id:"m75", phase:"RONDA DE 32", round:"r32", date:"Lun 29 Jun", time:"19:00", venue:"Estadio BBVA, Monterrey",
    kickoffAt:"2026-06-29T19:00:00-06:00", a:"NED", b:"MAR", status:"abierto" },
  { id:"m78", phase:"RONDA DE 32", round:"r32", date:"Mar 30 Jun", time:"11:00", venue:"Arlington",
    kickoffAt:"2026-06-30T11:00:00-06:00", a:"CIV", b:"NOR", status:"abierto" },
  { id:"m77", phase:"RONDA DE 32", round:"r32", date:"Mar 30 Jun", time:"15:00", venue:"East Rutherford",
    kickoffAt:"2026-06-30T15:00:00-06:00", a:"FRA", b:"SWE", status:"abierto" },
  { id:"m79", phase:"RONDA DE 32", round:"r32", date:"Mar 30 Jun", time:"19:00", venue:"Estadio Azteca, CDMX",
    kickoffAt:"2026-06-30T19:00:00-06:00", a:"MEX", b:"ECU", status:"abierto" },
  { id:"m80", phase:"RONDA DE 32", round:"r32", date:"Mié 01 Jul", time:"10:00", venue:"Atlanta",
    kickoffAt:"2026-07-01T10:00:00-06:00", a:"ENG", b:"COD", status:"abierto" },
  { id:"m82", phase:"RONDA DE 32", round:"r32", date:"Mié 01 Jul", time:"14:00", venue:"Seattle",
    kickoffAt:"2026-07-01T14:00:00-06:00", a:"BEL", b:"SEN", status:"abierto" },
  { id:"m81", phase:"RONDA DE 32", round:"r32", date:"Mié 01 Jul", time:"18:00", venue:"Santa Clara",
    kickoffAt:"2026-07-01T18:00:00-06:00", a:"USA", b:"BIH", status:"abierto" },
  { id:"m84", phase:"RONDA DE 32", round:"r32", date:"Jue 02 Jul", time:"13:00", venue:"Inglewood",
    kickoffAt:"2026-07-02T13:00:00-06:00", a:"ESP", b:"AUT", status:"abierto" },
  { id:"m83", phase:"RONDA DE 32", round:"r32", date:"Jue 02 Jul", time:"17:00", venue:"Toronto",
    kickoffAt:"2026-07-02T17:00:00-06:00", a:"POR", b:"CRO", status:"abierto" },
  { id:"m85", phase:"RONDA DE 32", round:"r32", date:"Jue 02 Jul", time:"21:00", venue:"Vancouver",
    kickoffAt:"2026-07-02T21:00:00-06:00", a:"SUI", b:"ALG", status:"abierto" },
  { id:"m88", phase:"RONDA DE 32", round:"r32", date:"Vie 03 Jul", time:"12:00", venue:"Arlington",
    kickoffAt:"2026-07-03T12:00:00-06:00", a:"AUS", b:"EGY", status:"abierto" },
  { id:"m86", phase:"RONDA DE 32", round:"r32", date:"Vie 03 Jul", time:"16:00", venue:"Miami",
    kickoffAt:"2026-07-03T16:00:00-06:00", a:"ARG", b:"CPV", status:"abierto" },
  { id:"m87", phase:"RONDA DE 32", round:"r32", date:"Vie 03 Jul", time:"19:30", venue:"Kansas City",
    kickoffAt:"2026-07-03T19:30:00-06:00", a:"COL", b:"GHA", status:"abierto" },
  { id:"m90", phase:"OCTAVOS DE FINAL", round:"r16", date:"Sáb 04 Jul", time:"11:00", venue:"Houston",
    kickoffAt:"2026-07-04T11:00:00-06:00", a:"CAN", b:"MAR", status:"abierto" },
  { id:"m89", phase:"OCTAVOS DE FINAL", round:"r16", date:"Sáb 04 Jul", time:"15:00", venue:"Philadelphia",
    kickoffAt:"2026-07-04T15:00:00-06:00", a:"PAR", b:"FRA", status:"abierto" },
  { id:"m91", phase:"OCTAVOS DE FINAL", round:"r16", date:"Dom 05 Jul", time:"14:00", venue:"East Rutherford",
    kickoffAt:"2026-07-05T14:00:00-06:00", a:"BRA", b:"NOR", status:"abierto" },
  { id:"m92", phase:"OCTAVOS DE FINAL", round:"r16", date:"Dom 05 Jul", time:"18:00", venue:"Estadio Azteca, CDMX",
    kickoffAt:"2026-07-05T18:00:00-06:00", a:"MEX", b:"ENG", status:"abierto" },
  { id:"m93", phase:"OCTAVOS DE FINAL", round:"r16", date:"Lun 06 Jul", time:"13:00", venue:"Arlington",
    kickoffAt:"2026-07-06T13:00:00-06:00", a:"POR", b:"ESP", status:"abierto" },
  { id:"m94", phase:"OCTAVOS DE FINAL", round:"r16", date:"Lun 06 Jul", time:"18:00", venue:"Seattle",
    kickoffAt:"2026-07-06T18:00:00-06:00", a:"USA", b:"BEL", status:"abierto" },
  { id:"m95", phase:"OCTAVOS DE FINAL", round:"r16", date:"Mar 07 Jul", time:"10:00", venue:"Atlanta",
    kickoffAt:"2026-07-07T10:00:00-06:00", a:"ARG", b:"EGY", status:"abierto" },
  { id:"m96", phase:"OCTAVOS DE FINAL", round:"r16", date:"Mar 07 Jul", time:"14:00", venue:"Vancouver",
    kickoffAt:"2026-07-07T14:00:00-06:00", a:"SUI", b:"COL", status:"abierto" },
  { id:"m97", phase:"CUARTOS DE FINAL", round:"qf", date:"Jue 09 Jul", time:"14:00", venue:"Foxborough",
    kickoffAt:"2026-07-09T14:00:00-06:00", a:"FRA", b:"MAR", status:"abierto" },
  { id:"m98", phase:"CUARTOS DE FINAL", round:"qf", date:"Vie 10 Jul", time:"13:00", venue:"Inglewood",
    kickoffAt:"2026-07-10T13:00:00-06:00", a:"POR", b:"BEL", status:"abierto" },
  { id:"m99", phase:"CUARTOS DE FINAL", round:"qf", date:"Sáb 11 Jul", time:"15:00", venue:"Miami",
    kickoffAt:"2026-07-11T15:00:00-06:00", a:"NOR", b:"ENG", status:"abierto" },
  { id:"m100", phase:"CUARTOS DE FINAL", round:"qf", date:"Sáb 11 Jul", time:"19:00", venue:"Kansas City",
    kickoffAt:"2026-07-11T19:00:00-06:00", a:"ARG", b:"SUI", status:"abierto" },
  { id:"m101", phase:"SEMIFINAL", round:"sf", date:"Mar 14 Jul", time:"13:00", venue:"Arlington",
    kickoffAt:"2026-07-14T13:00:00-06:00", a:null, b:null, aLabel:"Ganador de cuartos", bLabel:"Ganador de cuartos", status:"abierto" },
  { id:"m102", phase:"SEMIFINAL", round:"sf", date:"Mié 15 Jul", time:"13:00", venue:"Atlanta",
    kickoffAt:"2026-07-15T13:00:00-06:00", a:null, b:null, aLabel:"Ganador de cuartos", bLabel:"Ganador de cuartos", status:"abierto" },
  { id:"m103", phase:"3ER PUESTO", round:"third", date:"Sáb 18 Jul", time:"15:00", venue:"Miami",
    kickoffAt:"2026-07-18T15:00:00-06:00", a:null, b:null, aLabel:"Perdedor de semifinal", bLabel:"Perdedor de semifinal", status:"abierto" },
  { id:"m104", phase:"FINAL", round:"final", date:"Dom 19 Jul", time:"13:00", venue:"East Rutherford",
    kickoffAt:"2026-07-19T13:00:00-06:00", a:null, b:null, aLabel:"Ganador de semifinal", bLabel:"Ganador de semifinal", status:"abierto", featured:true },
];

// Mis predicciones demo (vacío: el fixture real arranca sin predicciones cargadas)
window.MY_PREDICTIONS = {};

// Ranking general (top demo). Realista, mezcla tica/argentina/expat.
window.RANKING = [
  { rank:1, name:"Joaco \"El Profeta\"", avatar:"JP", pts:147, exact:8, winner:14, streak:5,
    nat:"ARG", badge:"profeta", trend:"up", you:false },
  { rank:2, name:"Sofi Vargas",          avatar:"SV", pts:138, exact:6, winner:16, streak:3,
    nat:"CRC", badge:"casi",    trend:"up", you:false },
  { rank:3, name:"Diego Maradoneta",     avatar:"DM", pts:131, exact:7, winner:12, streak:2,
    nat:"ARG", badge:"profeta", trend:"down", you:false },
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

// Badges — clave → metadata. Orden = prestigio (el primero ganado es el que
// se muestra en la fila compacta del ranking). Todos se otorgan con datos reales.
window.BADGES = {
  profeta: { label:"El Profeta",      sub:"6+ resultados exactos", emoji:"◎", color:"var(--neon-citrus)" },
  rey:     { label:"Rey del Refugio", sub:"Ganó una semana",       emoji:"♛", color:"var(--orange-400)" },
  casi:    { label:"Casi Brujo",      sub:"3+ resultados exactos", emoji:"✦", color:"var(--orange-500)" },
  cafe:    { label:"Café y Fulbo",    sub:"Está jugando el prode", emoji:"☕", color:"var(--tan-300)" },
};

// Premios — del torneo (posiciones del ranking) + premio semanal rotativo.
window.PRIZES = {
  podium: [
    { rank:1, reward:"USD 100 en consumiciones + camiseta del Refugio", eyebrow:"Campeón del prode", icon:"trophy", tone:"citrus" },
    { rank:2, reward:"USD 50 en consumiciones + camiseta del Refugio",  eyebrow:"Segundo puesto",    icon:"medal",  tone:"char"   },
    { rank:3, reward:"Camiseta del Refugio + un café",                  eyebrow:"Tercer puesto",     icon:"award",  tone:"orange" },
  ],
  weekly: {
    title:  "Premio semanal",
    reward: "Una burger o un desayuno",
    sub:    "Cada semana, el que más puntos hace esa semana se lo lleva. El premio rota: a veces burger, a veces desayuno.",
  },
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

// Opciones de las predicciones especiales (compartidas por la pantalla del jugador
// y el Admin, para que nunca se desincronicen).
// Equipos: TODAS las selecciones del torneo (derivadas de la fixture), con las
// candidatas primero para tenerlas a mano sin scrollear.
window.SPECIAL_TEAMS = (function () {
  const enFixture = new Set();
  (window.MATCHES || []).forEach((m) => { enFixture.add(m.a); enFixture.add(m.b); });
  const favoritos = ["ARG","BRA","FRA","ESP","ENG","POR","GER","NED","BEL","CRO","URU","COL","MAR","MEX","USA","JPN","KOR","SUI"];
  const primero = favoritos.filter((c) => enFixture.has(c));
  const resto = [...enFixture]
    .filter((c) => !primero.includes(c))
    .sort((a, b) => String(window.TEAMS[a] || a).localeCompare(String(window.TEAMS[b] || b)));
  return [...primero, ...resto];
})();

// Filtra una lista de { name, team } a las selecciones que realmente juegan el torneo.
function specialsByFixture(list) {
  const enFixture = new Set();
  (window.MATCHES || []).forEach((m) => { enFixture.add(m.a); enFixture.add(m.b); });
  return list.filter((p) => enFixture.has(p.team));
}

// Candidatos a goleador (Bota de Oro) — figuras del torneo, con su selección
// (la bandera se muestra de fondo en el chip). Sólo entran las que clasificaron.
window.SPECIAL_SCORERS = specialsByFixture([
  { name:"Kylian Mbappé",    team:"FRA" }, { name:"Erling Haaland",   team:"NOR" },
  { name:"Harry Kane",       team:"ENG" }, { name:"Jude Bellingham",  team:"ENG" },
  { name:"Bukayo Saka",      team:"ENG" }, { name:"Lautaro Martínez", team:"ARG" },
  { name:"Julián Álvarez",   team:"ARG" }, { name:"Lionel Messi",     team:"ARG" },
  { name:"Vinícius Jr.",     team:"BRA" }, { name:"Rodrygo",          team:"BRA" },
  { name:"Raphinha",         team:"BRA" }, { name:"Lamine Yamal",     team:"ESP" },
  { name:"Álvaro Morata",    team:"ESP" }, { name:"Cristiano Ronaldo",team:"POR" },
  { name:"Rafael Leão",      team:"POR" }, { name:"Mohamed Salah",    team:"EGY" },
  { name:"Romelu Lukaku",    team:"BEL" }, { name:"Kevin De Bruyne",  team:"BEL" },
  { name:"Memphis Depay",    team:"NED" }, { name:"Cody Gakpo",       team:"NED" },
  { name:"Florian Wirtz",    team:"GER" }, { name:"Jamal Musiala",    team:"GER" },
  { name:"Kai Havertz",      team:"GER" }, { name:"Christian Pulisic",team:"USA" },
  { name:"Hirving Lozano",   team:"MEX" }, { name:"Darwin Núñez",     team:"URU" },
  { name:"Luis Díaz",        team:"COL" }, { name:"Youssef En-Nesyri",team:"MAR" },
  { name:"Takefusa Kubo",    team:"JPN" },
]);

// Candidatos a mejor arquero (Guante de Oro).
window.SPECIAL_KEEPERS = specialsByFixture([
  { name:"Emiliano Martínez",    team:"ARG" }, { name:"Thibaut Courtois", team:"BEL" },
  { name:"Mike Maignan",         team:"FRA" }, { name:"Unai Simón",       team:"ESP" },
  { name:"Alisson",              team:"BRA" }, { name:"Ederson",          team:"BRA" },
  { name:"Yann Sommer",          team:"SUI" }, { name:"Jordan Pickford",  team:"ENG" },
  { name:"Marc-André ter Stegen",team:"GER" }, { name:"Diogo Costa",      team:"POR" },
  { name:"Yassine Bounou",       team:"MAR" }, { name:"Guillermo Ochoa",  team:"MEX" },
  { name:"Matt Turner",          team:"USA" },
]);

// Opciones del especial "Continente del ganador" (admin y jugador eligen de acá,
// así los textos matchean exacto para el puntaje).
window.SPECIAL_CONTINENTS = ["Europa", "Sudamérica", "Resto del mundo"];

// Predicciones especiales del usuario: SIN demo. Arrancan vacías; los picks
// reales viven en specialPredictions/{uid} (read-back en firebase-service).
window.MY_SPECIALS = {};
