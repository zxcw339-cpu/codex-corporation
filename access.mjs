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
  form.hidden = false;
  record.hidden = true;
  title.textContent = 'Acesso de agenciado';
  description.textContent = 'Consulte o documento recebido para localizar seu registro e sua senha.';
};
let client;
let busy = false;
const failProfile = () => { throw new Error('PROFILE_UNAVAILABLE'); };

async function showRecord(user) {
  const { data, error } = await client.from('agent_profiles')
    .select('player_name,registry,centelha_position,project_name').eq('id',user.id).single();
  if (error || !data) failProfile();
  document.getElementById('record-name').textContent = data.player_name;
  document.getElementById('record-registry').textContent = data.registry;
  document.getElementById('record-project').textContent = data.project_name;
  document.getElementById('record-position').textContent = String(data.centelha_position).padStart(2,'0') + ' / 09';
  form.hidden = true;
  record.hidden = false;
  title.textContent = 'Registro reconhecido.';
  description.textContent = 'Sua identificação foi conferida. Preserve os documentos de origem.';
  password.value = '';
  feedback('');
}

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
    title.setAttribute('tabindex','-1');title.focus({preventScroll:true});
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
