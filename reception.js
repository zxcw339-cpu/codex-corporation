(() => {
  if(new URLSearchParams(location.search).get('origem')!=='matriz-09')return;
  const notice=document.createElement('aside');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  notice.style.cssText='position:fixed;z-index:1000;left:50%;bottom:20px;transform:translateX(-50%);width:min(500px,calc(100% - 32px));padding:19px 48px 19px 22px;border:1px solid #87bfa9;border-radius:8px;background:#14281ff5;color:#e7f4ed;box-shadow:0 15px 50px #0005;font:14px/1.5 Manrope,Arial,sans-serif;box-sizing:border-box';
  const title=document.createElement('strong');title.textContent='Transmissão recebida.';title.style.display='block';
  const text=document.createElement('span');text.textContent='Matriz da Centelha reconhecida. Bem-vindos à Codex Corporation.';
  const close=document.createElement('button');close.type='button';close.setAttribute('aria-label','Fechar confirmação');close.textContent='×';close.style.cssText='position:absolute;right:6px;top:6px;width:38px;height:38px;background:none;border:0;color:#e7f4ed;font-size:24px;cursor:pointer';close.addEventListener('click',()=>notice.remove());
  notice.append(title,text,close);document.body.append(notice);
})();
