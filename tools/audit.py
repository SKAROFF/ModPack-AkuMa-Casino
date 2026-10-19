import json, zipfile, pathlib, hashlib
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'reports'; out.mkdir(exist_ok=True)
instance=pathlib.Path.home()/'curseforge/minecraft/Instances/AKUMA CASINO'
d=json.loads((instance/'minecraftinstance.json').read_text(encoding='utf-8-sig'))
addons={a.get('fileNameOnDisk'):a for a in d.get('installedAddons',[])}
rows=[]
for p in sorted((instance/'mods').glob('*.jar')):
    with zipfile.ZipFile(p) as z:
        try: m=json.loads(z.read('fabric.mod.json'))
        except KeyError: m={}
    a=addons.get(p.name,{})
    rows.append(dict(file=p.name,id=m.get('id'),version=m.get('version'),environment=m.get('environment','*'),depends=m.get('depends',{}),license=m.get('license'),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),size=p.stat().st_size,curseforgeProject=a.get('addonID'),distributionAllowed=a.get('allowModDistribution'),url=a.get('installedFile',{}).get('downloadUrl')))
archives=[]
for p in [pathlib.Path.home()/'Downloads/AKUMA CASINO.zip',*instance.glob('AkuMa*.zip')]:
    with zipfile.ZipFile(p) as z:
        manifests=[n for n in z.namelist() if n.endswith('manifest.json')]
        archives.append(dict(path=str(p),manifest=json.loads(z.read(manifests[0])) if manifests else None,entries=len(z.namelist())))
report=dict(instance=str(instance),minecraft=d.get('gameVersion'),fabric=d.get('baseModLoader',{}).get('forgeVersion'),mods=rows,archives=archives,resourcepacks=[p.name for p in (instance/'resourcepacks').iterdir()])
(out/'modpack-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(dict(minecraft=report['minecraft'],fabric=report['fabric'],mods=len(rows),serverOnly=[r['file'] for r in rows if r['environment']=='server'],unknownRights=[r['file'] for r in rows if not r['license']],archives=[(a['path'],bool(a['manifest'])) for a in archives]),indent=2))
