import json, os, time
from api import *
import logging

logger = logging.getLogger('uvicorn.error')

class XLCharacter(Character):
    def __init__(self, dct):
        super().__init__(dct)
        self.id = error(dct,'id',fingerprint())
        self._update = error(dct,'_update',False)
    def update(self):
        self._update = True
    def check_update(self):
        if self._update:
            self._update = False
            return True
        else:
            return False

with open('config.json','r') as f:
    CONFIG = json.load(f)

def _build_db_endpoints(lst,top):
    for f in lst:
        if type(f) == str:
            if not os.path.exists(os.path.join(top,f)):
                os.makedirs(os.path.join(top,f))
        if type(f) == dict:
            if not os.path.exists(os.path.join(top,f['name'])):
                os.makedirs(os.path.join(top,f['name']))
                _build_db_endpoints(f['folders'],os.path.join(top,f['name']))

_build_db_endpoints(CONFIG['database_endpoints'],os.path.join(*CONFIG['database_path'].split('/')))
if os.path.exists(os.path.join(*CONFIG['session_lock'].split('/'))):
    with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
        d = json.load(f)
    for k in CONFIG['lock_defaults'].keys():
        d[k] = error(d,k,CONFIG['lock_defaults'][k])
    with open(os.path.join(*CONFIG['session_lock'].split('/')),'w') as f:
        f.write(json.dumps(d,indent=4))
else:
    with open(os.path.join(*CONFIG['session_lock'].split('/')),'w') as f:
        f.write(json.dumps(CONFIG['lock_defaults'].copy(),indent=4))

def cache(endpoint,object):
    path = [CONFIG['database_path']]
    path.extend(endpoint.split('.'))
    path.append(object.id+'.json')
    with open(os.path.join(*path),'w') as f:
        json.dump(object.to_dict(),f)

def decache(o_type,endpoint,object):
    if type(object) == str:
        _id = object
    else:
        _id = object.id
    path = [CONFIG['database_path']]
    path.extend(endpoint.split('.'))
    path.append(_id+'.json')
    with open(os.path.join(*path),'r') as f:
        r = f.read()
        return o_type(json.loads(r))

def check_cache(endpoint,object):
    if type(object) == str:
        _id = object
    else:
        _id = object.id
    path = [CONFIG['database_path']]
    path.extend(endpoint.split('.'))
    path.append(_id+'.json')
    return os.path.exists(os.path.join(*path))

class Connection(BaseObject):
    def __init__(self,dct):
        super().__init__()
        self.id = dct['id']
        self.user = error(dct,'user',None)
        self.timeout = error(dct,'timeout',time.time()+CONFIG['connection_timeout'])

class User(BaseObject):
    def __init__(self,dct):
        super().__init__()
        self.connection = dct['connection']
        self.id = error(dct,'id',fingerprint())
        self.options = error(dct,'options',{
            'display_name':dct['username'].split('@')[0]
        })
        self.characters = error(dct,'characters',[])
        self.campaigns = error(dct,'campaigns',{
            'owned':[],
            'participating':[]
        })
        self._update = error(dct,'_update',False)
        self.passhash = dct['passhash']
        self.username = dct['username']

    def update(self):
        self._update = True
    def check_update(self):
        if self._update:
            self._update = False
            return True
        else:
            return False

OE_MAP = {
    'characters':XLCharacter,
    'users':User
}

class Server:
    def __init__(self):
        self.loaded_objects = {}
        self.connections = {}
    def get(self,endpoint,_id):
        if not endpoint in OE_MAP.keys():
            raise KeyError(f'Endpoint {endpoint} is not linked to any object type.')
        if _id in self.loaded_objects.keys():
            if self.loaded_objects[_id]['endpoint'] == endpoint:
                self.loaded_objects[_id]['loaded_time'] = time.time()
                if self.loaded_objects[_id]['endpoint'] == 'users':
                    with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
                        cur_lock = json.load(f)
                    if not self.loaded_objects[_id]['object'].username in cur_lock['user_map'].keys():
                        cur_lock['user_map'][self.loaded_objects[_id]['object'].username] = self.loaded_objects[_id]['object'].id
                    with open(os.path.join(*CONFIG['session_lock'].split('/')),'w') as f:
                        json.dump(cur_lock,f)
                return self.loaded_objects[_id]['object']
        if check_cache(endpoint,_id):
            self.loaded_objects[_id] = {
                'object':decache(OE_MAP[endpoint],endpoint,_id),
                'loaded_time':time.time(),
                'endpoint':endpoint
            }
            if self.loaded_objects[_id]['endpoint'] == 'users':
                    with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
                        cur_lock = json.load(f)
                    if not self.loaded_objects[_id]['object'].username in cur_lock['user_map'].keys():
                        cur_lock['user_map'][self.loaded_objects[_id]['object'].username] = self.loaded_objects[_id]['object'].id
                    with open(os.path.join(*CONFIG['session_lock'].split('/')),'w') as f:
                        json.dump(cur_lock,f)
            return self.loaded_objects[_id]['object']
        else:
            raise KeyError(f'Object with ID "{_id}" does not exist at endpoint "{endpoint}".')
    def store(self,_id):
        if _id in self.loaded_objects.keys():
            cache(self.loaded_objects[_id]['endpoint'],self.loaded_objects[_id]['object'])
            if self.loaded_objects[_id]['endpoint'] == 'users':
                with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
                    cur_lock = json.load(f)
                if not self.loaded_objects[_id]['object'].username in cur_lock['user_map'].keys():
                    cur_lock['user_map'][self.loaded_objects[_id]['object'].username] = self.loaded_objects[_id]['object'].id
                with open(os.path.join(*CONFIG['session_lock'].split('/')),'w') as f:
                    json.dump(cur_lock,f)
    def check_all(self):
        for i in list(self.loaded_objects.keys()):
            if time.time() > self.loaded_objects[i]['loaded_time']+CONFIG['loaded_object_timeout']:
                self.store(i)
                del self.loaded_objects.keys()[i]
        with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
            cur_lock = json.load(f)
        for c in list(self.connections.keys()):
            if time.time() > self.connections[c].timeout:
                if c in cur_lock['connections'].keys():
                    del cur_lock['connections'][c]
                del self.connections[c]
        for u in cur_lock['user_map'].keys():
            if not os.path.exists(os.path.join(*CONFIG['database_path'].split('/'),'users',cur_lock['user_map'][u]+'.json')):
                del cur_lock['user_map'][u]
        for f in os.listdir(os.path.join(*CONFIG['database_path'].split('/'),'users')):
            if not f.split('.')[0] in cur_lock['user_map'].values():
                os.remove(os.path.join(*CONFIG['database_path'].split('/'),'users',f))

        with open(os.path.join(*CONFIG['session_lock'].split('/')),'w') as f:
            json.dump(cur_lock,f)
    def update_connection(self,fp):
        if fp in self.connections.keys():
            if round(time.time()) > self.connections[fp].timeout+CONFIG['connection_timeout']-3:
                self.connections[fp].timeout = round(time.time()+CONFIG['connection_timeout'])
            with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
                cur_lock = json.load(f)
            if self.connections[fp].to_dict() != cur_lock['connections'][fp]:
                cur_lock['connections'][fp] = self.connections[fp].to_dict()
                with open(os.path.join(*CONFIG['session_lock'].split('/')),'w') as f:
                    json.dump(cur_lock,f)
        else:
            with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
                cur_lock = json.load(f)
            if fp in cur_lock['connections'].keys():
                self.connections[fp] = Connection(cur_lock['connections'][fp].copy())
            else:
                self.connections[fp] = Connection({'id':fp})
                cur_lock['connections'][fp] = self.connections[fp].to_dict()
            with open(os.path.join(*CONFIG['session_lock'].split('/')),'w') as f:
                json.dump(cur_lock,f)
        updates = {
            'user':False,
            'characters':False,
            'campaigns':False,
            'maps':False
        }
        uid = None
        if self.connections[fp].user != None:
            u = self.get('users',self.connections[fp].user)
            uid = u.id
            updates['user'] = u.check_update()
            updates['characters'] = any([self.get('characters',i).check_update() for i in u.characters])
        return updates, uid
    def check_connection(self,_id):
        if _id in self.connections.keys():
            return True
        with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
            if _id in json.load(f)['connections'].keys():
                self.connections[_id] = Connection(json.load(f)['connections'][_id])
                return True
        return False
    def add_object(self,obj,store=True):
        for i in OE_MAP.keys():
            if type(obj) == OE_MAP[i]:
                self.loaded_objects[obj.id] = {
                    'object':obj,
                    'loaded_time':time.time(),
                    'endpoint':i
                }
                if store:
                    self.store(obj.id)
                return self.loaded_objects[obj.id]


server = Server()