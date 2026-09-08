import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import './build.mjs';

const root=path.resolve(import.meta.dirname,'../dist');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json'};
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const decoded=decodeURIComponent(url.pathname);
    const relative=decoded.replace(/^\/+/, '');
    let file=path.resolve(root,relative);
    if(file!==root && !file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    let stat=await fs.stat(file);
    if(stat.isDirectory()){
      if(!url.pathname.endsWith('/')){res.writeHead(301,{Location:url.pathname+'/'+url.search});res.end();return;}
      file=path.join(file,'index.html');
    }
    const body=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:body);
  } catch {
    res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
    res.end(await fs.readFile(path.join(root,'404.html')));
  }
}).listen(port,'0.0.0.0',()=>console.log(`URBAN RIDER TOKYO → http://localhost:${port}`));
