"""Prepare a PRIVATE candidate; no public redistribution or user preferences."""
import pathlib,json,shutil,zipfile
root=pathlib.Path(__file__).resolve().parents[1]
audit=json.loads((root/'reports/modpack-audit.json').read_text(encoding='utf-8'))
src=pathlib.Path(audit['instance']); dest=root/'private-pack';dest.mkdir(exist_ok=True)
rights={};excluded=[]
# Server utilities do not belong in a standard player distribution.
server_utilities={'globalspawn','placeholder-api','worldedit','survivalfly'}
sources={m['file']:m for m in json.loads((root/'reports/authorized-sources.json').read_text(encoding='utf-8'))}
for m in audit['mods']:
    if m['id'] in server_utilities:
        excluded.append(m['file']);continue
    rel='mods/'+m['file'];target=dest/rel;target.parent.mkdir(exist_ok=True);shutil.copy2(src/rel,target)
    rights[rel]={'mode':'pending','license':m['license'],'evidence':'À vérifier avant publication','projectId':m['curseforgeProject'],'candidateUrl':m['url'],'distributionAllowedAtAudit':m['distributionAllowed'],'dependencies':m['depends']}
    verified=sources.get(m['file'],{})
    if verified.get('source')=='Modrinth' and verified.get('url'):
        rights[rel].update(mode='authorized-url',url=verified['url'],evidence='URL officielle Modrinth obtenue par empreinte SHA-1 exacte ; '+verified['projectUrl'])
    elif verified.get('source')=='CurseForge metadata' and verified.get('reachable'):
        rights[rel].update(mode='authorized-url',url=verified['url'],evidence='Métadonnées CurseForge locales : allowModDistribution=true ; URL officielle vérifiée accessible')
# Copy only named mod configurations, never options.txt, servers.dat, usercache or credentials.
for p in (src/'config').rglob('*'):
    if p.is_file() and not p.is_symlink() and p.name in {'kirriscasino.json'}:
        rel=p.relative_to(src).as_posix()
        # Voice connection identities and private client state are excluded.
        if any(word in rel.lower() for word in ['secret','token','account','session','voicechat-client','user']):continue
        target=dest/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
        rights[rel]={'mode':'pending','evidence':'Configuration candidate : vérifier absence de donnée privée et utilité côté client'}
resource=root.parent/'command-audit-20261019/livraison/client/AkuMa-ResourcePack-actif-1.21.1.zip'
if resource.exists():
    with zipfile.ZipFile(resource) as z:
        meta=json.loads(z.read('pack.mcmeta'))
    rel='resourcepacks/AkuMa-Official.zip';target=dest/rel;target.parent.mkdir(exist_ok=True);shutil.copy2(resource,target)
    rights[rel]={'mode':'pending','evidence':'Pack local récent retrouvé ; vérifier autorisations de toutes les ressources avant publication','packFormat':meta.get('pack',{}).get('pack_format')}
settings={'version':'1.0.0','fabric':audit['fabric'],'baseUrl':'https://VOTRE-DOMAINE-AKUMA','rights':rights}
(root/'reports/publication-candidate.json').write_text(json.dumps(settings,indent=2,ensure_ascii=False),encoding='utf-8')
(root/'reports/pack-selection.json').write_text(json.dumps({'excludedServerUtilities':excluded,'candidateMods':len(list((dest/'mods').glob('*.jar'))),'filesPendingReview':sum(r['mode']=='pending' for r in rights.values()),'resourcepack':str(resource)},indent=2,ensure_ascii=False),encoding='utf-8')
print(f'Candidate privée préparée : {len(rights)} fichiers, {len(excluded)} utilitaires serveur exclus. Publication bloquée tant que les droits restent pending.')
