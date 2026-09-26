(()=>{'use strict';const $=id=>document.getElementById(id);const cv=window.CVNSSConverter;let cfg={key:'',model:'deepseek/deepseek-r1',tokens:8192,effort:'medium',transport:'proxy'};let history=[],busy=false,controller=null;const system='Bạn là CVNSS Bot. Trả lời cuối cùng bằng tiếng Việt Unicode tự nhiên, chuẩn NFC. Nếu đầu vào là CVNSS4.0, hãy hiểu ý nghĩa rồi trả lời bằng Unicode tiếng Việt. Không đưa nội dung suy luận ẩn vào câu trả lời cuối.';function status(){}function settings(){ $('key').value=cfg.key;$('tokens').value=String(cfg.tokens);$('effort').value=cfg.effort;$('transport').value=cfg.transport;$('settings').showModal();}function bubble(role){const div=document.createElement('article');div.className='bubble '+role;const box=$('messages');box.appendChild(div);box.scrollTop=box.scrollHeight;return div;}function scroll(){$('messages').scrollTop=$('messages').scrollHeight;}function reasonOf(j){const d=j.choices?.[0]?.delta||{};if(typeof d.reasoning==='string')return d.reasoning;if(typeof d.reasoning_content==='string')return d.reasoning_content;if(Array.isArray(d.reasoning_details))return d.reasoning_details.map(x=>x?.text||x?.content||'').join('');return '';}function frame(text,onEvent){const data=text.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');if(!data||data==='[DONE]')return;let j;try{j=JSON.parse(data);}catch{return;}onEvent(j);}function setBusy(yes){busy=yes;$('send').hidden=yes;$('stop').hidden=!yes;$('prompt').disabled=yes;}
/* Safe, batched Markdown presentation: DOM nodes, never innerHTML from model output. */
const renderQueue=new Map();let renderPending=false;
function inline(parent,value){
 const parts=value.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);
 for(const part of parts){if(!part)continue;let node;
 if(part.startsWith('**')&&part.endsWith('**')&&part.length>4){node=document.createElement('strong');node.textContent=part.slice(2,-2);}
 else if(part.startsWith('*')&&part.endsWith('*')&&part.length>2){node=document.createElement('em');node.textContent=part.slice(1,-1);}
 else if(part.startsWith('`')&&part.endsWith('`')&&part.length>2){node=document.createElement('code');node.textContent=part.slice(1,-1);}
 else node=document.createTextNode(part);
 parent.append(node);}
}
function renderMarkdown(target,raw){
 const text=raw.normalize('NFC').replace(/\r\n?/g,'\n');
 const root=document.createDocumentFragment();let list=null,code=null,paragraph=null;
 for(const line of text.split('\n')){
  if(/^\s*`{3}/.test(line)){if(code){code=null;}else{list=null;paragraph=null;const pre=document.createElement('pre');pre.className='answer-code';code=document.createElement('code');pre.append(code);root.append(pre);}continue;}
  if(code){code.textContent+=(code.textContent?'\n':'')+line;continue;}
  if(!line.trim()){list=null;paragraph=null;continue;}
  const heading=line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
  if(heading){list=null;paragraph=null;const h=document.createElement('h'+Math.min(heading[1].length+1,6));h.className='answer-heading';inline(h,heading[2]);root.append(h);continue;}
  if(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)){list=null;paragraph=null;root.append(document.createElement('hr'));continue;}
  const bullet=line.match(/^\s*[-*+]\s+(.+)$/),number=line.match(/^\s*\d+[.)]\s+(.+)$/);
  if(bullet||number){paragraph=null;const kind=number?'ol':'ul';if(!list||list.tagName.toLowerCase()!==kind){list=document.createElement(kind);root.append(list);}const li=document.createElement('li');inline(li,(bullet||number)[1]);list.append(li);continue;}
  list=null;if(!paragraph){paragraph=document.createElement('p');root.append(paragraph);}else paragraph.append(document.createElement('br'));
  inline(paragraph,line);
 }
 target.replaceChildren(root);
}
function queueAnswer(target,value){renderQueue.set(target,value);if(renderPending)return;renderPending=true;requestAnimationFrame(()=>{renderPending=false;for(const [element,content] of renderQueue)renderMarkdown(element,content);renderQueue.clear();});}
async function send(e){
 e.preventDefault();if(busy)return;
 if(!cfg.key){settings();return;}
 if(!cv){alert('Không tải được bộ chuyển đổi CVNSS4.0.');return;}
 const input=$('prompt').value.trim();if(!input)return;
 if(history.length>=32){alert('Hội thoại dài. Hãy tạo hội thoại mới.');return;}
 bubble('user').textContent=input;$('prompt').value='';
 history.push({role:'user',content:input});
 const outer=bubble('assistant');
 const thinking=document.createElement('details');thinking.className='reason';thinking.open=true;
 const heading=document.createElement('summary');heading.textContent='Bot đang suy nghĩ';
 const reasoningText=document.createElement('pre');reasoningText.textContent='Đang kết nối…';
 thinking.append(heading,reasoningText);
 const answer=document.createElement('div');answer.textContent='Đang chuẩn bị câu trả lời…';
 outer.append(thinking,answer);
 controller=new AbortController();setBusy(true);
 let reply='',rawReason='',lastReasonRender=0,finishReason='',fallbackUsed=false;
 const messages=[{role:'system',content:system},...history];
 async function attempt(tokenBudget,reasoningEnabled){
  const direct=cfg.transport==='direct';
  const payload={model:cfg.model,messages,max_tokens:tokenBudget,effort:cfg.effort,reasoning_enabled:reasoningEnabled};
  const endpoint=direct?'https://openrouter.ai/api/v1/chat/completions':'/api/chat';
  const directPayload={model:cfg.model,messages,stream:true,max_tokens:tokenBudget,
   reasoning:reasoningEnabled?{max_tokens:Math.min(cfg.effort==='low'?900:cfg.effort==='high'?3000:1700,Math.floor(tokenBudget*.3)),exclude:false}:{enabled:false}};
  const res=await fetch(endpoint,{method:'POST',
   headers:direct?{'Content-Type':'application/json','Authorization':'Bearer '+cfg.key,'HTTP-Referer':location.origin,'X-Title':'CVNSS Bot'}:
    {'Content-Type':'application/json','X-OpenRouter-Key':cfg.key},
   body:JSON.stringify(direct?directPayload:payload),signal:controller.signal});
  if(!res.ok){let data;try{data=await res.json();}catch{}throw Error(data?.error?.message||data?.error||'API HTTP '+res.status);}
  if(!res.body)throw Error('OpenRouter không cung cấp dữ liệu trực tuyến.');
  const reader=res.body.getReader(),decoder=new TextDecoder();let pending='',doneMarker=false;
  const process=packet=>{
   const data=packet.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim()).join('\n');
   if(!data)return;if(data==='[DONE]'){doneMarker=true;return;}
   let j;try{j=JSON.parse(data);}catch{return;}
   if(j.error)throw Error(j.error.message||'Lỗi từ OpenRouter.');
   const choice=j.choices?.[0],d=choice?.delta||{};
   if(choice?.finish_reason)finishReason=choice.finish_reason;
   if(typeof d.content==='string'&&d.content){reply+=d.content;queueAnswer(answer,reply);}
   const reason=reasonOf(j);
   if(reason){rawReason+=reason;
    const now=performance.now();
    if(now-lastReasonRender>320){lastReasonRender=now;reasoningText.textContent=cv.fromCqn(rawReason).cvss;}
   }
   scroll();
  };
  for(;;){
   const {done,value}=await reader.read();
   pending+=decoder.decode(value||new Uint8Array(),{stream:!done});
   const frames=pending.split(/\r?\n\r?\n/);pending=frames.pop()||'';
   for(const part of frames)process(part);
   if(done||doneMarker)break;
  }
  if(pending.trim())process(pending);
 }
 try{
  await attempt(cfg.tokens,true);
  if(!reply.trim()&&!controller.signal.aborted){
   fallbackUsed=true;thinking.open=false;
   answer.textContent='Đang tạo câu trả lời tiếng Việt…';
   await attempt(12288,false);
  }
  if(rawReason)reasoningText.textContent=cv.fromCqn(rawReason).cvss;
  else{reasoningText.textContent='Không có nội dung suy luận được mô hình cung cấp.';thinking.open=false;}
  if(reply.trim()){
   queueAnswer(answer,reply.normalize('NFC'));history.push({role:'assistant',content:reply.normalize('NFC')});
  }else{
   answer.textContent='Mô hình chưa tạo được câu trả lời tiếng Việt'+(finishReason==='length'?' vì đã dùng hết giới hạn token.':'.')+' Hãy chọn Nhanh trong Cài đặt hoặc thử lại.';
   history.pop();
  }
 }catch(err){
  if(err.name==='AbortError'){
   if(reply){queueAnswer(answer,reply);history.push({role:'assistant',content:reply});}
   else{answer.textContent='Đã dừng.';history.pop();}
  }else{
   answer.textContent='⚠ '+err.message+(fallbackUsed?' (Đã thử tạo lại câu trả lời.)':'');
   if(reply)history.push({role:'assistant',content:reply});else history.pop();
  }
 }finally{
  controller=null;setBusy(false);$('prompt').focus();scroll();
 }
}
$('chatForm').addEventListener('submit',send);$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chatForm').requestSubmit();}});$('openSettings').onclick=settings;$('cancelSettings').onclick=()=>$('settings').close();$('settingsForm').addEventListener('submit',e=>{e.preventDefault();const key=$('key').value.trim();if(!/^sk-or-[\w-]{10,}$/.test(key)){alert('API Key không hợp lệ.');return;}cfg={...cfg,key,tokens:Number($('tokens').value),effort:$('effort').value,transport:$('transport').value};$('settings').close();status();});$('reset').onclick=()=>{history=[];$('messages').replaceChildren();};$('stop').onclick=()=>controller?.abort();$('probe').onclick=async()=>{const el=$('probeResult');el.textContent='Đang kiểm tra…';try{const r=await fetch('/api/chat?probe=1',{signal:AbortSignal.timeout(8500),cache:'no-store'});const j=await r.json();el.textContent=j.openrouter==='reachable'?'✓ Cloudflare kết nối được OpenRouter.':'⚠ Cloudflare chưa kết nối được OpenRouter: '+(j.error||j.upstream_status||'không xác định')+'. Có thể thử Trực tiếp.';}catch(e){el.textContent='⚠ Không gọi được API kiểm tra: '+e.message;}};status();})();