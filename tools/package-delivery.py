import pathlib,zipfile,hashlib,json,shutil
root=pathlib.Path(__file__).resolve().parents[1];out=root/'delivery';out.mkdir(exist_ok=True)
def archive(target,files):
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for p,name in files:z.write(p,name)
files=[]
for folder in ['desktop','tools','tests','docs','reports','vendor-source']:
    for p in (root/folder).rglob('*'):
        if p.is_file() and not any(s in {'.git','node_modules','__pycache__'} for s in p.relative_to(root).parts) and p.suffix.lower() not in {'.log','.png'}:files.append((p,p.relative_to(root).as_posix()))
files.append((root/'desktop/akuma-art.png','desktop/akuma-art.png'))
for name in ['package.json','pnpm-lock.yaml','electron-builder.akuma.yml','LICENSE.txt','README.md']:
    files.append((root/name,name))
archive(out/'AKUMA-Launcher-Sources-0.1.0.zip',files)
archive(out/'AKUMA-Modpack-Candidat-PRIVE.zip',[(p,p.relative_to(root/'private-pack').as_posix()) for p in (root/'private-pack').rglob('*') if p.is_file()])
installer=root/'dist-akuma/AKUMA-Launcher-Preview-0.1.0-Windows.exe';shutil.copy2(installer,out/installer.name)
hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.is_file() and p.suffix.lower() in {'.exe','.zip'}}
(out/'SHA256SUMS.txt').write_text('\n'.join(f'{h}  {n}' for n,h in hashes.items())+'\n',encoding='utf-8')
print(json.dumps({p.name:p.stat().st_size for p in out.iterdir() if p.is_file()},indent=2))
