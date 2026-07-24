/*
 Simple Web Push server for Racha app
 - Endpoints:
   GET  /vapidPublicKey         -> returns VAPID public key (string)
   POST /subscribe             -> body: { user, subscription, remindHour }  (stores subscription)
   POST /unsubscribe           -> body: { user, endpoint }  (removes subscription)
   POST /sendTest              -> body: { user }  (sends immediate test push)

 - A cron job runs daily at REMIND_HOUR (env) and sends a push to all saved subscriptions.
 - Subscriptions are stored in server/subscriptions.json (simple file storage for demo).

 NOTES:
 - Generate VAPID keys with `npm run gen-keys` (or provide VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars).
 - Deploy this server to a public HTTPS host (Render, Railway, Fly, Heroku). Then set the SERVER_URL in the client to the deployed URL.
*/

const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const SUBS_FILE = path.join(__dirname, 'subscriptions.json');
function loadSubs(){
  try{ const raw = fs.readFileSync(SUBS_FILE,'utf8'); return JSON.parse(raw); }catch(e){ return {}; }
}
function saveSubs(obj){ fs.writeFileSync(SUBS_FILE, JSON.stringify(obj, null, 2)); }

// VAPID keys: prefer env, otherwise exit with instructions
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || null;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || null;

if(!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY){
  console.warn('WARNING: VAPID keys not set. Run `npm run gen-keys` and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env vars before deploying.');
}

if(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY){
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const app = express();
app.use(bodyParser.json());
app.use(function(req,res,next){ // CORS simple
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/vapidPublicKey', (req,res)=>{
  if(!VAPID_PUBLIC_KEY) return res.status(500).json({error:'VAPID keys not configured on server'});
  res.json({publicKey: VAPID_PUBLIC_KEY});
});

// store subscriptions keyed by user => array of subs
app.post('/subscribe', (req,res)=>{
  const { user, subscription, remindHour } = req.body || {};
  if(!user || !subscription || !subscription.endpoint) return res.status(400).json({ error: 'user and subscription required' });
  const subs = loadSubs();
  subs[user] = subs[user] || [];
  // avoid duplicate endpoints
  const exists = subs[user].find(s => s.subscription && s.subscription.endpoint === subscription.endpoint);
  if(!exists){ subs[user].push({ subscription, remindHour: remindHour || null, createdAt: new Date().toISOString() }); }
  saveSubs(subs);
  res.json({ ok: true });
});

app.post('/unsubscribe', (req,res) =>{
  const { user, endpoint } = req.body || {};
  if(!user || !endpoint) return res.status(400).json({ error: 'user and endpoint required' });
  const subs = loadSubs();
  if(!subs[user]) return res.json({ ok: true });
  subs[user] = subs[user].filter(s => !(s.subscription && s.subscription.endpoint === endpoint));
  saveSubs(subs);
  res.json({ ok: true });
});

app.post('/sendTest', async (req,res)=>{
  const { user, title, body } = req.body || {};
  const subs = loadSubs();
  if(!user) return res.status(400).json({ error: 'user required' });
  if(!subs[user] || subs[user].length===0) return res.status(404).json({ error: 'no subscriptions for user' });
  const payload = JSON.stringify({ title: title || 'Recordatorio de racha', body: body || 'No olvides mantener tu racha hoy!' });
  try{
    await Promise.all(subs[user].map(s => webpush.sendNotification(s.subscription, payload).catch(e=>{ console.error('send error', e); })));
    res.json({ ok:true });
  }catch(e){ console.error(e); res.status(500).json({ error: 'send failed' }) }
});

// Cron: daily at REMIND_HOUR
const REMIND_HOUR = process.env.REMIND_HOUR || '20'; // 24h hour string
// schedule at REMIND_HOUR:00 every day
cron.schedule(`0 ${REMIND_HOUR} * * *`, async () => {
  console.log('Running daily reminder cron at hour', REMIND_HOUR);
  const subs = loadSubs();
  const payload = JSON.stringify({ title: 'Racha diaria', body: '¡No olvides marcar tu racha hoy!' });
  for(const user of Object.keys(subs)){
    for(const s of subs[user]){
      try{
        await webpush.sendNotification(s.subscription, payload);
      }catch(e){ console.error('error sending to', user, e.message || e); }
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('WebPush server listening on', PORT));
