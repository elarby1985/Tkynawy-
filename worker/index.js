const enc = new TextEncoder();
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const fail=(message,status=400)=>send({error:message},status);
const now=()=>Math.floor(Date.now()/1000);
const rand=()=>crypto.randomUUID();
const hex=(bytes)=>Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
async function sha(input){return hex(await crypto.subtle.digest('SHA-256',enc.encode(input)))}
async function derive(password,salt,iterations=160000){
 const k=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations,hash:'SHA-256'},k,256));
}
function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
function cookie(request){return (request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('tyk_session='))?.slice(12)||''}
async function auth(req,env){const token=cookie(req);if(!/^[a-f0-9-]{36}$/.test(token))return null;
 const hash=await sha(token);return await env.DB.prepare('SELECT u.id,u.email,u.name,u.expires_at,u.disabled,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.expires_at>? AND u.disabled=0').bind(hash,now(),now()).first();}
async function body(req){const n=Number(req.headers.get('content-length')||0);if(n>4096)throw Error('Request too large');const data=await req.json();if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid request');return data}
function cookieHeader(token,maxAge){return `tyk_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`}
function publicQuestion(row,position,total){return {id:row.id,domain:row.domain,title:row.title,question:row.question,options:JSON.parse(row.options),position,total}}
async function current(env,attempt){
 if(attempt.position>=attempt.total)return send({done:true,score:attempt.correct,total:attempt.total});
 const row=await env.DB.prepare('SELECT q.id,q.domain,q.title,q.question,q.options FROM attempt_questions aq JOIN questions q ON q.id=aq.question_id WHERE aq.attempt_id=? AND aq.position=?').bind(attempt.id,attempt.position).first();
 if(!row)return fail('Question unavailable',500);
 return send({attemptId:attempt.id,question:publicQuestion(row,attempt.position+1,attempt.total),expiresAt:attempt.expires_at});
}
async function route(req,env){
 const path=new URL(req.url).pathname;
 if(req.method==='OPTIONS')return fail('Not allowed',405);
 if(!['GET','POST'].includes(req.method))return fail('Method not allowed',405);
 if(req.method==='POST'){
  const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)return fail('Invalid origin',403);
  if(!(req.headers.get('content-type')||'').includes('application/json'))return fail('JSON required',415);
 }
 if(path.startsWith('/api/admin/')){
  if(req.method!=='POST')return fail('POST required',405);
  if(!env.ADMIN_API_KEY||!safeEqual(req.headers.get('authorization')||'',`Bearer ${env.ADMIN_API_KEY}`))return fail('Unauthorized',401);
  const data=await body(req);
  if(path==='/api/admin/grant'){
   const email=String(data.email||'').trim().toLowerCase(),name=String(data.name||'').trim(),password=String(data.password||''),days=Number(data.days??30);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>120||password.length<12||password.length>128||!Number.isInteger(days)||days<1||days>365)return fail('Supply valid email, name, password (12-128 characters) and access days (1-365)');
   const salt=rand(),passhash=await derive(password,salt),expires=now()+days*86400;
   const existing=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
   if(existing){await env.DB.batch([env.DB.prepare('UPDATE users SET name=?,salt=?,passhash=?,iterations=160000,expires_at=?,disabled=0 WHERE id=?').bind(name,salt,passhash,expires,existing.id),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(existing.id)]);}
   else await env.DB.prepare('INSERT INTO users(id,email,name,salt,passhash,iterations,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(rand(),email,name,salt,passhash,160000,expires,now()).run();
   return send({ok:true,email,expiresAt:expires});
  }
  if(path==='/api/admin/revoke'){
   const email=String(data.email||'').trim().toLowerCase();await env.DB.batch([env.DB.prepare('UPDATE users SET disabled=1 WHERE email=?').bind(email),env.DB.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email=?)').bind(email)]);return send({ok:true});
  }
  return fail('Not found',404);
 }
 if(path==='/api/login'&&req.method==='POST'){
  const data=await body(req),email=String(data.email||'').trim().toLowerCase(),password=String(data.password||'');
  if(email.length>254||password.length>128||!email||!password)return fail('Invalid credentials',401);
  const throttle=await env.DB.prepare('SELECT failures,blocked_until FROM login_throttle WHERE email=?').bind(email).first();
  if(throttle&&throttle.blocked_until>now())return fail('Too many attempts. Try again later.',429);
  const user=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
  const salt=user?.salt||'invalid-account-salt',iterations=user?.iterations||160000;
  const hash=await derive(password,salt,iterations);
  if(!user||!safeEqual(hash,user.passhash)||user.disabled||user.expires_at<=now()){
   const fails=(throttle?.failures||0)+1,blocked=fails>=5?now()+900:0;
   await env.DB.prepare('INSERT INTO login_throttle(email,failures,blocked_until) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until').bind(email,fails,blocked).run();
   return fail('Invalid credentials or inactive access',401);
  }
  await env.DB.prepare('DELETE FROM login_throttle WHERE email=?').bind(email).run();
  const token=rand(),lifetime=Math.min(86400*7,user.expires_at-now());
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await sha(token),user.id,now()+lifetime).run();
  const res=send({ok:true,name:user.name,email:user.email,expiresAt:user.expires_at});res.headers.set('set-cookie',cookieHeader(token,lifetime));return res;
 }
 if(path==='/api/logout'&&req.method==='POST'){
  const token=cookie(req);if(token)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(token)).run();
  const res=send({ok:true});res.headers.set('set-cookie',cookieHeader('',0));return res;
 }
 const user=await auth(req,env);if(!user)return fail('Please sign in with an active premium account',401);
 if(path==='/api/me'&&req.method==='GET')return send({name:user.name,email:user.email,expiresAt:user.expires_at});
 if(path==='/api/exam/start'&&req.method==='POST'){
  const rows=(await env.DB.prepare('SELECT id FROM questions ORDER BY RANDOM() LIMIT 100').all()).results;
  if(rows.length!==100)return fail('The question bank is incomplete',503);
  const id=rand(),started=now(),deadline=started+10800;
  const inserts=[env.DB.prepare('INSERT INTO attempts(id,user_id,started_at,expires_at,total) VALUES(?,?,?,?,?)').bind(id,user.id,started,deadline,rows.length),...rows.map((q,i)=>env.DB.prepare('INSERT INTO attempt_questions(attempt_id,position,question_id) VALUES(?,?,?)').bind(id,i,q.id))];
  await env.DB.batch(inserts);
  return current(env,{id,position:0,total:rows.length,correct:0,expires_at:deadline});
 }
 if(path==='/api/exam/current'&&req.method==='GET'){
  const attempt=await env.DB.prepare('SELECT * FROM attempts WHERE user_id=? AND completed_at IS NULL ORDER BY started_at DESC LIMIT 1').bind(user.id).first();
  if(!attempt){const last=await env.DB.prepare('SELECT correct,total FROM attempts WHERE user_id=? AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1').bind(user.id).first();return last?send({done:true,score:last.correct,total:last.total}):send({noActiveExam:true});}
  if(attempt.expires_at<=now())return send({expired:true,score:attempt.correct,total:attempt.total});
  return current(env,attempt);
 }
 if(path==='/api/exam/answer'&&req.method==='POST'){
  const data=await body(req),answer=String(data.answer||'').toUpperCase();if(!['A','B','C','D'].includes(answer))return fail('Choose A, B, C or D');
  const attempt=await env.DB.prepare('SELECT * FROM attempts WHERE id=? AND user_id=?').bind(String(data.attemptId||''),user.id).first();
  if(!attempt||attempt.completed_at||attempt.expires_at<=now())return fail('Exam is unavailable or expired',409);
  const row=await env.DB.prepare('SELECT aq.question_id,aq.selected,q.answer,q.explanation FROM attempt_questions aq JOIN questions q ON q.id=aq.question_id WHERE aq.attempt_id=? AND aq.position=?').bind(attempt.id,attempt.position).first();
  if(!row||row.selected!==null)return fail('Question already answered',409);
  const correct=answer===row.answer?1:0;
  const result=await env.DB.prepare('UPDATE attempt_questions SET selected=?,correct=? WHERE attempt_id=? AND position=? AND selected IS NULL').bind(answer,correct,attempt.id,attempt.position).run();
  if(result.meta.changes!==1)return fail('Question already answered',409);
  const done=attempt.position+1>=attempt.total;
  await env.DB.prepare('UPDATE attempts SET position=position+1,correct=correct+?,completed_at=CASE WHEN ? THEN ? ELSE completed_at END WHERE id=?').bind(correct,done?1:0,now(),attempt.id).run();
  return send({correct:!!correct,answer:row.answer,explanation:row.explanation,done,score:attempt.correct+correct,total:attempt.total});
 }
 return fail('Not found',404);
}
export default {async fetch(req,env){
 const path=new URL(req.url).pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
 try{return await route(req,env)}catch(e){console.error('API failure',e);return fail('Request could not be completed',500)}
}};
