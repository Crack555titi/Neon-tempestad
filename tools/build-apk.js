// Genera el APK firmado de Android: `npm run apk` → dist/NeonTempestad-<versión>.apk
// Necesita JDK 21 y el SDK de Android: los toma de JAVA_HOME / ANDROID_HOME, o de %LOCALAPPDATA%\neon-android (portátil).
// Firma con la clave de ~/.neon-tempestad/ (se crea la primera vez). Guarda una copia de esa carpeta: sin la MISMA clave,
// los jugadores no podrán instalar las actualizaciones encima de la versión anterior.
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const root=path.join(__dirname,'..'),ver=require('../package.json').version,win=process.platform==='win32';
const local=path.join(process.env.LOCALAPPDATA||os.homedir(),'neon-android');
const firstDir=d=>fs.existsSync(d)?fs.readdirSync(d).map(f=>path.join(d,f)).find(f=>fs.statSync(f).isDirectory()):null;
const JAVA=process.env.JAVA_HOME||firstDir(path.join(local,'jdk')),SDK=process.env.ANDROID_HOME||path.join(local,'sdk');
if(!JAVA||!fs.existsSync(path.join(JAVA,'bin')))throw new Error('Falta el JDK 21: define JAVA_HOME o instala Android Studio.');
if(!fs.existsSync(path.join(SDK,'platforms')))throw new Error('Falta el SDK de Android: define ANDROID_HOME o instala Android Studio.');
const env={...process.env,JAVA_HOME:JAVA,ANDROID_HOME:SDK,ANDROID_SDK_ROOT:SDK,PATH:path.join(JAVA,'bin')+path.delimiter+process.env.PATH};
const run=(cmd,args,cwd)=>execFileSync(cmd,args,{cwd:cwd||root,env,stdio:'inherit',shell:win&&!path.isAbsolute(cmd)});  // .bat y npx necesitan shell en Windows; keytool no (sus argumentos llevan espacios)

// clave de firma: se crea una vez y se reutiliza siempre
const kdir=path.join(os.homedir(),'.neon-tempestad'),ks=path.join(kdir,'release.jks'),kp=path.join(kdir,'keystore.json');
if(!fs.existsSync(ks)){fs.mkdirSync(kdir,{recursive:true});const pass=crypto.randomBytes(18).toString('base64url');
 run(path.join(JAVA,'bin','keytool'),['-genkeypair','-keystore',ks,'-alias','neon','-keyalg','RSA','-keysize','4096','-validity','10000',
  '-storepass',pass,'-keypass',pass,'-dname','CN=Neon Tempestad, O=Neon Tempestad']);
 fs.writeFileSync(kp,JSON.stringify({alias:'neon',password:pass},null,2));console.log('Clave de firma creada en',kdir,'— haz una copia de seguridad.')}
const key=JSON.parse(fs.readFileSync(kp,'utf8'));

require('./clean-dist')();  // quita de dist/ los instalables de versiones anteriores
// web → www/ → proyecto Android (orientación horizontal, iconos) → APK de release firmado
if(!fs.existsSync(path.join(root,'android')))run('npx',['cap','add','android']);
run('node',['tools/build-www.js']);run('npx',['cap','sync','android']);run('node',['tools/android-setup.js']);
fs.writeFileSync(path.join(root,'android','local.properties'),'sdk.dir='+SDK.replace(/\\/g,'\\\\')+'\n');
run(win?'.\\gradlew.bat':'./gradlew',  // ruta explícita: con NoDefaultCurrentDirectoryInExePath, cmd no busca en la carpeta actual
['assembleRelease','--no-daemon','-q',
 `-Pandroid.injected.signing.store.file=${ks}`,`-Pandroid.injected.signing.store.password=${key.password}`,
 `-Pandroid.injected.signing.key.alias=${key.alias}`,`-Pandroid.injected.signing.key.password=${key.password}`],path.join(root,'android'));
const apk=path.join(root,'android','app','build','outputs','apk','release','app-release.apk');
const out=path.join(root,'dist',`NeonTempestad-${ver}.apk`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(apk,out);
console.log(`APK listo: ${out} (versión ${ver})`);
