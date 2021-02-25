from fastapi import APIRouter, Header, Response, status
from typing import Optional

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
        return cmp
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
async def add_map(sid: str, mid: str, model: AddObjectModel, response: Response, fp: Optional[str] = Header(None)):
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
async def add_map(sid: str, mid: str, oid: str, response: Response, fp: Optional[str] = Header(None)):
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
async def add_map(sid: str, mid: str, oid: str, model: MoveObjectModel, response: Response, fp: Optional[str] = Header(None)):
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
async def add_map(sid: str, mid: str, oid: str, model: ModifyModel, response: Response, fp: Optional[str] = Header(None)):
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
