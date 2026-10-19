import pathlib,zipfile,hashlib,json
root=pathlib.Path(__file__).resolve().parents[1]
p=pathlib.Path.home()/'curseforge/minecraft/Instances/AKUMA CASINO/mods akuma casino.zip'
local=json.loads((root/'reports/modpack-audit.json').read_text(encoding='utf-8'));expected={m['file']:m for m in local['mods']}
with zipfile.ZipFile(p) as z:
    jars=[n for n in z.namelist() if n.startswith('mods/') and n.count('/')==1 and n.endswith('.jar')]
    matches=[]
    for n in jars:
        digest=hashlib.sha256(z.read(n)).hexdigest();matches.append({'file':n,'sha256':digest,'matchesLocal':expected.get(pathlib.PurePosixPath(n).name,{}).get('sha256')==digest})
    excluded=[n for n in z.namelist() if n.startswith(('mods/mcef-cache/','mods/mcef-libraries/')) or n.endswith('.disabled')]
    report={'source':str(p),'archiveSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'topLevelJars':len(jars),'jarMatches':matches,'excludedRuntimeAndCacheEntries':len(excluded),'hasCurseForgeManifest':any(n.endswith('manifest.json') for n in z.namelist()),'note':'Only top-level JARs are candidates. Browser caches, runtime libraries and disabled backups are excluded. Archive matches live instance by exact JAR hashes.'}
(root/'reports/user-archive-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
assert all(x['matchesLocal'] for x in matches),'Archive differs from instance: review before integration'
print(f'{len(jars)} JAR vérifiés identiques ; {len(excluded)} entrées de cache, bibliothèques natives ou anciennes sauvegardes exclues.')
