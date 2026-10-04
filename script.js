(function () {
  const DB_ENABLED = true; // true = tenta gravar/ler o contador compartilhado | false = modo local, sem banco
  const SAVE_STAMPS = true; // true = guarda os carimbos no celular entre visitas | false = sempre começa do zero (bom pra testar)

  const BIOMES = ['amazonia', 'cerrado', 'caatinga', 'mata-atlantica', 'pantanal', 'pampa'];
  const ROTATIONS = [-13, 8, -9, 14, -7, 11, -11, 6, -15, 9];

  const COUNTRIES = [
    { id: 'japao', name: 'Japão', flag: '🇯🇵', password: 'SAKURA', message: 'Konnichiwa! Bem-vindo ao Japão. Tira o sapato na entrada e fica à vontade pra tentar dobrar seu primeiro origami.' },
    { id: 'china', name: 'China', flag: '🇨🇳', password: 'DRAGAO', message: 'Nǐ hǎo! Bem-vindo à China. Senta um pouco, aceita o chá que oferecerem e repara na caligrafia pendurada na parede.' },
    { id: 'coreia-do-sul', name: 'Coreia do Sul', flag: '🇰🇷', password: 'HALLYU', message: 'Annyeonghaseyo! Bem-vindo à Coreia do Sul. Tem k-pop tocando baixinho e um prato de tteokbokki esperando você experimentar.' },
    { id: 'tailandia', name: 'Tailândia', flag: '🇹🇭', password: 'SIAM', message: 'Sawasdee! Bem-vindo à Tailândia. O cheiro de pimenta e limão já avisa que a comida aqui não é pra quem tem medo de picante.' },
    { id: 'cabo-verde', name: 'Cabo Verde', flag: '🇨🇻', password: 'MORNA', message: 'Bem-vindo a Cabo Verde! Põe uma morna pra tocar baixinho e senta, que a conversa aqui rende tanto quanto a música.' },
    { id: 'africa-do-sul', name: 'África do Sul', flag: '🇿🇦', password: 'SAFARI', message: 'Sawubona! Bem-vindo à África do Sul. São onze línguas oficiais num país só, então pergunta pra alguém daqui como se cumprimenta na língua dele.' },
    { id: 'italia', name: 'Itália', flag: '🇮🇹', password: 'PASTA', message: 'Benvenuto in Italia! Puxa uma cadeira, a massa tá quase pronta e por aqui todo mundo fala um pouco com as mãos.' },
    { id: 'portugal', name: 'Portugal', flag: '🇵🇹', password: 'NATA', message: 'Bem-vindo a Portugal! Pega um pastel de nata ainda morno e prepara o ouvido pro sotaque de lá.' },
    { id: 'franca', name: 'França', flag: '🇫🇷', password: 'CROISSANT', message: 'Bienvenue en France! Pega um croissant ainda quente e senta um pouco pra ouvir como soa o francês de verdade.' },
    { id: 'irlanda', name: 'Irlanda', flag: '🇮🇪', password: 'TREVO', message: 'Bem-vindo à Irlanda! Chove direto e ninguém liga, então senta perto do violino e escuta a música tocar.' },
    { id: 'jamaica', name: 'Jamaica', flag: '🇯🇲', password: 'REGGAE', message: 'Bem-vindo à Jamaica! Bota um reggae pra tocar e relaxa, que por aqui ninguém tem pressa de chegar a lugar nenhum.' },
    { id: 'estados-unidos', name: 'Estados Unidos', flag: '🇺🇸', password: 'LIBERDADE', message: 'Bem-vindo aos Estados Unidos! Pega um hambúrguer quentinho e prepara o estômago, porque aqui o prato vem grande mesmo.' },
    { id: 'canada', name: 'Canadá', flag: '🇨🇦', password: 'BORDO', message: 'Bem-vindo ao Canadá! Aqui o inverno é sério, o hóquei também, e sempre tem um pote de xarope de bordo por perto.' },
    { id: 'mexico', name: 'México', flag: '🇲🇽', password: 'AGAVE', message: '¡Bienvenido a México! O guacamole foi feito na hora, então prepara o paladar antes de sair daqui.' },
    { id: 'arabia-saudita', name: 'Arábia Saudita', flag: '🇸🇦', password: 'TAMARA', message: 'Bem-vindo à Arábia Saudita! Aceita a tâmara que oferecerem e experimenta o café árabe, bem diferente do que a gente toma por aqui.' },
    { id: 'brasil', name: 'Brasil', flag: '🇧🇷', password: 'SAMBA', message: 'Bem-vindo ao Brasil! Tem forró tocando, cheiro de pão de queijo no ar e a galera aqui já separou um cafezinho pra você.' },
    { id: 'egito', name: 'Egito', flag: '🇪🇬', password: 'NILO', message: 'Bem-vindo ao Egito! Serve um chá de hibisco bem doce e repara nos hieróglifos desenhados na parede.' }
  ].map((c, i) => ({
    ...c,
    biome: BIOMES[i % BIOMES.length],
    rot: ROTATIONS[i % ROTATIONS.length],
    code: 'SEC-' + (i + 1).toString().padStart(2, '0')
  }));

  const $ = (s, el = document) => el.querySelector(s);
  const params = new URLSearchParams(location.search);
  const state = {
    name: localStorage.getItem('ffn_name') || '',
    stamps: SAVE_STAMPS ? JSON.parse(localStorage.getItem('ffn_stamps') || '{}') : {},
    counts: {}
  };

  let db = null;
  (async () => {
    if (!DB_ENABLED) { renderGrid(); return; }
    try { db = await claude.use('db'); } catch (e) { db = null; }
    subscribeCounts();
  })();

  function subscribeCounts() {
    if (!db) { renderGrid(); return; }
    try {
      const col = db.collection('visits');
      if (col && col.onSnapshot) {
        col.onSnapshot((snap) => {
          (snap.docs || snap || []).forEach(d => {
            const id = d.id;
            const data = d.data ? d.data() : d;
            if (id && data) state.counts[id] = data.count || 0;
          });
          renderGrid();
        });
      } else { renderGrid(); }
    } catch (e) { renderGrid(); }
  }

  async function incrementVisit(id) {
    if (!db) return;
    try {
      const ref = db.doc('visits/' + id);
      const snap = await ref.get();
      const current = (snap && snap.data && snap.data() && snap.data().count) || (snap && snap.count) || 0;
      await ref.set({ count: current + 1 });
      state.counts[id] = current + 1;
      renderGrid();
    } catch (e) { /* sem permissão de escrita — carimbo local segue valendo */ }
  }

  function saveLocal() {
    if (!SAVE_STAMPS) return;
    localStorage.setItem('ffn_stamps', JSON.stringify(state.stamps));
  }

  function renderGrid() {
    const grid = $('#stampGrid');
    grid.innerHTML = '';
    let visited = 0;
    COUNTRIES.forEach((c, i) => {
      const isVisited = !!state.stamps[c.id];
      if (isVisited) visited++;
      const el = document.createElement('div');
      el.className = 'slot' + (isVisited ? ' visited' : '');
      el.style.setProperty('--biome', `var(--${c.biome})`);
      const visitsText = state.counts[c.id] !== undefined ? ('Visitas: ' + state.counts[c.id]) : 'Não visitado';
      const dateStr = isVisited ? new Date(state.stamps[c.id]).toLocaleDateString('pt-BR') : '';

      el.innerHTML = `
        <div class="slot-meta">
          <span class="slot-code">${c.code}</span>
        </div>
        <div class="slot-body">
          <div class="flag">${c.flag}</div>
          <div class="name">${c.name}</div>
          <div class="visits">${visitsText}</div>
        </div>
        ${!isVisited ? '<button class="go-btn" type="button">Carimbar</button>' : ''}
        ${isVisited ? `
          <div class="stamp-mark">
            <div class="ring" style="transform: rotate(${c.rot}deg);">
              <span class="stamp-top">VISITEI!</span>
              <span class="stamp-country">${c.name.toUpperCase()}</span>
              <span class="stamp-date">${dateStr}</span>
              <span class="stamp-bottom">★ CONFIRMADO ★</span>
            </div>
          </div>` : ''}
      `;
      el.addEventListener('click', () => openModal(c));
      grid.appendChild(el);
    });
    $('#visitedCount').textContent = visited;
    $('#totalCount').textContent = COUNTRIES.length;
    renderMRZ();
  }

  function mrzify(str, len) {
    const clean = (str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z<]/g, '');
    return (clean + '<'.repeat(len)).slice(0, len);
  }

  function renderMRZ() {
    const parts = (state.name || 'VIAJANTE').trim().split(/\s+/);
    const sobrenome = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const nome = parts.slice(0, parts.length > 1 ? -1 : 1).join(' ') || parts[0];
    const line1 = mrzify('P<BRA' + sobrenome + '<<' + nome, 44);
    const stampedCount = Object.keys(state.stamps).length;
    const pseudoNumber = 'FN' + String(stampedCount).padStart(2, '0') + String((state.name.length || 1) * 7).padStart(4, '0');
    const line2 = mrzify(pseudoNumber + '<3BRA' + '0001019' + 'M' + '3001019' + '<<<<<<<<<<<<<<02', 44);
    $('#mrz').textContent = line1 + '\n' + line2;
  }

  function openModal(c) {
    const overlay = $('#overlay');
    const modal = $('#modalContent');
    modal.style.setProperty('--biome', `var(--${c.biome})`);
    const already = !!state.stamps[c.id];
    const dateStr = already ? new Date(state.stamps[c.id]).toLocaleDateString('pt-BR') : '';

    modal.innerHTML = `
      <div class="modal-badge-top">Carimbo da Feira</div>
      <div class="flag-big">${c.flag}</div>
      <div class="modal-subheading">Estande · ${c.code}</div>
      <h3>${c.name}</h3>
      ${already
        ? `<p class="modal-desc">${c.message}</p>
           <div class="already-box">
             <div class="already-title">País já carimbado!</div>
             <div class="already-date">Visitado em ${dateStr}</div>
           </div>
           <div class="stamp-fx">
             <div class="ring" style="animation:none;opacity:.88;transform:rotate(${c.rot}deg) scale(1);">
               <span class="stamp-top">VISITEI!</span>
               <span class="stamp-country">${c.name.toUpperCase()}</span>
               <span class="stamp-date">${dateStr}</span>
               <span class="stamp-bottom">★ CONFIRMADO ★</span>
             </div>
           </div>`
        : `<p class="modal-desc">${c.message}</p>
           <div class="password-field">
             <label for="passInput" class="pass-label">Palavra secreta</label>
             <input type="text" id="passInput" class="pass-input" placeholder="Peça a palavra para a equipe da sala" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
             <div class="pass-error" id="passError"></div>
           </div>
           <div class="modal-actions">
             <button class="btn-secondary" id="cancelBtn" type="button">Agora não</button>
             <button class="btn-primary" id="confirmBtn" type="button">Carimbar</button>
           </div>`
      }
    `;
    overlay.classList.add('active');
    if (!already) {
      const passInput = $('#passInput');
      const confirmBtn = $('#confirmBtn');
      $('#cancelBtn').addEventListener('click', closeModal);
      confirmBtn.addEventListener('click', () => attemptStamp(c));
      passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptStamp(c); });
      setTimeout(() => passInput.focus(), 250);
    } else {
      modal.addEventListener('click', closeModal);
    }
  }

  function attemptStamp(c) {
    const input = $('#passInput');
    const errorEl = $('#passError');
    const entered = (input.value || '').trim();

    if (entered.toUpperCase() === c.password) {
      confirmStamp(c);
    } else {
      input.classList.add('error');
      errorEl.textContent = entered ? 'Palavra incorreta — peça a dica para a equipe da sala.' : 'Digite a palavra secreta para carimbar sua visita.';
      input.focus();
      input.select();
      setTimeout(() => input.classList.remove('error'), 400);
    }
  }

  function confirmStamp(c) {
    state.stamps[c.id] = Date.now();
    saveLocal();
    incrementVisit(c.id);
    const modal = $('#modalContent');
    const dateStr = new Date().toLocaleDateString('pt-BR');

    modal.innerHTML = `
      <div class="modal-badge-top">Carimbo da Feira</div>
      <div class="flag-big">${c.flag}</div>
      <div class="modal-subheading">Estande · ${c.code}</div>
      <h3>${c.name}</h3>
      <p class="modal-desc">Carimbo adicionado ao seu passaporte com sucesso! 🎉</p>
      <div class="stamp-fx">
        <div class="ring">
          <span class="stamp-top">VISTO DE ENTRADA</span>
          <span class="stamp-country">${c.name.toUpperCase()}</span>
          <span class="stamp-date">${dateStr}</span>
          <span class="stamp-bottom">★ AUTORIZADO ★</span>
        </div>
      </div>
    `;
    renderGrid();
    setTimeout(closeModal, 1500);
  }

  function closeModal() { $('#overlay').classList.remove('active'); }
  $('#overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') closeModal(); });

  function openBook() {
    const name = $('#nameInput').value.trim();
    state.name = name || 'Viajante';
    localStorage.setItem('ffn_name', state.name);
    $('#ownerName').textContent = state.name;

    const cover = $('#cover');
    cover.classList.add('hiding');
    cover.addEventListener('transitionend', function handler() {
      cover.removeEventListener('transitionend', handler);
      cover.style.display = 'none';
      $('#book').classList.add('active');
      renderGrid();
    }, { once: true });

    setTimeout(() => {
      if (cover.style.display !== 'none') {
        cover.style.display = 'none';
        $('#book').classList.add('active');
        renderGrid();
      }
    }, 400);
  }

  $('#openBtn').addEventListener('click', openBook);
  $('#nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') openBook(); });

  const paisParam = params.get('pais');
  if (paisParam) {
    const found = COUNTRIES.find(c => c.id === paisParam);
    if (found) {
      history.replaceState({}, '', location.pathname);
      if (state.name) { $('#nameInput').value = state.name; }
      openBook();
      setTimeout(() => openModal(found), 400);
    }
  } else if (state.name) {
    $('#nameInput').value = state.name;
  }

  $('#adminToggleBtn').addEventListener('click', () => {
    const panel = $('#adminPanel');
    panel.classList.toggle('active');
    if (panel.classList.contains('active') && !panel.dataset.built) {
      panel.dataset.built = '1';
      const base = location.origin + location.pathname;
      const wrap = document.createElement('div');
      wrap.className = 'cards-wrap';
      COUNTRIES.forEach(c => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.setProperty('--biome', `var(--${c.biome})`);
        const url = base + '?pais=' + c.id;
        card.innerHTML = `
          <div class="card-header">
            <span class="card-flag">${c.flag}</span>
            <span class="card-badge">${c.code}</span>
          </div>
          <h4>${c.name}</h4>
          <div class="qr-box" id="qr-${c.id}"></div>
          <div class="url">${url}</div>
          <div class="pass-hint">Palavra secreta: <strong>${c.password}</strong></div>
        `;
        wrap.appendChild(card);
        try { new QRCode(document.getElementById('qr-' + c.id), { text: url, width: 128, height: 128 }); }
        catch (e) { document.getElementById('qr-' + c.id).textContent = '(QR indisponível offline)'; }
      });
      panel.appendChild(wrap);
    }
  });
})();