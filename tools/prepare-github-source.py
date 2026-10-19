import pathlib,shutil
root=pathlib.Path(__file__).resolve().parents[1];dest=root/'github-distribution'
for folder in ['desktop','tools','tests','docs','vendor-source']:
    for p in (root/folder).rglob('*'):
        rel=p.relative_to(root)
        if p.is_file() and not any(s in {'.git','node_modules','__pycache__'} for s in rel.parts):
            target=dest/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
for name in ['package.json','pnpm-lock.yaml','electron-builder.akuma.yml','LICENSE.txt','README.md']:
    shutil.copy2(root/name,dest/name)
(dest/'.gitignore').write_text('node_modules/\ndist-akuma/\nprivate-admin/\nprivate-pack*/\nqa/\npublication/\nreports/\n*.pem\n',encoding='utf-8')
print('Structure source préparée sans JAR du modpack, clés privées, cache, sessions ou rapports locaux.')
