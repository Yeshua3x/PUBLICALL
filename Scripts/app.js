// Ponto único de configuração: API que lida com criação/fechamento de issues e likes
const API_BASE = '/api/github';

const nameInput = document.getElementById('name');
const commentInput = document.getElementById('comment');
const btnPublish = document.getElementById('btn-publish');
const commentsDiv = document.getElementById('comments');
const statusDiv = document.getElementById('status');

function setStatus(msg, err=false){
  statusDiv.textContent = msg || '';
  statusDiv.style.color = err ? 'var(--danger)' : 'var(--muted)';
}

async function listComments(){
  setStatus('Carregando comentários...');
  try{
    const res = await fetch(`${API_BASE}/list`);
    if (!res.ok) throw new Error('Erro ao carregar comentários');
    const data = await res.json();
    renderComments(data);
    setStatus('');
  }catch(err){
    setStatus(err.message, true);
  }
}

function renderComments(items){
  commentsDiv.innerHTML = '';
  if (!items.length){
    commentsDiv.innerHTML = '<div class="comment-card"><div class="comment-main"><div class="comment-meta">Nenhum comentário.</div></div></div>';
    return;
  }

  items.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  items.forEach(item=>{
    const card = document.createElement('div');
    card.className = 'comment-card';

    const main = document.createElement('div');
    main.className = 'comment-main';

    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    meta.textContent = `${item.title.replace(' — comentário','')} • ${new Date(item.created_at).toLocaleString()}`;

    const body = document.createElement('div');
    body.className = 'comment-body';
    body.textContent = item.body || '';

    main.appendChild(meta);
    main.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'comment-actions';

    const likeBtn = document.createElement('button');
    likeBtn.className = 'like-btn';
    likeBtn.textContent = 'Curtir';
    likeBtn.onclick = ()=> toggleLike(item.number);

    const likeCount = document.createElement('span');
    likeCount.className = 'like-count';
    likeCount.id = `like-${item.number}`;
    likeCount.textContent = item.likes || 0;

    actions.appendChild(likeBtn);
    actions.appendChild(likeCount);

    card.appendChild(main);
    card.appendChild(actions);
    commentsDiv.appendChild(card);
  });
}

async function postComment(name, body){
  setStatus('Publicando comentário...');
  try{
    const res = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, body })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Erro ao publicar: ' + txt);
    }
    nameInput.value = '';
    commentInput.value = '';
    setStatus('Publicado.');
    listComments();
  }catch(err){
    setStatus(err.message, true);
  }
}

async function toggleLike(issueNumber){
  try{
    const res = await fetch(`${API_BASE}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueNumber })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Erro ao curtir: ' + txt);
    }
    const data = await res.json();
    const el = document.getElementById(`like-${issueNumber}`);
    if (el) el.textContent = data.likes;
  }catch(err){
    setStatus(err.message, true);
  }
}

btnPublish.addEventListener('click', ()=>{
  const name = nameInput.value.trim() || 'Anônimo';
  const body = commentInput.value.trim();
  if (!body) { setStatus('Escreva um comentário.', true); return; }
  postComment(name, body);
});

// inicializa
listComments();
