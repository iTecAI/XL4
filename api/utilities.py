import hashlib, time, random, base64, json, os, copy
import logging

logger = logging.getLogger('uvicorn.error')

def fingerprint(): # Long unique fingerprint
    return base64.urlsafe_b64encode(bytes.fromhex(hashlib.sha256(str(time.time()+random.random()).encode('utf-8')).hexdigest())).decode().strip().strip('=')

def generate_id(l=12): # Shorter unique (probably) fingerprint with length {l}
    return ''.join([random.choice(
        list(base64.urlsafe_b64encode(bytes.fromhex(hashlib.sha256(str(time.time()+random.random()).encode('utf-8')).hexdigest())).decode().strip().strip('='))
    ) for i in range(l)])

def error(dct,key,default):
    out = None
    if type(key) == list:
        for i in key:
            if i in dct.keys():
                out = copy.deepcopy(dct[i])
        if out == None:
            out = copy.deepcopy(default)
    else:
        try:
            out = copy.deepcopy(dct[key])
        except KeyError as e:
            out = copy.deepcopy(default)
    
    if type(default) == dict:
        for i in default.keys():
            if not i in out.keys():
                out[i] = copy.deepcopy(default[i])
    return out

def search_static(search,endpoint=None,exclude=['spellcasting','classes','races']):
    results = []
    if type(endpoint) == str:
        if os.path.exists(os.path.join('api','static',endpoint+'.json')):
            with open(os.path.join('api','static',endpoint+'.json'),'r') as f:
                dat = json.load(f)
            if type(dat) == list:
                for i in dat:
                    if 'name' in i.keys():
                        if i['name'].lower() in search.lower() or search.lower() in i['name'].lower():
                            results.append(i.copy())
                    if 'class_name' in i.keys():
                        if i['class_name'].lower() in search.lower() or search.lower() in i['class_name'].lower():
                            results.append(i.copy())
                    if 'race_name' in i.keys():
                        if i['race_name'].lower() in search.lower() or search.lower() in i['race_name'].lower():
                            results.append(i.copy())
            elif type(dat) == dict:
                for i in dat.keys():
                    if i.lower() in search.lower() or search.lower() in i.lower():
                        results.append(i.copy())
    else:
        if type(endpoint) == list:
            eps = endpoint[:]
        else:
            eps = [i.split('.')[0] for i in os.listdir(os.path.join('api','static'))]
        for x in eps:
            if not x in exclude:
                with open(os.path.join('api','static',x+'.json'),'r') as f:
                    dat = json.load(f)
                if type(dat) == list:
                    for i in dat:
                        if 'name' in i.keys():
                            if i['name'].lower() in search.lower() or search.lower() in i['name'].lower():
                                results.append({
                                    'endpoint':x,
                                    'data':i.copy()
                                })
                        if 'class_name' in i.keys():
                            if i['class_name'].lower() in search.lower() or search.lower() in i['class_name'].lower():
                                results.append({
                                    'endpoint':x,
                                    'data':i.copy()
                                })
                        if 'race_name' in i.keys():
                            if i['race_name'].lower() in search.lower() or search.lower() in i['race_name'].lower():
                                results.append({
                                    'endpoint':x,
                                    'data':i.copy()
                                })
                elif type(dat) == dict:
                    for i in dat.keys():
                        if i.lower() in search.lower() or search.lower() in i.lower():
                            results.append({
                                    'endpoint':x,
                                    'data':dat[i][:]
                                })
    return results

def copath(cpath):
    return os.path.join(*cpath.split('/'))