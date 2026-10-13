import sys,json
for line in open(sys.argv[1]):
    name,_,js=line.partition(' ')
    if name=='RESULT':
        d=json.loads(js); print('valkey keys',d['valkeyKeys'],'| leftover user keys after close',d['leftoverUserKeysAfterClose']); continue
    try: d=json.loads(js)
    except: print(line.strip()[:300]); continue
    calls=d['valkey']['calls']
    ev=calls.get('evalsha',{}); zc=calls.get('zcount',{}); zr=calls.get('zrangebyscore',{})
    tot=sum(v['calls'] for k,v in calls.items() if k!='info')
    print(f"{name:13} {d['seconds']:6}s lat={d['latencyMs']} err={d['errors']} closed={d['closedUnexpectedly']} conn={d['connected']} | valkey cpu={d['valkey']['cpuPct']}% mem={d['valkey']['memMB']}MB cmds/s={tot/d['seconds']:.0f} evalsha/s={ev.get('perSec')} ({ev.get('usecPerCall')}us) zcount/s={zc.get('perSec')} zrange/s={zr.get('perSec')} | backend cpu={d['backendCpuPct']}%")
