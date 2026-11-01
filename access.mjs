import { normalizeRegistry, registryEmail, passwordToken } from './credentials.mjs';

const form = document.getElementById('access-form');
const login = document.getElementById('agent-id');
const password = document.getElementById('agent-password');
const submit = document.getElementById('access-submit');
const notice = document.getElementById('access-feedback');
const record = document.getElementById('agent-record');
const title = document.getElementById('access-title');
const description = document.getElementById('access-notice');
const logout = document.getElementById('agent-logout');
const loginLayout = document.getElementById('login-layout');
const centelhaForm = document.getElementById('centelha-form');
const centelhaInput = document.getElementById('centelha-code');
const centelhaSubmit = document.getElementById('centelha-submit');
const centelhaNotice = document.getElementById('centelha-feedback');
const masterPanel = document.getElementById('master-panel');
const masterTeam = document.getElementById('master-team');
const masterFeedback = document.getElementById('master-feedback');
const masterRefresh = document.getElementById('master-refresh');
let recordUser = null;
let isMaster = false;
const config = window.CODEX_ACCESS;
const memory = new Map();
const storage = {
  getItem(key) { try { return sessionStorage.getItem(key); } catch { return memory.get(key) ?? null; } },
  setItem(key, value) { try { sessionStorage.setItem(key, value); } catch { memory.set(key, value); } },
  removeItem(key) { try { sessionStorage.removeItem(key); } catch { memory.delete(key); } }
};
const feedback = (text, error = false) => {
  notice.hidden = !text;
  notice.textContent = text;
  notice.classList.toggle('error', error);
};
const showLogin = () => {
  recordUser = null;
  isMaster = false;
  masterPanel.hidden = true;
  masterTeam.replaceChildren();
  document.querySelector('.staff-stages').hidden = false;
  loginLayout.hidden = false;
  document.querySelector('.mobile-jump').hidden = false;
  form.hidden = false;
  record.hidden = true;
  document.getElementById('paradox-archive').hidden = true;
  centelhaForm.reset();
  title.textContent = 'Acesso de agenciado';
  description.textContent = 'Consulte o documento recebido para localizar seu registro e sua senha.';
};
let client;
let busy = false;
const failProfile = () => { throw new Error('PROFILE_UNAVAILABLE'); };

async function showRecord(user) {
  const [profile, progress] = await Promise.all([
    client.from('agent_profiles').select('player_name,registry,centelha_position,project_name,role').eq('id',user.id).single(),
    client.from('agent_progress').select('centelha_verified_at').eq('id',user.id).maybeSingle()
  ]);
  const {data,error} = profile;
  if (error || !data || progress.error) failProfile();
  recordUser = user.id;
  isMaster = data.role === 'mestre' && user.app_metadata?.codex_role === 'mestre';
  document.getElementById('record-name').textContent = data.player_name;
  document.getElementById('pass-name').textContent = data.player_name;
  document.getElementById('record-monogram').textContent = data.player_name.slice(0,1).toUpperCase();
  document.getElementById('record-badge').textContent = isMaster ? 'CC / T.E.M.P. / MESTRE' : 'CC / EG / ' + String(data.centelha_position).padStart(2,'0');
  document.getElementById('record-registry').textContent = data.registry;
  document.getElementById('record-project').textContent = data.project_name;
  document.getElementById('record-position').textContent = isMaster ? 'Mestre' : String(data.centelha_position).padStart(2,'0') + ' / 09';
  document.getElementById('record-position-label').textContent = isMaster ? 'Função' : 'Posição na transmissão';
  document.getElementById('record-assignment').textContent = isMaster ? 'Direção / Mediação' : 'Projetos / Campo';
  document.getElementById('staff-overline').textContent = isMaster ? 'Portal do mestre' : 'Portal do agenciado';
  document.getElementById('pass-caption').textContent = isMaster ? 'Credencial de mestre' : 'Credencial de agenciamento';
  form.hidden = true;
  loginLayout.hidden = true;
  document.querySelector('.mobile-jump').hidden = true;
  record.hidden = false;
  title.textContent = 'Registro reconhecido.';
  description.textContent = 'Sua identificação foi conferida. Preserve os documentos de origem.';
  password.value = '';
  password.type = 'password';
  document.getElementById('password-reveal').textContent = 'Mostrar';
  document.getElementById('password-reveal').setAttribute('aria-pressed','false');
  document.getElementById('password-reveal').setAttribute('aria-label','Mostrar senha');
  showTransmission(Boolean(progress.data));
  masterPanel.hidden = !isMaster;
  document.querySelector('.staff-stages').hidden = isMaster;
  if (isMaster) {
    document.getElementById('transmission-panel').hidden = true;
    document.getElementById('centelha-complete').hidden = true;
    document.getElementById('paradox-archive').hidden = true;
    await loadMasterTeam();
  }
  feedback('');
}

async function loadMasterTeam() {
  if (!isMaster || !recordUser) return;
  const currentUser = recordUser;
  masterRefresh.disabled = true;
  masterFeedback.textContent = 'Conferindo os registros da equipe…';
  try {
    const [profiles, progress] = await Promise.all([
      client.from('agent_profiles').select('id,player_name,centelha_position').eq('role','agenciado').order('centelha_position'),
      client.from('agent_progress').select('id,centelha_verified_at')
    ]);
    if (profiles.error || progress.error) throw new Error('TEAM_UNAVAILABLE');
    if (currentUser !== recordUser || !isMaster) return;
    const verified = new Set(progress.data.map(row => row.id));
    const rows = profiles.data.map(profile => {
      const item = document.createElement('li');
      const identity = document.createElement('div');
      const name = document.createElement('strong');name.textContent = profile.player_name;
      const position = document.createElement('small');position.textContent = 'Agenciamento ' + String(profile.centelha_position).padStart(2,'0');
      const status = document.createElement('span');
      status.textContent = verified.has(profile.id) ? 'Transmissão validada' : 'Aguardando transmissão';
      status.className = verified.has(profile.id) ? 'team-status verified' : 'team-status';
      identity.append(name,position);item.append(identity,status);return item;
    });
    masterTeam.replaceChildren(...rows);
    const count = profiles.data.filter(profile => verified.has(profile.id)).length;
    document.getElementById('master-count').textContent = count + ' / ' + profiles.data.length;
    masterFeedback.textContent = 'Registros atualizados. O cofre de documentos permanece em paradoxo.';
  } catch {
    if (currentUser === recordUser) masterFeedback.textContent = 'Não foi possível atualizar a equipe. Tente novamente em instantes.';
  } finally { masterRefresh.disabled = false; }
}

masterRefresh.addEventListener('click',loadMasterTeam);

function showTransmission(verified, reveal = false) {
  document.getElementById('transmission-panel').hidden = verified;
  document.getElementById('centelha-complete').hidden = !verified;
  const archive = document.getElementById('paradox-archive');
  archive.hidden = !verified;
  archive.classList.toggle('just-recovered', reveal);
  document.getElementById('transmission-stage').classList.toggle('stage-complete', verified);
  document.getElementById('transmission-stage').toggleAttribute('aria-current', !verified);
  if (!verified) document.getElementById('transmission-stage').setAttribute('aria-current','step');
  document.getElementById('archive-stage').toggleAttribute('aria-current', verified);
  if (verified) document.getElementById('archive-stage').setAttribute('aria-current','step');
  document.getElementById('transmission-label').textContent = verified ? 'Assinatura reconhecida' : 'Aguardando recomposição';
  document.getElementById('archive-label').textContent = verified ? 'Em paradoxo' : 'Acesso pendente';
  centelhaNotice.hidden = true;
  centelhaInput.value = '';
  if (reveal) {
    document.getElementById('paradox-title').focus({preventScroll:true});
    archive.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  }
}

let verifying = false;
centelhaInput.addEventListener('input',()=>centelhaInput.removeAttribute('aria-invalid'));
centelhaForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if (verifying || !client || !recordUser) return;
  verifying = true;
  const submittingUser = recordUser;
  centelhaSubmit.disabled = true;
  centelhaSubmit.firstChild.textContent = 'Conferindo sinal…';
  centelhaForm.setAttribute('aria-busy','true');
  centelhaNotice.hidden = true;
  try {
    const {data,error} = await client.rpc('verify_centelha',{p_code:centelhaInput.value.normalize('NFKC')});
    if (submittingUser !== recordUser) return;
    if (error) throw error;
    if (data === true) showTransmission(true,true);
    else {
      centelhaNotice.textContent = 'A sequência não corresponde à transmissão. Confira todos os vestígios, a ordem e os sinais preservados.';
      centelhaNotice.hidden = false;
      centelhaInput.setAttribute('aria-invalid','true');
      centelhaInput.focus();
    }
  } catch {
    if (submittingUser !== recordUser) return;
    centelhaNotice.textContent = 'Não foi possível conferir a transmissão. Seu registro está preservado; tente novamente em instantes.';
    centelhaNotice.hidden = false;
  } finally {
    verifying = false;
    centelhaSubmit.disabled = false;
    centelhaSubmit.firstChild.textContent = 'Validar transmissão ';
    centelhaForm.removeAttribute('aria-busy');
  }
});

document.getElementById('password-reveal').addEventListener('click', (event) => {
  const reveal = password.type === 'password';
  password.type = reveal ? 'text' : 'password';
  event.currentTarget.textContent = reveal ? 'Ocultar' : 'Mostrar';
  event.currentTarget.setAttribute('aria-pressed', String(reveal));
  event.currentTarget.setAttribute('aria-label', reveal ? 'Ocultar senha' : 'Mostrar senha');
});
for (const input of [login,password]) input.addEventListener('input', () => input.removeAttribute('aria-invalid'));

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !client) return;
  const registry = normalizeRegistry(login.value);
  if (!registry || !password.value) { feedback('Preencha o registro e a senha.',true); return; }
  if (/\s/.test(password.value)) {
    feedback('A senha deve ser uma sequência contínua, sem espaços ou quebras de linha.',true);
    password.setAttribute('aria-invalid','true');password.focus();return;
  }
  busy = true;submit.disabled = true;submit.firstChild.textContent = 'Conferindo registro…';
  form.setAttribute('aria-busy','true');feedback('Conferindo credenciais…');
  try {
    const email = await registryEmail(registry);
    const token = await passwordToken(password.value);
    const { data, error } = await client.auth.signInWithPassword({email,password:token});
    if (error) throw error;
    if (!data.user) throw new Error('NO_USER');
    await showRecord(data.user);
    document.getElementById('staff-title').focus({preventScroll:true});
  } catch (error) {
    showLogin();
    if (error.status === 429) feedback('Muitas tentativas em pouco tempo. Aguarde um momento antes de conferir novamente.',true);
    else if (error.message === 'PROFILE_UNAVAILABLE') {
      await client.auth.signOut({scope:'local'});
      feedback('O registro não pôde ser carregado. Tente novamente; se persistir, fale com a mediação.',true);
    } else if (error.status === 400 || error.code === 'invalid_credentials' || error.code === 'email_not_confirmed') {
      feedback('Registro ou senha não conferem. Revise a ordem, os nomes recuperados e a escrita indicada no protocolo.',true);
      login.setAttribute('aria-invalid','true');password.setAttribute('aria-invalid','true');
    } else feedback('Não foi possível concluir a conexão. Tente novamente em instantes.',true);
  } finally {
    busy = false;submit.disabled = false;submit.firstChild.textContent = 'Acessar arquivo';form.removeAttribute('aria-busy');
  }
});

logout.addEventListener('click', async () => {
  logout.disabled = true;
  try { await client.auth.signOut({scope:'local'});showLogin();form.reset();feedback('Sessão encerrada.');login.focus(); }
  catch { feedback('Não foi possível encerrar a sessão. Tente novamente.',true); }
  finally { logout.disabled = false; }
});

try {
  if (!config?.url || !config?.publishableKey || !window.supabase) throw new Error('ACCESS_UNAVAILABLE');
  client = window.supabase.createClient(config.url,config.publishableKey,{
    auth:{storage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'codex-agent-session-v1'},
    global:{fetch:(url, options={}) => fetch(url,{...options,signal:options.signal ?? AbortSignal.timeout(15000)})}
  });
  client.auth.onAuthStateChange(event=>{
    if (event === 'SIGNED_OUT') { showLogin();password.value = ''; }
  });
  login.disabled = false;password.disabled = false;
  const {data:{session}} = await client.auth.getSession();
  if (session) {
    feedback('Retomando seu registro…');
    const {data:{user},error} = await client.auth.getUser();
    if (error || !user) { await client.auth.signOut({scope:'local'});showLogin();feedback('Entre novamente para retomar seu registro.'); }
    else {
      try { await showRecord(user); }
      catch { showLogin();feedback('Não foi possível carregar o registro. Entre novamente.',true); }
    }
  }
  submit.disabled = false;
} catch {
  feedback('O acesso está temporariamente indisponível. Tente novamente em instantes.',true);
}
