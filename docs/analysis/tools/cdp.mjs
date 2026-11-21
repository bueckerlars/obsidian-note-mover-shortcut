// usage: node cdp.mjs eval '<js>' | shot <file> [w h]
import fs from 'fs';
const pages = await (await fetch('http://localhost:9222/json')).json();
const ws = new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r);
let id=0; const pend={};
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend[m.id]){pend[m.id](m);delete pend[m.id]}};
const send=(method,params={})=>new Promise(r=>{pend[++id]=r;ws.send(JSON.stringify({id,method,params}))});
const [cmd,a,w,h]=process.argv.slice(2);
if(cmd==='eval'){const r=await send('Runtime.evaluate',{expression:a,awaitPromise:true,returnByValue:true});console.log(JSON.stringify(r.result.result.value??r.result,null,1));}
if(cmd==='shot'){
  if(w) await send('Emulation.setDeviceMetricsOverride',{width:+w,height:+h,deviceScaleFactor:2,mobile:false});
  const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(a,Buffer.from(r.result.data,'base64'));
  if(w) await send('Emulation.clearDeviceMetricsOverride');
}
process.exit(0);
