const fetch = require('node-fetch');

// CONFIGURE: use um Secret do Vercel chamado GITHUB_TOKEN e defina OWNER/REPO
const OWNER = process.env.GH_OWNER || 'SEU_USUARIO_OU_ORG';
const REPO = process.env.GH_REPO || 'SEU_REPO_DE_COMENTARIOS';
const TOKEN = process.env.GITHUB_TOKEN || 'COLOQUE_O_TOKEN_AQUI_PARA_TESTE'; // preferir Vercel Secret

const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/issues`;
const headers = {
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`
};

async function listIssues() {
  // Puxa issues abertas com label comment e adiciona contagem de likes (armazenada como comentário fixo ou reações)
  const res = await fetch(`${API_BASE}?state=open&labels=comment`, { headers });
  if (!res.ok) throw new Error('GitHub list failed: ' + res.status);
  const issues = await res.json();

  // Para cada issue, buscar um arquivo de likes via issue body metadata ou usar reactions API
  const results = await Promise.all(issues.map(async (issue) => {
    // Obter reações: usar Reactions API para contar "+1"
    const reactionsRes = await fetch(issue.reactions.url, { headers });
    const reactions = reactionsRes.ok ? await reactionsRes.json() : [];
    const plusOne = reactions.filter(r => r.content === '+1').length;
    return {
      number: issue.number,
      title: issue.title,
      body: issue.body,
      created_at: issue.created_at,
      likes: plusOne
    };
  }));

  return results;
}

module.exports = async (req, res) => {
  try{
    if (req.method === 'GET' && req.url.endsWith('/list')) {
      const items = await listIssues();
      return res.json(items);
    }

    if (req.method === 'POST' && req.url.endsWith('/create')) {
      const { name, body } = req.body;
      if (!body) return res.status(400).send('Missing body');
      const payload = { title: `${name} — comentário`, body, labels: ['comment'] };
      const r = await fetch(API_BASE, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!r.ok) {
        const txt = await r.text();
        return res.status(500).send('GitHub create failed: ' + txt);
      }
      const json = await r.json();
      return res.json(json);
    }

    if (req.method === 'POST' && req.url.endsWith('/like')) {
      const { issueNumber } = req.body;
      if (!issueNumber) return res.status(400).send('Missing issueNumber');
      // Usar Reactions API para adicionar +1
      const reactUrl = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${issueNumber}/reactions`;
      const r = await fetch(reactUrl, {
        method: 'POST',
        headers: Object.assign({}, headers, { Accept: 'application/vnd.github.squirrel-girl-preview+json' }),
        body: JSON.stringify({ content: '+1' })
      });
      if (!r.ok) {
        const txt = await r.text();
        return res.status(500).send('Reaction failed: ' + txt);
      }
      // Recontar reações
      const reactionsRes = await fetch(`${API_BASE}/${issueNumber}/reactions`, { headers: { Accept: 'application/vnd.github.squirrel-girl-preview+json', Authorization: `Bearer ${TOKEN}` } });
      const reactions = reactionsRes.ok ? await reactionsRes.json() : [];
      const plusOne = reactions.filter(r => r.content === '+1').length;
      return res.json({ likes: plusOne });
    }

    res.status(404).send('Not found');
  }catch(err){
    res.status(500).send(err.message);
  }
};
