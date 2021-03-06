from fastapi import APIRouter, Header, Response, status
from typing import Optional
from fastapi.param_functions import Query

from starlette.status import HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND, HTTP_405_METHOD_NOT_ALLOWED, HTTP_409_CONFLICT
from common import *
from api import *
from models import *
import hashlib
import logging
import urllib.parse as uparse

logger = logging.getLogger('uvicorn.error')

router = APIRouter()

ALLOWED_PLAYER_OBJECTS = ['shape', 'character']


@router.get('/')
async def get_campaigns(response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    cmps = {i: server.get('campaigns.campaigns', i).to_dict() for i in server.get(
        'users', server.connections[fp].user).campaigns}
    for c in cmps.keys():
        cmps[c]['maps'] = {i: server.get('campaigns.maps', i)
                           for i in cmps[c]['maps']}
        cmps[c]['homebrew_creatures'] = {i['bestiary']['name']:[i['bestiary']['id'],i['bestiary']['type'],len(i['data'].keys())] for i in cmps[c]['homebrew_creatures'].values() if i != None}
    return {
        'uid': server.connections[fp].user,
        'campaigns': cmps
    }


@router.get('/{sid}/')
async def get_campaign_specific(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        cmp = server.get('campaigns.campaigns', sid).to_dict()
        cmp['maps'] = [server.get('campaigns.maps', i) for i in cmp['maps']]
        if (server.connections[fp].user in cmp['dms']):
            cmp['character_data'] = {i: server.get(
                'characters', i).to_dict() for i in cmp['characters']}
        else:
            cmp['character_data'] = {i: server.get('characters', i).to_dict(
            ) for i in cmp['characters'] if i in server.get('users', server.connections[fp].user).characters}
            for c in cmp['characters']:
                if not c in server.get('users', server.connections[fp].user).characters:
                    ch = server.get('characters', c).to_dict()
                    cmp['character_data'][c] = {
                        'name': ch['name'],
                        'size': ch['size'],
                        'id': c,
                        'appearance': {
                            'image': ch['appearance']['image']
                        }
                    }
        cmp['homebrew_creatures'] = {i['bestiary']['name']:[i['bestiary']['id'],i['bestiary']['type'],len(i['data'].keys())] for i in cmp['homebrew_creatures'].values() if i != None}
        return cmp
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.get('/{sid}/homebrew/')
async def get_campaign_specific(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        cmp = server.get('campaigns.campaigns', sid).to_dict()
        return cmp['homebrew_creatures']
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.post('/new/')
async def new_campaign(model: NewCampaignModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if CONFIG['user_restrictions'][server.get('users', server.connections[fp].user).user_type]['max_campaigns'] <= len([i for i in server.get('users', server.connections[fp].user).campaigns if server.get('campaigns.campaigns', i).owner == server.connections[fp].user]):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result': 'You have too many campaigns. Maximum allowed: '+str(CONFIG['user_restrictions'][server.get('users', server.connections[fp].user).user_type]['max_campaigns'])}

    obj = Campaign({'owner': server.connections[fp].user, 'name': model.name})
    server.add_object(obj)
    server.get('users', server.connections[fp].user).campaigns.append(obj.id)
    server.store(server.connections[fp].user)
    server.get('users', server.connections[fp].user).update()
    server.get('campaigns.campaigns', obj.id).update()
    return {'cmpid': obj.id, 'campaign': obj.to_dict()}


@router.post('/{sid}/delete/')
async def delete_campaign(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user:
            server.delete('campaigns.campaigns', sid)
            server.get(
                'users', server.connections[fp].user).campaigns.remove(sid)
            server.store(server.connections[fp].user)
            server.get('users', server.connections[fp].user).update(
                endpoint='campaigns')
            return {'result': f'Deleted campaign {sid}'}
        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result': f'You do not own campaign {sid}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.post('/{sid}/maps/new/')
async def add_map(sid: str, model: AddMapModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or server.connections[fp].user in server.get('campaigns.campaigns', sid).dms:
            new_map_object = Map({
                'campaign': sid,
                'map_img': model.image,
                'dimensions': model.dimensions,
                'name': model.name
            })
            server.add_object(new_map_object)
            server.get('campaigns.maps', new_map_object.id).update()
            server.get('campaigns.campaigns', sid).maps.append(
                new_map_object.id)
            server.get('campaigns.campaigns', sid).update('maps')
            server.get('campaigns.campaigns', sid).update()
            server.store(sid)
            return new_map_object.to_dict()
        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result': f'You are not a dm of campaign {sid}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.post('/{sid}/maps/{mid}/delete/')
async def add_map(sid: str, mid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or server.connections[fp].user in server.get('campaigns.campaigns', sid).dms:
            if mid in server.get('campaigns.campaigns', sid).maps:
                fs_delete('images', server.get(
                    'campaigns.maps', mid).map_img.split('/')[3])
                try:
                    server.get('campaigns.campaigns', sid).maps.remove(mid)
                    server.delete('campaigns.maps', mid)
                    server.get('campaigns.campaigns', sid).update()
                    server.get('campaigns.campaigns', sid).update('maps')
                    server.store(sid)
                except ValueError:
                    pass
                return {'result': 'Success.'}

            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find map {mid} in campaign {sid}.'}
        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result': f'You are not a dm of campaign {sid}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.get('/{sid}/maps/{mid}/')
async def get_map(sid: str, mid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            return server.get('campaigns.maps', mid)
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.post('/{sid}/modify/')
async def modify_campaign(sid: str, model: ModifyModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or server.connections[fp].user in server.get('campaigns.campaigns', sid).dms:
            code = f'server.get("campaigns.campaigns",sid).{model.path.split(".")[0]}'
            for i in model.path.split('.')[1:]:
                code += '['
                try:
                    code += str(int(i))
                except ValueError:
                    code += '"'+str(i)+'"'
                code += ']'
            code += ' = '+condition(type(model.value) == str,
                                    '"'+str(model.value)+'"', str(model.value))
            try:
                exec(code, globals(), locals())
            except KeyError:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Path {model.path} not found.'}
            server.get('campaigns.campaigns', sid).update()
            server.store(sid)
            return server.get('campaigns.campaigns', sid).to_dict()
        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result': f'You are not a dm of campaign {sid}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.post('/{sid}/maps/{mid}/modify/')
async def add_map(sid: str, mid: str, model: ModifyModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or server.connections[fp].user in server.get('campaigns.campaigns', sid).dms:
            if mid in server.get('campaigns.campaigns', sid).maps:
                code = f'server.get("campaigns.maps",mid).{model.path.split(".")[0]}'
                for i in model.path.split('.')[1:]:
                    code += '['
                    try:
                        code += str(int(i))
                    except ValueError:
                        code += '"'+str(i)+'"'
                    code += ']'
                code += ' = '+condition(type(model.value) == str,
                                        '"'+str(model.value)+'"', str(model.value))
                try:
                    exec(code, globals(), locals())
                except KeyError:
                    response.status_code = status.HTTP_404_NOT_FOUND
                    return {'result': f'Path {model.path} not found.'}
                server.get('campaigns.maps', mid).update()
                server.store(sid)
                server.store(mid)
                return server.get('campaigns.maps', mid).to_dict()
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find map {mid} in campaign {sid}.'}
        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result': f'You are not a dm of campaign {sid}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.post('/{sid}/maps/{mid}/objects/add/')
async def add_object(sid: str, mid: str, model: AddObjectModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or server.connections[fp].user in server.get('campaigns.campaigns', sid).dms or model.object_type in ALLOWED_PLAYER_OBJECTS:
            if mid in server.get('campaigns.campaigns', sid).maps:
                new_object = {
                    'type': model.object_type,
                    'id': generate_id(),
                    'position': {
                        'x': model.x,
                        'y': model.y
                    },
                    'data': model.data.copy()
                }
                server.get('campaigns.maps',
                           mid).objects[new_object['id']] = new_object
                server.get('campaigns.maps', mid).update()
                server.store(sid)
                server.store(mid)
                return {'result': 'Success.', 'oid': new_object['id']}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find map {mid} in campaign {sid}.'}
        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result': f'You are not a dm of campaign {sid}, and the object was not in the list of allowed objects: {str(ALLOWED_PLAYER_OBJECTS)}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.post('/{sid}/maps/{mid}/objects/{oid}/delete')
async def delete_object(sid: str, mid: str, oid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            if oid in server.get('campaigns.maps', mid).objects.keys():
                if (
                    server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or
                    server.connections[fp].user in server.get('campaigns.campaigns', sid).dms or
                    server.get(
                        'campaigns.maps', mid).objects[oid]['type'] in ALLOWED_PLAYER_OBJECTS
                ):
                    del server.get('campaigns.maps', mid).objects[oid]
                    server.get('campaigns.maps', mid).update()
                    server.store(sid)
                    server.store(mid)
                    return {'result': 'Success.'}
                else:
                    response.status_code = status.HTTP_403_FORBIDDEN
                    return {'result': f'You are not a dm of campaign {sid}, and the object was not in the list of allowed objects: {str(ALLOWED_PLAYER_OBJECTS)}'}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find object {oid} in map {mid}.'}
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.post('/{sid}/maps/{mid}/objects/{oid}/move/')
async def move_object(sid: str, mid: str, oid: str, model: MoveObjectModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            if oid in server.get('campaigns.maps', mid).objects.keys():
                if (
                    server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or
                    server.connections[fp].user in server.get('campaigns.campaigns', sid).dms or
                    server.get(
                        'campaigns.maps', mid).objects[oid]['type'] in ALLOWED_PLAYER_OBJECTS
                ):
                    server.get('campaigns.maps', mid).objects[oid]['position'] = {
                        'x': model.x,
                        'y': model.y
                    }
                    server.get('campaigns.maps', mid).update()
                    server.store(sid)
                    server.store(mid)
                    return {'result': 'Success.'}
                else:
                    response.status_code = status.HTTP_403_FORBIDDEN
                    return {'result': f'You are not a dm of campaign {sid}, and the object was not in the list of allowed objects: {str(ALLOWED_PLAYER_OBJECTS)}'}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find object {oid} in map {mid}.'}
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}


@router.post('/{sid}/maps/{mid}/objects/{oid}/modify/')
async def modify_object(sid: str, mid: str, oid: str, model: ModifyModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            if oid in server.get('campaigns.maps', mid).objects.keys():
                if (
                    server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or
                    server.connections[fp].user in server.get('campaigns.campaigns', sid).dms or
                    server.get(
                        'campaigns.maps', mid).objects[oid]['type'] in ALLOWED_PLAYER_OBJECTS
                ):
                    code = f'server.get("campaigns.maps",mid).objects["{oid}"]["data"]'
                    for i in model.path.split('.'):
                        code += '['
                        try:
                            code += str(int(i))
                        except ValueError:
                            code += '"'+str(i)+'"'
                        code += ']'
                    code += ' = '+condition(type(model.value) == str,
                                            '"'+str(model.value)+'"', str(model.value))
                    try:
                        exec(code, globals(), locals())
                    except KeyError:
                        response.status_code = status.HTTP_404_NOT_FOUND
                        return {'result': f'Path {model.path} not found.'}
                    server.get('campaigns.maps', mid).update()
                    server.store(sid)
                    server.store(mid)
                    return {'result': 'Success.'}
                else:
                    response.status_code = status.HTTP_403_FORBIDDEN
                    return {'result': f'You are not a dm of campaign {sid}, and the object was not in the list of allowed objects: {str(ALLOWED_PLAYER_OBJECTS)}'}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find object {oid} in map {mid}.'}
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.post('/{sid}/critterdb/new/')
async def add_bestiary(sid: str, model: AddBestiaryModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or server.connections[fp].user in server.get('campaigns.campaigns', sid).dms:
            _url = model.url.replace(':443','').replace('/#','')
            
            url_data = uparse.urlparse(_url)
            if url_data.netloc != 'critterdb.com':
                response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
                return {'result': 'Must be a critterdb.com URL.'}
            try:
                c_type = url_data.path.split('/')[1]
                item_id = url_data.path.split('/')[3]
            except:
                response.status_code = status.HTTP_406_NOT_ACCEPTABLE
                return {'result': 'Malformed URL'}
            if not c_type in ['bestiary','publishedbestiary']:
                response.status_code = status.HTTP_406_NOT_ACCEPTABLE
                return {'result': 'Malformed URL'}
            try:
                if c_type == 'bestiary':
                    name, crts = get_bestiary_creatures(item_id)
                    to_add = {}
                    for c in crts:
                        cid = fingerprint()
                        to_add[cid] = {
                            'id': cid,
                            'bestiary': {
                                'id': item_id,
                                'name': name,
                                'type': c_type
                            },
                            'data': c.to_dict()
                        }
                    
                    for c in to_add.keys():
                        found = False
                        for i in server.get('campaigns.campaigns',sid).homebrew_creatures.keys():
                            if server.get('campaigns.campaigns',sid).homebrew_creatures[i]['data']['name'] == to_add[c]['data']['name'] and server.get('campaigns.campaigns',sid).homebrew_creatures[i]['bestiary']['id'] == to_add[c]['bestiary']['id']:
                                found = True
                                to_add[c]['id'] = i
                                server.get('campaigns.campaigns',sid).homebrew_creatures[i] = copy.deepcopy(to_add[c])
                        if not found:
                            server.get('campaigns.campaigns',sid).homebrew_creatures[c] = copy.deepcopy(to_add[c])
                else:
                    name, crts = get_published_bestiary_creatures(item_id)
                    to_add = {}
                    for c in crts:
                        cid = fingerprint()
                        to_add[cid] = {
                            'id': cid,
                            'bestiary': {
                                'id': item_id,
                                'name': name,
                                'type': c_type
                            },
                            'data': c.to_dict()
                        }
                    
                    for c in to_add.keys():
                        found = False
                        for i in server.get('campaigns.campaigns',sid).homebrew_creatures.keys():
                            if server.get('campaigns.campaigns',sid).homebrew_creatures[i]['data']['name'] == to_add[c]['data']['name'] and server.get('campaigns.campaigns',sid).homebrew_creatures[i]['bestiary']['id'] == to_add[c]['bestiary']['id']:
                                found = True
                                to_add[c]['id'] = i
                                server.get('campaigns.campaigns',sid).homebrew_creatures[i] = copy.deepcopy(to_add[c])
                        if not found:
                            server.get('campaigns.campaigns',sid).homebrew_creatures[c] = copy.deepcopy(to_add[c])
                
                server.store(sid)
                server.get('campaigns.campaigns', sid).update('homebrews')
                server.get('campaigns.campaigns', sid).update()
                return {'result':'Success.'}
            except requests.HTTPError:
                response.status_code = status.HTTP_406_NOT_ACCEPTABLE
                return {'result': 'Malformed URL'}

        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result': f'You are not a DM of campaign {sid}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.post('/{sid}/critterdb/{hid}/delete/')
async def delete_bestiary(sid: str, hid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or server.connections[fp].user in server.get('campaigns.campaigns', sid).dms:
            for i in list(server.get('campaigns.campaigns', sid).homebrew_creatures.keys()):
                if server.get('campaigns.campaigns', sid).homebrew_creatures[i]['bestiary']['id'] == hid:
                    del server.get('campaigns.campaigns', sid).homebrew_creatures[i]
                
            server.store(sid)
            server.get('campaigns.campaigns', sid).update('homebrews')
            server.get('campaigns.campaigns', sid).update()
            return {'result':'Success.'}

        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result': f'You are not a DM of campaign {sid}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.post('/{sid}/critterdb/{hid}/reload/')
async def reload_bestiary(sid: str, hid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user or server.connections[fp].user in server.get('campaigns.campaigns', sid).dms:
            b_type = None
            for i in list(server.get('campaigns.campaigns', sid).homebrew_creatures.keys()):
                if server.get('campaigns.campaigns', sid).homebrew_creatures[i]['bestiary']['id'] == hid:
                    b_type = server.get('campaigns.campaigns', sid).homebrew_creatures[i]['bestiary']['type']
                    del server.get('campaigns.campaigns', sid).homebrew_creatures[i]
            if b_type == None:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find bestiary {hid}.'}
            
            try:
                if b_type == 'bestiary':
                    name, crts = get_bestiary_creatures(hid)
                    to_add = {}
                    for c in crts:
                        cid = fingerprint()
                        to_add[cid] = {
                            'id': cid,
                            'bestiary': {
                                'id': hid,
                                'name': name,
                                'type': b_type
                            },
                            'data': c.to_dict()
                        }
                    
                    for c in to_add.keys():
                        found = False
                        for i in server.get('campaigns.campaigns',sid).homebrew_creatures.keys():
                            if server.get('campaigns.campaigns',sid).homebrew_creatures[i]['data']['name'] == to_add[c]['data']['name'] and server.get('campaigns.campaigns',sid).homebrew_creatures[i]['bestiary']['id'] == to_add[c]['bestiary']['id']:
                                found = True
                                to_add[c]['id'] = i
                                server.get('campaigns.campaigns',sid).homebrew_creatures[i] = copy.deepcopy(to_add[c])
                        if not found:
                            server.get('campaigns.campaigns',sid).homebrew_creatures[c] = copy.deepcopy(to_add[c])
                else:
                    name, crts = get_published_bestiary_creatures(hid)
                    to_add = {}
                    for c in crts:
                        cid = fingerprint()
                        to_add[cid] = {
                            'id': cid,
                            'bestiary': {
                                'id': hid,
                                'name': name,
                                'type': b_type
                            },
                            'data': c.to_dict()
                        }
                    
                    for c in to_add.keys():
                        found = False
                        for i in server.get('campaigns.campaigns',sid).homebrew_creatures.keys():
                            if server.get('campaigns.campaigns',sid).homebrew_creatures[i]['data']['name'] == to_add[c]['data']['name'] and server.get('campaigns.campaigns',sid).homebrew_creatures[i]['bestiary']['id'] == to_add[c]['bestiary']['id']:
                                found = True
                                to_add[c]['id'] = i
                                server.get('campaigns.campaigns',sid).homebrew_creatures[i] = copy.deepcopy(to_add[c])
                        if not found:
                            server.get('campaigns.campaigns',sid).homebrew_creatures[c] = copy.deepcopy(to_add[c])
                
                server.store(sid)
                server.get('campaigns.campaigns', sid).update('homebrews')
                server.get('campaigns.campaigns', sid).update()
                return {'result':'Success.'}
            except requests.HTTPError:
                response.status_code = status.HTTP_406_NOT_ACCEPTABLE
                return {'result': 'Malformed URL'}

        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result': f'You are not a DM of campaign {sid}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.get('/{sid}/npcs')
async def search_npcs(sid: str, q: str, response: Response, limit: Optional[int] = Query(100), fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    q = q.strip('?')
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        results = []
        for i in server.get('campaigns.campaigns',sid).homebrew_creatures.values():
            if i['data']['name'].lower() in q.lower() or q.lower() in i['data']['name'].lower():
                x = copy.deepcopy(i)
                x['data']['homebrew'] = True
                results.append(x['data'])
            if len(results) >= limit:
                return results
        results.extend(search_static(q,endpoint='monsters'))
        if len(results) > limit:
            results = results[:limit]
        return results
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.post('/{sid}/maps/{mid}/initiative/add/')
async def add_init(sid: str, mid: str, model: InitiativeModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            if model.oid in server.get("campaigns.maps",mid).objects.keys():
                if model.oid in server.get("campaigns.maps",mid).initiative['combatants'].values():
                    for i in list(server.get("campaigns.maps",mid).initiative['combatants'].keys()):
                        if server.get("campaigns.maps",mid).initiative['combatants'][i] == model.oid:
                            _roll = i
                            break
                    return {'result':'Success', 'initiative':{
                        'roll':int(_roll),
                        'position':sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()),reverse=True).index(_roll),
                        'active':server.get("campaigns.maps",mid).initiative['current'] == _roll
                    }}
                else:
                    if server.get("campaigns.maps",mid).objects[model.oid]['type'] == 'npc':
                        init_mod = get_mod(server.get("campaigns.maps",mid).objects[model.oid]['data']['data']['abilities']['dexterity']['score_base'])
                    elif server.get("campaigns.maps",mid).objects[model.oid]['type'] == 'npc_basic':
                        init_mod = 0
                    elif server.get("campaigns.maps",mid).objects[model.oid]['type'] == 'character':
                        dex_ab = server.get('characters',server.get("campaigns.maps",mid).objects[model.oid]['data']['char_id']).abilities['dexterity']
                        init_mod = get_mod(dex_ab['score_base'] + sum(dex_ab['score_mod']) + dex_ab['score_manual_mod'])
                    else:
                        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
                        return {'result': f'Cannot add object of type {server.get("campaigns.maps",mid).objects[model.oid]["type"]} to initiative.'}
                    roll = random.random()*20 + init_mod
                    server.get("campaigns.maps",mid).initiative['combatants'][roll] = model.oid
                    server.get('campaigns.maps', mid).update()
                    server.store(sid)
                    server.store(mid)
                    return {'result':'Success', 'initiative':{
                        'roll':int(roll),
                        'position':sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()),reverse=True).index(roll),
                        'active':server.get("campaigns.maps",mid).initiative['current'] == roll
                    }}
                    
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find object {model.oid} on map {mid} in campaign {sid}.'}
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.post('/{sid}/maps/{mid}/initiative/remove/')
async def remove_init(sid: str, mid: str, model: InitiativeModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            if model.oid in server.get("campaigns.maps",mid).objects.keys():
                if model.oid in server.get("campaigns.maps",mid).initiative['combatants'].values():
                    for i in list(server.get("campaigns.maps",mid).initiative['combatants'].keys()):
                        if server.get("campaigns.maps",mid).initiative['combatants'][i] == model.oid:
                            _roll = i
                            break
                    if server.get("campaigns.maps",mid).initiative['current'] == _roll:
                        if sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()), reverse=True).index(_roll) == len(list(server.get("campaigns.maps",mid).initiative['combatants'].keys())) - 1:
                            server.get("campaigns.maps",mid).initiative['current'] = sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()),reverse=True)[0]
                        else:
                            server.get("campaigns.maps",mid).initiative['current'] = sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()), reverse=True)[sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()), reverse=True).index(_roll)+1]
                    del server.get("campaigns.maps",mid).initiative['combatants'][_roll]
                    if len(server.get("campaigns.maps",mid).initiative['combatants'].keys()) == 0:
                        server.get("campaigns.maps",mid).initiative['active'] = False
                        server.get("campaigns.maps",mid).initiative['current'] = None
                    server.get('campaigns.maps', mid).update()
                    server.store(sid)
                    server.store(mid)
                    return {'result':'Success'}
                else:
                    response.status_code = status.HTTP_404_NOT_FOUND
                    return {'result': f'Object {model.oid} not in initiative of map {mid} in campaign {sid}.'}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find object {model.oid} on map {mid} in campaign {sid}.'}
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.post('/{sid}/maps/{mid}/initiative/skip_to/')
async def skip_to_init(sid: str, mid: str, model: InitiativeModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            if model.oid in server.get("campaigns.maps",mid).objects.keys():
                if model.oid in server.get("campaigns.maps",mid).initiative['combatants'].values():
                    if not server.get("campaigns.maps",mid).initiative['active']:
                        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
                        return {'result': f'Initiative is not yet active.'}
                    for i in list(server.get("campaigns.maps",mid).initiative['combatants'].keys()):
                        if server.get("campaigns.maps",mid).initiative['combatants'][i] == model.oid:
                            _roll = i
                            break
                    server.get("campaigns.maps",mid).initiative['current'] = _roll
                    server.get('campaigns.maps', mid).update()
                    server.store(sid)
                    server.store(mid)
                    return {'result':'Success'}
                else:
                    response.status_code = status.HTTP_404_NOT_FOUND
                    return {'result': f'Object {model.oid} not in initiative of map {mid} in campaign {sid}.'}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': f'Could not find object {model.oid} on map {mid} in campaign {sid}.'}
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.post('/{sid}/maps/{mid}/initiative/next/')
async def next_init(sid: str, mid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            if server.get("campaigns.maps",mid).initiative['active']:
                if sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()), reverse=True).index(server.get("campaigns.maps",mid).initiative['current']) == len(list(server.get("campaigns.maps",mid).initiative['combatants'].keys())) - 1:
                    server.get("campaigns.maps",mid).initiative['current'] = sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()),reverse=True)[0]
                else:
                    server.get("campaigns.maps",mid).initiative['current'] = sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()), reverse=True)[sorted(list(server.get("campaigns.maps",mid).initiative['combatants'].keys()), reverse=True).index(server.get("campaigns.maps",mid).initiative['current'])+1]
                server.get('campaigns.maps', mid).update()
                server.store(sid)
                server.store(mid)
                return server.get("campaigns.maps",mid).initiative
            else:
                response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
                return {'result': f'Initiative is not yet active.'}
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.post('/{sid}/maps/{mid}/initiative/start/')
async def start_init(sid: str, mid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            if not server.get("campaigns.maps",mid).initiative['active'] and len(server.get("campaigns.maps",mid).initiative['combatants']) > 0:
                server.get("campaigns.maps",mid).initiative['active'] = True
                server.get("campaigns.maps",mid).initiative['current'] = sorted(list(server.get("campaigns.maps",mid).initiative['combatants']), reverse=True)[0]
            server.get('campaigns.maps', mid).update()
            server.store(sid)
            server.store(mid)
            return server.get("campaigns.maps",mid).initiative
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}

@router.post('/{sid}/maps/{mid}/initiative/stop/')
async def stop_init(sid: str, mid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if sid in server.get('users', server.connections[fp].user).campaigns:
        if mid in server.get('campaigns.campaigns', sid).maps:
            server.get("campaigns.maps",mid).initiative['active'] = False
            server.get("campaigns.maps",mid).initiative['current'] = None
            server.get("campaigns.maps",mid).initiative['combatants'] = {}
            server.get('campaigns.maps', mid).update()
            server.store(sid)
            server.store(mid)
            return {'result':'Success'}
        else:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': f'Could not find map {mid} in campaign {sid}.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Could not find campaign {sid}.'}