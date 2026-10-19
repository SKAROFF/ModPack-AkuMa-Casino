import pathlib,zipfile,json,io
root=pathlib.Path(__file__).resolve().parents[1];mods=[];provided={'minecraft','fabricloader','java'}
def inspect(blob,origin):
    with zipfile.ZipFile(blob) as z:
        try:m=json.loads(z.read('fabric.mod.json'))
        except KeyError:return
        mods.append((origin,m));provided.add(m['id']);provided.update(m.get('provides',[]))
        for entry in m.get('jars',[]):inspect(io.BytesIO(z.read(entry['file'])),origin+'!'+entry['file'])
for p in (root/'private-pack/mods').glob('*.jar'):inspect(p,p.name)
missing=[]
for origin,m in mods:
    for dep,constraint in m.get('depends',{}).items():
        if dep not in provided:missing.append({'file':origin,'mod':m['id'],'missing':dep,'constraint':constraint})
result={'topLevelMods':len(list((root/'private-pack/mods').glob('*.jar'))),'modsIncludingNested':len(mods),'missingDependencyIds':missing,'versionConstraints':'Listed in modpack-audit.json; Fabric loader must validate final ranges during authenticated launch.'}
(root/'reports/dependency-check.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result,indent=2))
