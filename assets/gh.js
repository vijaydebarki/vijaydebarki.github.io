/* ====================================================================
   gh.js — save Markdown files to GitHub from the browser
   Token is stored only in this browser (localStorage).
   ==================================================================== */
(function(){
const KEY='GH_CFG';
const encPath=p=>p.split('/').map(encodeURIComponent).join('/');
const GH={
  cfg(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}},
  save(c){localStorage.setItem(KEY,JSON.stringify(c))},
  clear(){localStorage.removeItem(KEY)},
  ready(){const c=this.cfg();return !!(c.token&&c.owner)},
  siteRepo(){const c=this.cfg();return c.siteRepo||(c.owner?c.owner+'.github.io':'')},
  vaultRepo(){return this.cfg().vaultRepo||'soc-vault'},
  async api(method,path,body){
    const c=this.cfg();
    const r=await fetch('https://api.github.com'+path,{method,cache:'no-store',
      headers:Object.assign({'Accept':'application/vnd.github+json','Authorization':'Bearer '+c.token,'X-GitHub-Api-Version':'2022-11-28'},body?{'Content-Type':'application/json'}:{}),
      body:body?JSON.stringify(body):undefined});
    if(r.status===404)return null;
    if(!r.ok){let m='';try{m=(await r.json()).message}catch(e){}const err=new Error(GH.explain(r.status,m));err.status=r.status;throw err}
    return r.status===204?{}:r.json();
  },
  explain(s,m){
    if(s===401)return 'GitHub token is invalid or expired — update it in GitHub settings.';
    if(s===403)return 'GitHub token lacks permission (needs Contents: Read and write on this repo). '+(m||'');
    if(s===409||s===422)return 'File changed on GitHub since last sync — pull first, then save again.';
    return 'GitHub error '+s+(m?': '+m:'');
  },
  enc(s){return btoa(unescape(encodeURIComponent(s)))},
  dec(b){return decodeURIComponent(escape(atob((b||'').replace(/\s/g,''))))},
  async repoInfo(repo){const c=this.cfg();return this.api('GET','/repos/'+c.owner+'/'+repo)},
  async canWrite(repo){const j=await this.repoInfo(repo);return !!(j&&j.permissions&&(j.permissions.push||j.permissions.admin))},
  async list(repo,dir){const c=this.cfg();const j=await this.api('GET','/repos/'+c.owner+'/'+repo+'/contents/'+encPath(dir));return Array.isArray(j)?j:[]},
  async get(repo,path){const c=this.cfg();const j=await this.api('GET','/repos/'+c.owner+'/'+repo+'/contents/'+encPath(path));if(!j||Array.isArray(j))return null;
    if(!j.content&&j.download_url){const t=await (await fetch(j.download_url,{cache:'no-store'})).text();return {sha:j.sha,text:t}}
    return {sha:j.sha,text:this.dec(j.content)}},
  async sha(repo,path){try{const g=await this.get(repo,path);return g?g.sha:undefined}catch(e){return undefined}},
  async putRaw(repo,path,b64,sha,message){const c=this.cfg();
    const body={message:message||('Update '+path),content:b64};if(sha)body.sha=sha;
    try{const j=await this.api('PUT','/repos/'+c.owner+'/'+repo+'/contents/'+encPath(path),body);return j.content.sha}
    catch(e){if((e.status===409||e.status===422)){const fresh=await this.sha(repo,path);if(fresh!==sha){if(fresh)body.sha=fresh;else delete body.sha;const j=await this.api('PUT','/repos/'+c.owner+'/'+repo+'/contents/'+encPath(path),body);return j.content.sha}}throw e}},
  async put(repo,path,text,sha,message){return this.putRaw(repo,path,this.enc(text),sha,message)},
  async del(repo,path,sha,message){const c=this.cfg();if(!sha)sha=await this.sha(repo,path);if(!sha)return;
    await this.api('DELETE','/repos/'+c.owner+'/'+repo+'/contents/'+encPath(path),{message:message||('Delete '+path),sha})},

  /* front matter */
  fm:{
    parse(text){const m=/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text||'');if(!m)return {meta:{},body:text||''};
      const meta={};m[1].split(/\r?\n/).forEach(l=>{const i=l.indexOf(':');if(i<1)return;const k=l.slice(0,i).trim();let v=l.slice(i+1).trim();
        try{if(/^["[]/.test(v))v=JSON.parse(v);else if(v==='true'||v==='false')v=v==='true'}catch(e){v=v.replace(/^"|"$/g,'')}
        if(typeof v==='string'&&/^\[.*\]$/.test(v))v=v.slice(1,-1).split(',').map(s=>s.trim().replace(/^["']|["']$/g,'')).filter(Boolean);
        meta[k]=v});
      return {meta,body:m[2].replace(/^\r?\n/,'')}},
    build(meta,body){const lines=Object.entries(meta).filter(([k,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>k+': '+(typeof v==='boolean'?v:JSON.stringify(v)));
      return '---\n'+lines.join('\n')+'\n---\n\n'+(body||'').replace(/\s+$/,'')+'\n'}
  },
  slug(s){return (s||'untitled').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'untitled'},

  /* settings dialog */
  openSettings(opts){opts=opts||{};return new Promise(resolve=>{
    const c=this.cfg();const wrap=document.createElement('div');
    wrap.innerHTML='<div style="position:fixed;inset:0;z-index:90;background:#02060cd0;backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px;overflow:auto">'+
     '<div style="width:100%;max-width:480px;background:#111b2a;border:1px solid #9fef00;border-radius:14px;padding:22px;color:#e6edf6;font:14px/1.5 system-ui,sans-serif;box-shadow:0 0 30px #9fef0026">'+
     '<div style="font:600 11px ui-monospace,Consolas,monospace;color:#9fef00;letter-spacing:2px">// GITHUB STORAGE</div>'+
     '<h3 style="margin:6px 0 6px;font:700 22px Rajdhani,system-ui,sans-serif">Connect GitHub</h3>'+
     '<p style="margin:0 0 14px;color:#8391a7;font-size:13px">'+(opts.intro||'Files are saved as Markdown in your repositories. The token is stored only in this browser.')+'</p>'+
     ['owner|GitHub username|e.g. vijaydebarki','siteRepo|Website repository (public)|e.g. vijaydebarki.github.io','vaultRepo|Vault repository (private)|e.g. soc-vault','token|Fine-grained access token|github_pat_…'].map(f=>{const [k,l,ph]=f.split('|');
      return '<label style="display:block;margin-bottom:10px"><span style="display:block;font:600 10px ui-monospace,Consolas,monospace;letter-spacing:1.2px;color:#8391a7;text-transform:uppercase;margin-bottom:4px">'+l+'</span><input data-k="'+k+'" '+(k==='token'?'type="password" autocomplete="off"':'')+' placeholder="'+ph+'" style="width:100%;background:#0b1320;color:#e6edf6;border:1px solid #1e2c42;border-radius:7px;padding:9px 10px;font:13px ui-monospace,Consolas,monospace"></label>'}).join('')+
     '<div data-msg style="font:12px ui-monospace,Consolas,monospace;min-height:1.2em;margin:4px 0 10px"></div>'+
     '<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap"><button data-a="disc" style="background:none;border:0;color:#ff3e5b;font:12px ui-monospace,Consolas,monospace;cursor:pointer;padding:0">'+(c.token?'Disconnect':'')+'</button><span style="display:flex;gap:8px"><button data-a="x" style="border:1px solid #1e2c42;background:#16233a;color:#e6edf6;padding:8px 14px;border-radius:8px;font:600 14px Rajdhani,system-ui;cursor:pointer">Cancel</button><button data-a="ok" style="border:1px solid #9fef00;background:#9fef00;color:#0a111c;padding:8px 14px;border-radius:8px;font:600 14px Rajdhani,system-ui;cursor:pointer">Test & save</button></span></div>'+
     '</div></div>';
    document.body.appendChild(wrap);
    const inp=k=>wrap.querySelector('[data-k="'+k+'"]'),msg=wrap.querySelector('[data-msg]');
    inp('owner').value=c.owner||opts.owner||'';inp('siteRepo').value=c.siteRepo||opts.siteRepo||'';inp('vaultRepo').value=c.vaultRepo||'soc-vault';inp('token').value=c.token||'';
    const close=v=>{wrap.remove();resolve(v)};
    wrap.querySelector('[data-a="x"]').onclick=()=>close(false);
    wrap.querySelector('[data-a="disc"]').onclick=()=>{if(!c.token)return;GH.clear();close('disconnected')};
    wrap.querySelector('[data-a="ok"]').onclick=async()=>{
      const n={owner:inp('owner').value.trim(),siteRepo:inp('siteRepo').value.trim()||(inp('owner').value.trim()+'.github.io'),vaultRepo:inp('vaultRepo').value.trim()||'soc-vault',token:inp('token').value.trim()};
      if(!n.owner||!n.token){msg.style.color='#ff3e5b';msg.textContent='Username and token are required.';return}
      const old=GH.cfg();GH.save(n);msg.style.color='#00e5ff';msg.textContent='Testing access…';
      try{
        const need=opts.need||['vaultRepo'];const bad=[];
        for(const k of need){const repo=n[k];const ok=await GH.canWrite(repo).catch(()=>false);if(!ok)bad.push(repo)}
        if(bad.length){GH.save(old);if(!old.token)GH.clear();msg.style.color='#ff3e5b';msg.textContent='No write access to: '+bad.join(', ')+'. Check the repo name exists and the token includes it with Contents: Read and write.';return}
        close(true);
      }catch(e){GH.save(old);if(!old.token)GH.clear();msg.style.color='#ff3e5b';msg.textContent=e.message}
    };
  })}
};
window.GH=GH;
})();
