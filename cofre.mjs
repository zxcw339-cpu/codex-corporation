const config=window.CODEX_ACCESS;
const access=document.getElementById('vault-access');
const workspace=document.getElementById('vault-workspace');
const preview=document.getElementById('vault-preview');
const diagram=document.getElementById('vault-diagram');
const dialog=document.getElementById('secret-dialog');
const advance=document.getElementById('preview-advance');
const reset=document.getElementById('preview-reset');
const names=['01','02','03','04','05','06','A','B','C','final'];
const dependencies={A:['01','02'],B:['03','04'],C:['05','06'],final:['A','B','C']};
const solved=new Set();
let master=false;
let client;
const memory=new Map();
const storage={
 getItem(k){try{return sessionStorage.getItem(k);}catch{return memory.get(k)??null;}},
 setItem(k,v){try{sessionStorage.setItem(k,v);}catch{memory.set(k,v);}},
 removeItem(k){try{sessionStorage.removeItem(k);}catch{memory.delete(k);}}
};
const lock='<svg class="node-state-icon" viewBox="0 0 16 20" aria-hidden="true"><rect x="2" y="8" width="12" height="10" rx="1.5"/><path d="M4.5 8V5a3.5 3.5 0 0 1 7 0v3M8 12v3"/></svg>';
const state=id=>solved.has(id)?'solved':dependencies[id]?(dependencies[id].every(x=>solved.has(x))?'ready':'locked'):'waiting';
const label=id=>id==='final'?'Segredo final':`Segredo ${id}`;

function node(id,intermediate=false){
 const button=document.createElement('button');button.type='button';button.className='vault-node'+(intermediate?' vault-middle':'');button.dataset.secret=id;button.dataset.state=state(id);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',`${label(id)}. Consultar estado.`);
 if(intermediate)button.innerHTML=`<span class="middle-content"><span class="node-index">${id}</span><span><span class="node-title">Segredo menor</span><span class="node-status"></span></span></span>`;
 else button.innerHTML=`<span class="node-top"><span class="node-index">${id}</span>${lock}</span><span class="node-title">Segredo</span><span class="node-status"></span>`;
 return button;
}
for(let i=0;i<3;i++){
 const branch=document.createElement('div');branch.className='vault-branch';
 const pair=document.createElement('div');pair.className='vault-pair';
 pair.append(node(names[i*2]),node(names[i*2+1]));branch.append(pair,node(names[6+i],true));diagram.append(branch);
}

function render(){
 for(const button of document.querySelectorAll('[data-secret]')){
  const id=button.dataset.secret,s=state(id);button.dataset.state=s;
  if(id==='final'){
   document.getElementById('core-caption').textContent=s==='solved'?'Abertura visual concluída.':s==='ready'?'Os três segredos convergiram.':'Aguardando os três segredos menores.';
  }else{
   button.querySelector('.node-status').textContent=s==='solved'?'Resolvido':s==='ready'?'Conexão estabelecida':s==='locked'?'Conexão pendente':'Em paradoxo';
  }
 }
 document.getElementById('vault-resolved').textContent=String(solved.size).padStart(2,'0');
 document.getElementById('vault-state').textContent=solved.has('final')?'Convergência concluída':'Arquivo em paradoxo';
 const current=names.find(id=>!solved.has(id)&&(!dependencies[id]||dependencies[id].every(x=>solved.has(x))));
 advance.disabled=!current;reset.disabled=solved.size===0;
 document.getElementById('preview-live').textContent=solved.size?`${solved.size} de 10 segredos resolvidos nesta prévia.`:'Simulação visual. O progresso da equipe permanece intacto.';
}

function showSecret(id){
 document.getElementById('secret-label').textContent=id==='final'?'Arquivo central':dependencies[id]?'Convergência de dois segredos':'Primeira camada';
 document.getElementById('secret-title').textContent=label(id);
 document.getElementById('secret-copy').textContent=state(id)==='solved'?'A conexão deste segredo foi restabelecida na simulação visual.':master?'Este espaço está reservado para o desafio. O enigma e os documentos serão definidos pela mediação.':'Este segredo permanece em paradoxo. A mediação avisará quando for possível recuperar seu conteúdo.';
 document.getElementById('secret-requires').textContent=dependencies[id]?dependencies[id].map(label).join(' + '):'Nenhum segredo anterior.';
 document.getElementById('secret-state').textContent=state(id)==='solved'?'Resolvido na prévia':state(id)==='ready'?'Conexões estabelecidas':dependencies[id]?'Aguardando conexões':'Em paradoxo';
 dialog.showModal();
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-secret]');if(button&&workspace.hidden===false)showSecret(button.dataset.secret);});
document.getElementById('secret-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
advance.addEventListener('click',()=>{if(!master)return;const id=names.find(id=>!solved.has(id)&&(!dependencies[id]||dependencies[id].every(x=>solved.has(x))));if(id)solved.add(id);render();});
reset.addEventListener('click',()=>{if(!master)return;solved.clear();render();});

function showAccess(title,copy,href,text){
 access.hidden=false;workspace.hidden=true;document.getElementById('vault-access-title').textContent=title;document.getElementById('vault-access-copy').textContent=copy;
 const link=document.getElementById('vault-access-link');link.href=href;link.textContent=text;link.hidden=false;
}
async function initialize(){
 try{
  if(!config?.url||!window.supabase)throw new Error('UNAVAILABLE');
  client=window.supabase.createClient(config.url,config.publishableKey,{auth:{storage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'codex-agent-session-v1'},global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal??AbortSignal.timeout(15000)})}});
  const {data:{session}}=await client.auth.getSession();
  if(!session){showAccess('Identifique seu registro.','Entre com sua credencial da Codex Corporation para consultar o cofre.','agenciados.html?destino=cofre','Acessar com minha credencial');return;}
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user){await client.auth.signOut({scope:'local'});showAccess('Entre novamente.','Sua sessão terminou. Confira seu registro para retomar o acesso.','agenciados.html?destino=cofre','Acessar com minha credencial');return;}
  const [profile,progress]=await Promise.all([client.from('agent_profiles').select('player_name,role').eq('id',user.id).single(),client.from('agent_progress').select('centelha_verified_at').eq('id',user.id).maybeSingle()]);
  if(profile.error||progress.error||!profile.data)throw new Error('PROFILE_UNAVAILABLE');
  master=profile.data.role==='mestre'&&user.app_metadata?.codex_role==='mestre';
  if(!master&&!progress.data){showAccess('A transmissão vem primeiro.','Reúna os vestígios da equipe e valide a sequência no seu agenciamento.','agenciados.html','Voltar ao agenciamento');return;}
  document.getElementById('vault-person').textContent=profile.data.player_name;
  preview.hidden=!master;access.hidden=true;workspace.hidden=false;render();
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){master=false;solved.clear();dialog.close();showAccess('Sessão encerrada.','Entre com sua credencial para retomar o acesso.','agenciados.html?destino=cofre','Acessar com minha credencial');}});
 }catch{showAccess('O registro não pôde ser conferido.','Confira sua conexão e tente abrir o cofre novamente.','cofre.html','Tentar novamente');}
}
initialize();
