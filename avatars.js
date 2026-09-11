export const AVATARS = [
  {id:'pineapple-hair',group:'neutral',name:'Professor Ananassveis',line:'Sveisen peker oppover. Ambisjonene også. Vi begynner med ett tall.'},
  {id:'propeller-cap',group:'neutral',name:'Lektor Propell',line:'Propellen driver tankene. Batteriene er dessverre meg.'},
  {id:'magnificent-mullet',group:'neutral',name:'Business foran, brøk bak',line:'Kort foran, langt bak. Regnerekkefølgen har heldigvis bedre struktur enn sveisen.'},
  {id:'enormous-bowtie',group:'neutral',name:'Sløyfe med lærer vedlagt',line:'Sløyfen er større enn planen. Vi tar ett regnestykke om gangen.'},
  {id:'chef-hat',group:'neutral',name:'Kjøkkensjef for små tall',line:'Fem terninger, en klype parenteser. Jeg lover å holde skjegget ute av regnestykket.'},
  {id:'snorkel',group:'neutral',name:'Dypdykk i grunnregning',line:'Jeg er klar for et dypdykk. Vi starter på grunt vann: tallet 1.'},
  {id:'colander-hat',group:'support',name:'Sikkerhetssjef Dørslag',line:'Jeg har tatt på tenkehjelmen. Den har noen hull. Vi prøver et lite steg til.'},
  {id:'tiny-umbrella-hat',group:'support',name:'Lett regn av ideer',line:'Litt motvind i regningen? Jeg har en altfor liten paraply. Ta den tiden du trenger.'},
  {id:'tangled-yarn-hair',group:'support',name:'Flokeansvarlig',line:'Tankene kan gå i surr. Se på håret mitt. Vi nøster opp ett regnetegn om gangen.'},
  {id:'backwards-cap',group:'support',name:'Bakvendt, men optimistisk',line:'Capsen er bak fram. Det betyr ikke at hele dagen er feil. Prøv å justere én ting.'},
  {id:'sleepy-nightcap',group:'support',name:'Vikar for egen hjerne',line:'Jeg møtte med nattlue. Du møtte med et forsøk. Du leder på innsats.'},
  {id:'crooked-wig',group:'support',name:'Parentes i parykken',line:'Parykken min trenger også et nytt forsøk. Se på regnerekkefølgen, så tar vi det rolig.'},
  {id:'detective',group:'hint',name:'Detektiv Desimal',line:'Jeg har funnet et spor. Det var først skjegget mitt, men nå ser jeg på tallene.'},
  {id:'wizard',group:'hint',name:'Trollmann med tavlekritt',line:'Jeg kan ikke trylle fram nye terninger. Det står visst i reglene for trollmenn også.'},
  {id:'lightbulb-helmet',group:'hint',name:'Selvutnevnt lysende hode',line:'Lyspæren er på. Nå gjenstår bare å koble til en idé.'},
  {id:'mad-scientist',group:'hint',name:'Professor Hårsveis',line:'Forsøket er under kontroll. Det gjelder ikke håret.'},
  {id:'pencil-librarian',group:'hint',name:'Arkivar for nesten gode ideer',line:'Jeg har sortert ideene alfabetisk. Heldigvis trenger vi bare én som virker.'},
  {id:'astronaut',group:'hint',name:'Bakkekontroll Eirik',line:'Houston, vi har fem terninger. Jeg undersøker en mulig landingsplass.'},
  {id:'tiny-crown',group:'streak',name:'Kongen av å stå ved siden av',line:'Du regner. Jeg setter på krone. Arbeidsfordelingen bør kanskje diskuteres.'},
  {id:'towel-superhero',group:'streak',name:'Kaptein Kjøkkenhåndkle',line:'Du har superkrefter i regningen. Jeg har et håndkle rundt halsen. Sterkt lag.'},
  {id:'disco',group:'streak',name:'Disco med regnefeil i knærne',line:'Tallene sitter! Jeg danser. Beklager på forhånd til alle med øyne.'},
  {id:'medal-overload',group:'streak',name:'Medalje i medvirkning',line:'Enda et tall! Jeg har gitt meg selv medalje for å være til stede.'},
  {id:'foam-viking',group:'streak',name:'Erobrer av tavlesvampen',line:'Tallstien vokser! Jeg roper seiersrop fra trygg avstand bak tavlesvampen.'},
  {id:'rockstar',group:'streak',name:'Luftgitar og heltall',line:'Du leverer tall på rekke. Jeg tar gitarsoloen ingen ba om.'},
];

export function avatarGroup(event, streak = 0) {
  if (event === 'error') return 'support';
  if (event === 'hint') return 'hint';
  if (event === 'success' && streak >= 3) return 'streak';
  return 'neutral';
}

// Cycle through every costume in a group before repeating it. Randomize only the
// starting position; no timers or costume changes while the student is reading.
export function createAvatarPicker(random = Math.random) {
  const cursors = new Map();
  return group => {
    const pool = group === 'all' ? AVATARS : AVATARS.filter(avatar => avatar.group === group);
    if (!pool.length) throw new Error('Unknown avatar group');
    const cursor = cursors.has(group) ? cursors.get(group) : Math.floor(random() * pool.length);
    cursors.set(group,cursor + 1);
    return pool[cursor % pool.length];
  };
}
