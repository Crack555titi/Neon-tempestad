// Publica una versión nueva de principio a fin: `npm run release -- 1.3.0 "Qué trae esta versión"`
//  1. comprueba gh, la rama (desarrollo), que no haya cambios sin commitear y que las pruebas pasen
//  2. sube la versión (package.json, js/update.js, version.json) → genera .exe y .apk (borra los anteriores de dist/)
//  3. commit + push de desarrollo → release vX.Y.Z en GitHub con los dos instalables
//  4. por último lleva desarrollo a main: desde ese momento las copias anteriores piden actualizar (obligatorio)
//     El orden importa: si version.json llegara a main antes que la release, los jugadores quedarían bloqueados sin descarga.
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),[ver,notes]=process.argv.slice(2),win=process.platform==='win32';
const fail=m=>{console.error('✗ '+m);process.exit(1)};
if(!/^\d+\.\d+\.\d+$/.test(ver||'')||!notes)fail('Uso: npm run release -- 1.3.0 "Qué trae esta versión"');
const GH=[process.env.GH_PATH,'C:/Program Files/GitHub CLI/gh.exe'].find(f=>f&&fs.existsSync(f))||'gh';
const run=(cmd,args)=>execFileSync(cmd,args,{cwd:root,stdio:'inherit',shell:win&&/^(npm|npx)$/.test(cmd)});  // shell solo para npm/npx (.cmd): con shell, git partiría en palabras los mensajes con espacios
const out=(cmd,args)=>execFileSync(cmd,args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();

// 1. comprobaciones previas: nada se publica si algo no está en orden
try{out(GH,['auth','status'])}catch(e){fail('gh no tiene sesión: ejecuta `gh auth login`.')}
if(out('git',['rev-parse','--abbrev-ref','HEAD'])!=='desarrollo')fail('Publica desde la rama desarrollo.');
if(out('git',['status','--porcelain']))fail('Hay cambios sin commitear: commitea o descártalos antes de publicar.');
run('git',['fetch','-q','origin']);
if(out('git',['rev-list','--count','desarrollo..origin/desarrollo'])!=='0')fail('origin/desarrollo tiene commits que no tienes: haz git pull.');
try{out('git',['merge-base','--is-ancestor','origin/main','desarrollo'])}catch(e){fail('main tiene commits que no están en desarrollo: fusiónalos antes (git merge origin/main).')}
if(out(GH,['release','list','--json','tagName','-q','.[].tagName']).split('\n').includes('v'+ver))fail(`La release v${ver} ya existe.`);
console.log('▶ Pruebas…');run('npm',['test']);

// 2. versión e instalables
run('node',['tools/bump.js',ver,notes]);
run('node',['tools/build-exe.js']);run('node',['tools/build-apk.js']);
const files=[`dist/NeonTempestad-Setup-${ver}.exe`,`dist/NeonTempestad-${ver}.apk`];
for(const f of files)if(!fs.existsSync(path.join(root,f)))fail('No se generó '+f);
// huella del instalador: el juego instalado solo ejecuta una actualización cuyo SHA-256 coincida con esta
const vj=path.join(root,'version.json'),v=JSON.parse(fs.readFileSync(vj,'utf8'));
v.sha256=require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,files[0]))).digest('hex');fs.writeFileSync(vj,JSON.stringify(v,null,2)+'\n');

// 3. commit, push y release
run('git',['add','package.json','js/update.js','version.json']);run('git',['commit','-q','--author=Claude <noreply@anthropic.com>','-m',`Versión ${ver}: ${notes}`]);  // los commits de versión van a nombre de Claude; el resto, al del dueño
run('git',['push','-q','origin','desarrollo']);
run(GH,['release','create','v'+ver,...files,'--target',out('git',['rev-parse','HEAD']),'--title','v'+ver,'--notes',notes,'--latest']);

// 4. main = desarrollo (avance directo, sin forzar): activa el aviso de actualización obligatoria
run('git',['push','-q','origin','desarrollo:main']);
console.log(`✔ v${ver} publicada: https://github.com/Crack555titi/Neon-tempestad/releases/tag/v${ver}\n  Las copias anteriores pedirán actualizar al abrirse (o en menos de 30 min si ya están abiertas).`);
