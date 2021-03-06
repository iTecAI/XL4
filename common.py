import json
import os
import time
from api import *
import logging
from fastapi import status

logger = logging.getLogger('uvicorn.error')

ALLOWED_FS_ENDPOINTS = ['images']


def _get_mod_from_score(score):
    return int((score-10)/2)


def try_keys(object, keys):
    for i in keys:
        if i in object.keys():
            return object[i]
    return KeyError(f'None of {",".join(keys)} are keys of the given object.')


class XLCharacter(Character):
    def __init__(self, dct):
        super().__init__(dct)
        self.id = error(dct, 'id', generate_id())
        self._update = error(dct, '_update', {'self':False})
        self.campaign = error(dct, 'campaign', None)
        self.owner = error(dct, 'owner', None)

        if not 'id' in dct.keys():
            new = []
            for i in self.attack_info:
                if not any([x['name'].lower() == i['name'].lower() for x in search_static(i['name'], 'weapons', exclude=[])]):
                    new.append(i)
            self.attack_info = new[:]

            new = []
            for i in self.gear_info:
                if not any([x['name'].lower() == i['name'].lower() for x in search_static(i['name'], 'equipment', exclude=[])]):
                    new.append(i)
            self.gear_info = new[:]

            new = []
            for i in self.race_info:
                if len(search_static(try_keys(i, ['name', 'race_name']), 'races', exclude=[])) == 0 or not any([try_keys(x, ['name', 'race_name']).lower() == try_keys(i, ['name', 'race_name']).lower() for x in search_static(try_keys(i, ['name', 'race_name']), 'races', exclude=[])]):
                    new.append({
                        'ability_score_increase': try_keys(i, ['scores', 'ability_score_increase']),
                        'armor_class': try_keys(i, ['armor', 'armor_class']),
                        'attacks': i['attacks'],
                        'bonus_hp': try_keys(i, ['bonus_hp', 'hp_bonus']),
                        'bonus_weapon_armor_profs': try_keys(i, ['weapon_armor_profs', 'bonus_weapon_armor_profs']),
                        'features_profs': try_keys(i, ['other_proficiencies', 'features_profs']),
                        'languages': i['languages'],
                        'race_name': try_keys(i, ['name', 'race_name']),
                        'resist_vuln_immune': try_keys(i, ['resist_immune_vuln', 'resist_vuln_immune']),
                        'speed': error(i, 'speed', 30)
                    })
            self.race_info = new[:]

            new = []
            for i in self.class_info:
                s = search_static(
                    try_keys(i, ['name', 'class_name']), 'classes', exclude=[])
                if len(s) == 0:
                    new.append(i)
                else:
                    if not any([str(i['subclass']).lower() == str(n['subclass']).lower() or i['subclass'] == n['subclass'] for n in s]):
                        new.append({
                            'additional_proficiencies': error(i, ['additional_proficiencies', 'multiclass_profs'], None),
                            'armor_class': error(i, ['armor_class', 'alt_ac'], None),
                            'bonus_hp_per_level': error(i, ['bonus_hp_per_level', 'bonus_hp'], None),
                            'class_name': error(i, ['class_name', 'name'], None),
                            'first_level_proficiencies': error(i, ['first_level_proficiencies', 'first_level_profs'], None),
                            'hit_die': error(i, 'hit_die', None),
                            'init': error(i, ['init', 'init_bonus'], None),
                            'saves_skills': error(i, 'saves_skills', None),
                            'speed_increase': error(i, 'speed_increase', None),
                            'spellcasting_ability': error(i, ['spellcasting_ability', 'spell_ability'], None),
                            'spellcasting_type': error(i, ['spellcasting_type', 'spell_type'], None),
                            'subclass': error(i, 'subclass', None)
                        })
            self.class_info = new[:]
        self.reprocess()

        self.update_timeouts = error(dct, 'update_timeouts', {'self':0})
    def update(self, endpoint='self'):
        self._update[endpoint] = True
        self.update_timeouts[endpoint] = time.time() + CONFIG['update_timeout']

    def check_update(self, endpoint='self'):
        if self._update[endpoint]:
            if time.time() > self.update_timeouts[endpoint]:
                self._update[endpoint] = False
                del self.update_timeouts[endpoint]
            return True
        else:
            return False

    def get_class(self, name, subclass=None):
        subclass = condition(
            subclass in [0, '0', None, '', []], None, subclass)
        for i in self.class_info:
            if i['class_name'].lower() == name.lower():
                if str(subclass).lower() == str(i['subclass']).lower():
                    return i
        info = search_static('', endpoint='classes', exclude=[])
        for i in info:
            if i['class_name'].lower() == name.lower():
                if str(subclass).lower() == str(i['subclass']).lower():
                    return i
        raise KeyError(f'Class {name} with subclass {subclass} not found.')

    def get_attack(self, name):
        try:
            return super().get_attack(name)
        except ValueError:
            info = search_static('', endpoint='weapons', exclude=[])
            for i in info:
                if i['name'].lower() == name.lower():
                    return i
            raise KeyError(f'Attack {name} not found.')

    def get_gear(self, name):
        try:
            return super().get_gear(name)
        except ValueError:
            info = search_static('', endpoint='equipment', exclude=[])
            for i in info:
                if i['name'].lower() == name.lower():
                    return i
            raise KeyError(f'Gear {name} not found.')

    def get_race(self, name):
        for i in self.race_info:
            if i['race_name'].lower() == name.lower():
                return i
        info = search_static('', endpoint='races', exclude=[])
        for i in info:
            if i['race_name'].lower() == name.lower():
                return i
        raise KeyError(f'Race {name} not found.')

    def initiative(self):
        return sum([
            super().initiative(),
            condition(self.check_feat('alert'), 5, 0),
            sum([condition(self.get_class(i['class'], subclass=i['subclass'])['init'] == None, 0, self.get_class(
                i['class'], subclass=i['subclass'])['init']) for i in self.level['classes']]),
            condition(self.check_trait('jack of all trades'),
                      int(self.proficiency_bonus/2), 0)
        ])

    def get_init_bonus(self):
        return sum([
            _get_mod_from_score(self.abilities['dexterity']['score_base']+sum(
                self.abilities['dexterity']['score_mod'])+self.abilities['dexterity']['score_manual_mod']),
            condition(self.check_feat('alert'), 5, 0),
            sum([condition(self.get_class(i['class'], subclass=i['subclass'])['init'] == None, 0, self.get_class(
                i['class'], subclass=i['subclass'])['init']) for i in self.level['classes']]),
            condition(self.check_trait('jack of all trades'),
                      int(self.proficiency_bonus/2), 0)
        ])


with open('config.json', 'r') as f:
    CONFIG = json.load(f)


def _build_db_endpoints(lst, top):
    for f in lst:
        if type(f) == str:
            if not os.path.exists(os.path.join(top, f)):
                os.makedirs(os.path.join(top, f))
        if type(f) == dict:
            if not os.path.exists(os.path.join(top, f['name'])):
                os.makedirs(os.path.join(top, f['name']))
                _build_db_endpoints(f['folders'], os.path.join(top, f['name']))


_build_db_endpoints(CONFIG['database_endpoints'],
                    os.path.join(*CONFIG['database_path'].split('/')))
if os.path.exists(os.path.join(*CONFIG['session_lock'].split('/'))):
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
        d = json.load(f)
    for k in CONFIG['lock_defaults'].keys():
        d[k] = error(d, k, CONFIG['lock_defaults'][k])
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'w') as f:
        f.write(json.dumps(d, indent=4))
else:
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'w') as f:
        f.write(json.dumps(CONFIG['lock_defaults'].copy(), indent=4))


def cache(endpoint, object):
    path = [CONFIG['database_path']]
    path.extend(endpoint.split('.'))
    path.append(object.id+'.json')
    with open(os.path.join(*path), 'w') as f:
        json.dump(object.to_dict(), f)


def decache(o_type, endpoint, object):
    if type(object) == str:
        _id = object
    else:
        _id = object.id
    path = [CONFIG['database_path']]
    path.extend(endpoint.split('.'))
    path.append(_id+'.json')
    with open(os.path.join(*path), 'r') as f:
        r = f.read()
        return o_type(json.loads(r))


def check_cache(endpoint, object):
    if type(object) == str:
        _id = object
    else:
        _id = object.id
    path = [CONFIG['database_path']]
    path.extend(endpoint.split('.'))
    path.append(_id+'.json')
    return os.path.exists(os.path.join(*path))


def remove_cache(endpoint, object):
    if type(object) == str:
        _id = object
    else:
        _id = object.id
    path = [CONFIG['database_path']]
    path.extend(endpoint.split('.'))
    path.append(_id+'.json')
    os.remove(os.path.join(*path))

def get_raw(endpoint, filename, mode='r'):
    path = []
    path = [CONFIG['database_path']]
    path.extend(endpoint.split('.'))
    path.append(filename)
    return open(os.path.join(*path),mode)

def get_raw_path(endpoint, filename):
    path = []
    path = [CONFIG['database_path']]
    path.extend(endpoint.split('.'))
    path.append(filename)
    return os.path.join(*path)

class Connection(BaseObject):
    def __init__(self, dct):
        super().__init__()
        self.id = dct['id']
        self.user = error(dct, 'user', None)
        self.timeout = error(dct, 'timeout', time.time() +
                             CONFIG['connection_timeout'])


class User(BaseObject):
    def __init__(self, dct):
        super().__init__()
        self.connection = dct['connection']
        self.id = error(dct, 'id', fingerprint())
        self.options = error(dct, 'options', {
            'display_name': dct['username'].split('@')[0]
        })
        self.characters = error(dct, 'characters', [])
        self.campaigns = error(dct, 'campaigns', [])
        self._update = error(dct, '_update', {
            'self': False,
            'characters': False,
            'campaigns': False,
            'maps': False
        })
        self.passhash = dct['passhash']
        self.username = dct['username']
        self.user_type = error(dct, 'user_type', 'default')
        self.update_timeouts = error(dct, 'update_timeouts', {'self':0})
    def update(self, endpoint='self'):
        self._update[endpoint] = True
        self.update_timeouts[endpoint] = time.time() + CONFIG['update_timeout']

    def check_update(self, endpoint='self'):
        if self._update[endpoint]:
            if time.time() > self.update_timeouts[endpoint]:
                self._update[endpoint] = False
                del self.update_timeouts[endpoint]
            return True
        else:
            return False


class Campaign(BaseObject):
    def __init__(self, dct):
        super().__init__()
        self.owner = dct['owner']
        self.id = error(dct, 'id', generate_id())
        self.settings = error(dct, 'settings', {
            'rules': {
                'variant_encumbrance': False
            }
        })
        self.name = error(dct, 'name', 'New Campaign')
        self.maps = error(dct, 'maps', [])
        self.homebrew_creatures = error(dct, 'homebrew_creatures', {})
        self.characters = error(dct, 'characters', [])
        self.dms = error(dct, 'dms', [dct['owner']])
        self.players = error(dct, 'players', [])
        self._update = error(dct, '_update', {
            'self': False,
            'maps': False,
            'homebrews': False
        })
        self.icon = error(dct, 'icon', None)
        self.update_timeouts = error(dct, 'update_timeouts', {'self':0})
    def update(self, endpoint='self'):
        self._update[endpoint] = True
        self.update_timeouts[endpoint] = time.time() + CONFIG['update_timeout']

    def check_update(self, endpoint='self'):
        if self._update[endpoint]:
            if time.time() > self.update_timeouts[endpoint]:
                self._update[endpoint] = False
                del self.update_timeouts[endpoint]
            return True
        else:
            return False


class Map(BaseObject):
    def __init__(self, dct):
        super().__init__()
        self.campaign = dct['campaign']
        self.id = error(dct, 'id', generate_id())
        self.objects = error(dct, 'objects', {})
        self.name = error(dct, 'name', 'New Map')
        self.map_img = dct['map_img']
        self.dimensions = error(dct, 'dimensions', {
            'scale':5,
            'columns':10,
            'rows':10
        })
        self.initiative = error(dct,'initiative',{
            'combatants':{},
            'current':None,
            'active':False
        })
        self._update = error(dct, '_update', {
            'self': False
        })
        self.update_timeouts = error(dct, 'update_timeouts', {'self':0})
    def update(self, endpoint='self'):
        self._update[endpoint] = True
        self.update_timeouts[endpoint] = time.time() + CONFIG['update_timeout']

    def check_update(self, endpoint='self'):
        if self._update[endpoint]:
            if time.time() > self.update_timeouts[endpoint]:
                self._update[endpoint] = False
                del self.update_timeouts[endpoint]
            return True
        else:
            return False

class FileSystemMeta(BaseObject):
    def __init__(self, dct):
        super().__init__()
        self.id = dct['id']
        self.can_access = error(dct, 'can_access', {
            'user':[],
            'campaign_participant':[],
            'campaign_dm':[]
        })
        self.ext = dct['ext']

OE_MAP = {
    'characters': XLCharacter,
    'users': User,
    'campaigns.campaigns': Campaign,
    'campaigns.maps': Map,
    'images.meta': FileSystemMeta
}


def store_usermap(name, _id):
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
        cur_lock = json.load(f)
    cur_lock['user_map'][name] = _id
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'w') as f:
        json.dump(cur_lock, f)


def get_usermap(name):
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
        lock = json.load(f)
    if name in lock['user_map'].keys():
        return lock['user_map'][name]
    path = []
    path.extend(CONFIG['database_path'].split('/'))
    path.append('users')
    for i in os.listdir(os.path.join(*path)):
        subpath = path[:]
        subpath.append(i)
        with open(os.path.join(*subpath),'r') as f:
            data = json.load(f)
            if name == data['username']:
                store_usermap(name, data['id'])
                return data['id']

    return None


def list_usermap():
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
        lock = json.load(f)
    return list(lock['user_map'].keys())


def raw_usermap():
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
        lock = json.load(f)
    return lock['user_map']


def del_usermap(name):
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
        cur_lock = json.load(f)
    if name in cur_lock['user_map'].keys():
        del cur_lock['user_map'][name]
    with open(os.path.join(*CONFIG['session_lock'].split('/')), 'w') as f:
        json.dump(cur_lock, f)


class Server:
    def __init__(self):
        self.loaded_objects = {}
        self.connections = {}

    def get(self, endpoint, _id):
        if not endpoint in OE_MAP.keys():
            raise KeyError(
                f'Endpoint {endpoint} is not linked to any object type.')
        if _id in self.loaded_objects.keys():
            if self.loaded_objects[_id]['endpoint'] == endpoint:
                self.loaded_objects[_id]['loaded_time'] = time.time()
                if self.loaded_objects[_id]['endpoint'] == 'users':
                    store_usermap(
                        self.loaded_objects[_id]['object'].username, self.loaded_objects[_id]['object'].id)
                return self.loaded_objects[_id]['object']
        if check_cache(endpoint, _id):
            self.loaded_objects[_id] = {
                'object': decache(OE_MAP[endpoint], endpoint, _id),
                'loaded_time': time.time(),
                'endpoint': endpoint
            }
            if self.loaded_objects[_id]['endpoint'] == 'users':
                store_usermap(
                    self.loaded_objects[_id]['object'].username, self.loaded_objects[_id]['object'].id)
            return self.loaded_objects[_id]['object']
        else:
            raise KeyError(
                f'Object with ID "{_id}" does not exist at endpoint "{endpoint}".')

    def delete(self, endpoint, _id):
        if not endpoint in OE_MAP.keys():
            raise KeyError(
                f'Endpoint {endpoint} is not linked to any object type.')
        if check_cache(endpoint, _id):
            remove_cache(endpoint, _id)
            if _id in self.loaded_objects:
                del self.loaded_objects[_id]
        else:
            raise KeyError(
                f'Object with ID "{_id}" does not exist at endpoint "{endpoint}".')

    def store(self, _id):
        if _id in self.loaded_objects.keys():
            cache(self.loaded_objects[_id]['endpoint'],
                  self.loaded_objects[_id]['object'])
            if self.loaded_objects[_id]['endpoint'] == 'users':
                store_usermap(
                    self.loaded_objects[_id]['object'].username, self.loaded_objects[_id]['object'].id)

    def check_all(self):
        for i in list(self.loaded_objects.keys()):
            if time.time() > self.loaded_objects[i]['loaded_time']+CONFIG['loaded_object_timeout']:
                self.store(i)
                del self.loaded_objects.keys()[i]
        with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
            cur_lock = json.load(f)
        for c in list(self.connections.keys()):
            if time.time() > self.connections[c].timeout:
                if c in cur_lock['connections'].keys():
                    del cur_lock['connections'][c]
                del self.connections[c]
        for u in list_usermap():
            if not os.path.exists(os.path.join(*CONFIG['database_path'].split('/'), 'users', cur_lock['user_map'][u]+'.json')):
                del_usermap(u)
        for f in os.listdir(os.path.join(*CONFIG['database_path'].split('/'), 'users')):
            if not f.split('.')[0] in raw_usermap().values():
                os.remove(os.path.join(
                    *CONFIG['database_path'].split('/'), 'users', f))

        with open(os.path.join(*CONFIG['session_lock'].split('/')), 'w') as f:
            json.dump(cur_lock, f)

    def update_connection(self, fp):
        if fp in self.connections.keys():
            if round(time.time()) > self.connections[fp].timeout+CONFIG['connection_timeout']-3:
                self.connections[fp].timeout = round(
                    time.time()+CONFIG['connection_timeout'])
            with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
                cur_lock = json.load(f)
            if self.connections[fp].to_dict() != cur_lock['connections'][fp]:
                cur_lock['connections'][fp] = self.connections[fp].to_dict()
                with open(os.path.join(*CONFIG['session_lock'].split('/')), 'w') as f:
                    json.dump(cur_lock, f)
        else:
            with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
                cur_lock = json.load(f)
            if fp in cur_lock['connections'].keys():
                self.connections[fp] = Connection(
                    cur_lock['connections'][fp].copy())
            else:
                self.connections[fp] = Connection({'id': fp})
                cur_lock['connections'][fp] = self.connections[fp].to_dict()
            with open(os.path.join(*CONFIG['session_lock'].split('/')), 'w') as f:
                json.dump(cur_lock, f)
        updates = {
            'user': False,
            'characters': {
                'global': False,
                'specific': {}
            },
            'campaigns': {
                'global': False,
                'specific': {},
                'homebrew_specific':{}
            },
            'maps': {
                'global': False,
                'specific': {}
            }
        }
        uid = None
        if self.connections[fp].user != None:
            u = self.get('users', self.connections[fp].user)
            uid = u.id
            updates['user'] = u.check_update()
            updates['characters']['global'] = u.check_update(endpoint='characters')
            updates['characters']['specific'] = {i: self.get(
                'characters', i).check_update() for i in u.characters}
            updates['campaigns']['global'] = u.check_update('campaigns')
            updates['campaigns']['specific'] = {i: self.get(
                'campaigns.campaigns', i).check_update() for i in u.campaigns}
            updates['campaigns']['homebrew_specific'] = {i: self.get(
                'campaigns.campaigns', i).check_update('homebrews') for i in u.campaigns}
            updates['maps']['global'] = u.check_update('maps')
            maps = []
            for i in u.campaigns:
                maps.extend(self.get('campaigns.campaigns', i).maps)
            updates['maps']['specific'] = {i: self.get(
                'campaigns.maps', i).check_update() for i in maps}
        return updates, uid

    def check_connection(self, _id):
        if _id in self.connections.keys():
            return True
        with open(os.path.join(*CONFIG['session_lock'].split('/')), 'r') as f:
            if _id in json.load(f)['connections'].keys():
                self.connections[_id] = Connection(
                    json.load(f)['connections'][_id])
                return True
        return False

    def add_object(self, obj, store=True):
        for i in OE_MAP.keys():
            if type(obj) == OE_MAP[i]:
                self.loaded_objects[obj.id] = {
                    'object': obj,
                    'loaded_time': time.time(),
                    'endpoint': i
                }
                if store:
                    self.store(obj.id)
                return self.loaded_objects[obj.id]


server = Server()


def fingerprint_validate(fp, response):
    if fp == 'null' or fp == None:
        response.status_code = status.HTTP_403_FORBIDDEN
        return response, {'result': 'Must have a session fingerprint to access API.'}
    if len(fp) != 43:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return response, {'result': f'Invalid fingerprint. Must be of length 43, recieved fingerprint "{fp}" with length {str(len(fp))}'}
    if not server.check_connection(fp):
        response.status_code = status.HTTP_403_FORBIDDEN
        return response, {'result': 'Unknown session fingerprint'}
    return response, 0

def fs_delete(endpoint, filename):
    try:
        metadata = server.get(endpoint+'.meta',filename)
    except KeyError:
        return status.HTTP_404_NOT_FOUND, {'result':f'File with name {filename} at endpoint {endpoint} not found.'}
    try:
        os.remove(get_raw_path(endpoint+'.raw',filename+'.'+metadata.ext))
    except:
        pass
    server.delete(endpoint+'.meta',filename)
    return status.HTTP_200_OK, {'result':'Success.'}
