const API = 'https://brasilapi.com.br/api';
const panels = document.querySelectorAll('.panel');
const menuItems = document.querySelectorAll('[data-panel]');
const pageTitle = document.getElementById('pageTitle');
const alertBox = document.getElementById('alert');
const titles = {dashboard:'Dashboard',cep:'Consulta CEP',cnpj:'Consulta CNPJ',ddd:'Consulta DDD',feriados:'Feriados',bancos:'Bancos',pix:'PIX',historico:'Histórico'};

function onlyNumbers(value){return String(value || '').replace(/\D/g,'');}
function escapeHTML(value){return String(value ?? '-').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function showAlert(message){alertBox.textContent = message; alertBox.classList.remove('hidden'); setTimeout(()=>alertBox.classList.add('hidden'), 5000);}
function setLoading(el, text='Consultando...'){el.innerHTML = `<div class="loader">${text}</div>`;}
function makeTable(rows){return `<table class="result-table"><tbody>${rows.map(([k,v])=>`<tr><th>${escapeHTML(k)}</th><td>${v || '-'}</td></tr>`).join('')}</tbody></table>`;}
function saveHistory(type, value, data){
  const history = JSON.parse(localStorage.getItem('ff_history') || '[]');
  history.unshift({type, value, date:new Date().toLocaleString('pt-BR'), data});
  localStorage.setItem('ff_history', JSON.stringify(history.slice(0,50)));
}
function renderHistory(){
  const el = document.getElementById('historyResult');
  const history = JSON.parse(localStorage.getItem('ff_history') || '[]');
  if(!history.length){el.innerHTML = '<p>Nenhuma consulta salva ainda.</p>';return;}
  el.innerHTML = `<table class="result-table"><thead><tr><th>Tipo</th><th>Valor</th><th>Data</th></tr></thead><tbody>${history.map(h=>`<tr><td>${escapeHTML(h.type)}</td><td>${escapeHTML(h.value)}</td><td>${escapeHTML(h.date)}</td></tr>`).join('')}</tbody></table>`;
}
function switchPanel(panel){
  panels.forEach(p=>p.classList.toggle('active', p.id === `panel-${panel}`));
  document.querySelectorAll('.menu-item').forEach(i=>i.classList.toggle('active', i.dataset.panel === panel));
  pageTitle.textContent = titles[panel] || 'Dashboard';
  if(panel === 'historico') renderHistory();
  document.getElementById('sidebar').classList.remove('open');
}
menuItems.forEach(item=>item.addEventListener('click',()=>switchPanel(item.dataset.panel)));
document.getElementById('mobileMenu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('light'); localStorage.setItem('ff_theme', document.body.classList.contains('light') ? 'light' : 'dark');});
if(localStorage.getItem('ff_theme') === 'light') document.body.classList.add('light');
setInterval(()=>document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),1000);

async function fetchBrasil(path){
  const response = await fetch(`${API}${path}`);
  const data = await response.json().catch(()=>({message:'Erro ao ler resposta da API.'}));
  if(!response.ok) throw new Error(data.message || 'Consulta não encontrada.');
  return data;
}
async function consultarCEP(){
  const input = document.getElementById('cepInput'); const result = document.getElementById('cepResult'); const cep = onlyNumbers(input.value);
  if(cep.length !== 8) return showAlert('Digite um CEP válido com 8 números.');
  setLoading(result);
  try{
    const d = await fetchBrasil(`/cep/v1/${cep}`);
    result.innerHTML = makeTable([['CEP', escapeHTML(d.cep)],['Rua', escapeHTML(d.street)],['Bairro', escapeHTML(d.neighborhood)],['Cidade', escapeHTML(d.city)],['UF', escapeHTML(d.state)]]) + `<button class="ghost-btn copy-btn" onclick="copyResult('cepResult')"><i class="fa-solid fa-copy"></i> Copiar</button>`;
    saveHistory('CEP', cep, d);
  }catch(e){result.innerHTML = ''; showAlert(e.message);}
}
async function consultarCNPJ(){
  const cnpj = onlyNumbers(document.getElementById('cnpjInput').value); const result = document.getElementById('cnpjResult');
  if(cnpj.length !== 14) return showAlert('Digite um CNPJ válido com 14 números.');
  setLoading(result);
  try{
    const d = await fetchBrasil(`/cnpj/v1/${cnpj}`);
    const endereco = `${d.logradouro || ''}, ${d.numero || ''} - ${d.bairro || ''}, ${d.municipio || ''}/${d.uf || ''}`;
    result.innerHTML = makeTable([['Razão Social', escapeHTML(d.razao_social)],['Nome Fantasia', escapeHTML(d.nome_fantasia || '-')],['Situação', escapeHTML(d.descricao_situacao_cadastral)],['CNAE Principal', escapeHTML(d.cnae_fiscal_descricao)],['Endereço', escapeHTML(endereco)],['CEP', escapeHTML(d.cep)],['Telefone', escapeHTML(d.ddd_telefone_1 || '-')],['Email', escapeHTML(d.email || '-')]]) + `<button class="ghost-btn copy-btn" onclick="copyResult('cnpjResult')"><i class="fa-solid fa-copy"></i> Copiar</button>`;
    saveHistory('CNPJ', cnpj, d);
  }catch(e){result.innerHTML = ''; showAlert(e.message);}
}
async function consultarDDD(){
  const ddd = onlyNumbers(document.getElementById('dddInput').value); const result = document.getElementById('dddResult');
  if(ddd.length < 2) return showAlert('Digite um DDD válido.');
  setLoading(result);
  try{
    const d = await fetchBrasil(`/ddd/v1/${ddd}`);
    result.innerHTML = makeTable([['Estado', escapeHTML(d.state)],['Cidades', d.cities.map(c=>`<span class="pill">${escapeHTML(c)}</span>`).join('')]]) + `<button class="ghost-btn copy-btn" onclick="copyResult('dddResult')"><i class="fa-solid fa-copy"></i> Copiar</button>`;
    saveHistory('DDD', ddd, d);
  }catch(e){result.innerHTML = ''; showAlert(e.message);}
}
async function consultarFeriados(){
  const year = onlyNumbers(document.getElementById('feriadosInput').value) || new Date().getFullYear(); const result = document.getElementById('feriadosResult');
  if(String(year).length !== 4) return showAlert('Digite um ano válido com 4 números.');
  setLoading(result);
  try{
    const list = await fetchBrasil(`/feriados/v1/${year}`);
    result.innerHTML = `<table class="result-table"><thead><tr><th>Data</th><th>Nome</th><th>Tipo</th></tr></thead><tbody>${list.map(f=>`<tr><td>${escapeHTML(new Date(f.date+'T00:00:00').toLocaleDateString('pt-BR'))}</td><td>${escapeHTML(f.name)}</td><td>${escapeHTML(f.type)}</td></tr>`).join('')}</tbody></table>`;
    saveHistory('Feriados', year, list);
  }catch(e){result.innerHTML = ''; showAlert(e.message);}
}
async function consultarBancos(){
  const q = document.getElementById('bancosInput').value.trim().toLowerCase(); const result = document.getElementById('bancosResult');
  setLoading(result);
  try{
    const list = await fetchBrasil('/banks/v1');
    const filtered = list.filter(b => !q || String(b.code).includes(q) || String(b.name).toLowerCase().includes(q) || String(b.fullName).toLowerCase().includes(q)).slice(0,80);
    result.innerHTML = `<table class="result-table"><thead><tr><th>Código</th><th>Banco</th><th>Nome completo</th></tr></thead><tbody>${filtered.map(b=>`<tr><td>${escapeHTML(b.code)}</td><td>${escapeHTML(b.name)}</td><td>${escapeHTML(b.fullName)}</td></tr>`).join('')}</tbody></table>`;
    saveHistory('Bancos', q || 'lista', filtered);
  }catch(e){result.innerHTML = ''; showAlert(e.message);}
}
function decodePix(){
  const payload = document.getElementById('pixInput').value.trim(); const result = document.getElementById('pixResult');
  if(!payload) return showAlert('Cole um código PIX copia e cola.');
  const fields = parseTLV(payload);
  const merchant = fields['59']; const city = fields['60']; const amount = fields['54']; const txid = fields['62'] ? parseTLV(fields['62'])['05'] : '';
  result.innerHTML = makeTable([['Nome do recebedor', escapeHTML(merchant)],['Cidade', escapeHTML(city)],['Valor', escapeHTML(amount ? `R$ ${amount}` : '-')],['TXID', escapeHTML(txid)],['Tamanho do código', escapeHTML(payload.length)]]) + `<button class="ghost-btn copy-btn" onclick="copyResult('pixResult')"><i class="fa-solid fa-copy"></i> Copiar</button>`;
  saveHistory('PIX', merchant || 'payload', {merchant, city, amount, txid});
}
function parseTLV(str){
  const out = {}; let i = 0;
  while(i + 4 <= str.length){
    const id = str.slice(i,i+2); const len = parseInt(str.slice(i+2,i+4),10); const value = str.slice(i+4,i+4+len);
    if(Number.isNaN(len) || len < 0) break; out[id] = value; i += 4 + len;
  }
  return out;
}
function copyResult(id){
  const text = document.getElementById(id).innerText.replace('Copiar','').trim();
  navigator.clipboard.writeText(text).then(()=>showAlert('Resultado copiado para a área de transferência.')).catch(()=>showAlert('Não foi possível copiar automaticamente.'));
}
window.copyResult = copyResult;

document.getElementById('cepBtn').addEventListener('click', consultarCEP);
document.getElementById('cnpjBtn').addEventListener('click', consultarCNPJ);
document.getElementById('dddBtn').addEventListener('click', consultarDDD);
document.getElementById('feriadosBtn').addEventListener('click', consultarFeriados);
document.getElementById('bancosBtn').addEventListener('click', consultarBancos);
document.getElementById('pixBtn').addEventListener('click', decodePix);
document.getElementById('pixClearBtn').addEventListener('click',()=>{document.getElementById('pixInput').value='';document.getElementById('pixResult').innerHTML='';});
document.getElementById('clearHistoryBtn').addEventListener('click',()=>{localStorage.removeItem('ff_history'); renderHistory();});
['cepInput','cnpjInput','dddInput','feriadosInput','bancosInput'].forEach(id=>document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter') e.target.parentElement.querySelector('button').click();}));
document.getElementById('feriadosInput').value = new Date().getFullYear();
