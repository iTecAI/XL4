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


@router.get('/')
async def get_characters(response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    return server.get('users', server.connections[fp].user).characters


@router.get('/expanded/')
async def get_characters(response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    return {i: server.get('characters', i) for i in server.get('users', server.connections[fp].user).characters}


@router.get('/{sid}/')
async def get_specific_character(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if not sid in server.get('users', server.connections[fp].user).characters:
        try:
            ochar = server.get('characters', sid)
            if ochar.campaign != None:
                try:
                    cmp = server.get('campaigns.campaigns', ochar.campaign)
                    if not server.connections[fp].user == cmp.owner and not server.connections[fp].user in cmp.dms:
                        response.status_code = status.HTTP_404_NOT_FOUND
                        return {'result': 'Could not find that character.'}
                except KeyError:
                    response.status_code = status.HTTP_404_NOT_FOUND
                    return {'result': 'Could not find that character.'}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': 'Could not find that character.'}
        except KeyError:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': 'Could not find that character.'}
    return {
        'character': server.get('characters', sid).to_dict(),
        'dynamic': {
            'initiative': server.get('characters', sid).get_init_bonus()
        }
    }


@router.post('/batchGet/')
async def get_batch_chars(model: GetCharsBatchModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}

    characters = {}
    failures = []
    for sid in model.ids:
        if not sid in server.get('users', server.connections[fp].user).characters:
            try:
                ochar = server.get('characters', sid)
                if ochar.campaign != None:
                    try:
                        cmp = server.get('campaigns.campaigns', ochar.campaign)
                        if not server.connections[fp].user == cmp.owner and not server.connections[fp].user in cmp.dms and not server.connections[fp].user in cmp.players:
                            failures.append(sid)
                        else:
                            characters[sid] = {
                                'character': server.get('characters', sid).to_dict(),
                                'dynamic': {
                                    'initiative': server.get('characters', sid).get_init_bonus()
                                }
                            }
                    except KeyError:
                        failures.append(sid)
                else:
                    failures.append(sid)
            except KeyError:
                failures.append(sid)
        else:
            characters[sid] = {
                'character': server.get('characters', sid).to_dict(),
                'dynamic': {
                    'initiative': server.get('characters', sid).get_init_bonus()
                }
            }
    return {
        'characters': characters,
        'failed_to_retrieve': failures
    }


@router.post('/new/')
async def new_character(model: NewCharacterModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if CONFIG['user_restrictions'][server.get('users', server.connections[fp].user).user_type]['max_characters'] <= len(server.get('users', server.connections[fp].user).characters):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result': 'You have too many characters. Maximum allowed: '+str(CONFIG['user_restrictions'][server.get('users', server.connections[fp].user).user_type]['max_characters'])}
    if model.ctype == 'gsheet2.1':
        sid = uparse.urlparse(model.url).path.split('/')[3]
        obj = XLCharacter.from_gsheet(sid, copath(CONFIG['gapi']))
    else:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Invalid character type.'}
    obj.owner = server.get('users', server.connections[fp].user).id
    server.add_object(obj)
    server.get('users', server.connections[fp].user).characters.append(obj.id)
    server.store(server.connections[fp].user)
    server.get('users', server.connections[fp].user).update()
    server.get('characters', obj.id).update()
    return {'charid': obj.id, 'character': obj.to_dict()}


@router.post('/{sid}/update/')
async def update_character(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if not sid in server.get('users', server.connections[fp].user).characters:
        try:
            ochar = server.get('characters', sid)
            if ochar.campaign != None:
                try:
                    cmp = server.get('campaigns.campaigns', ochar.campaign)
                    if not server.connections[fp].user == cmp.owner and not server.connections[fp].user in cmp.dms:
                        response.status_code = status.HTTP_404_NOT_FOUND
                        return {'result': 'Could not find that character.'}
                except KeyError:
                    response.status_code = status.HTTP_404_NOT_FOUND
                    return {'result': 'Could not find that character.'}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': 'Could not find that character.'}
        except KeyError:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': 'Could not find that character.'}
    ochar = server.get('characters', sid)
    if ochar.source == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Cannot update this character.'}
    if ochar.source['type'] == 'google_sheet':
        new_obj = XLCharacter.from_gsheet(
            ochar.source['sheet_id'], copath(CONFIG['gapi']))
    else:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Invalid sheet type.'}
    new_obj.id = ochar.id
    new_obj.owner = ochar.owner
    new_obj.campaign = ochar.campaign
    server.loaded_objects[new_obj.id]['object'] = new_obj
    server.store(new_obj.id)
    server.get('users', ochar.owner).update()
    server.get('characters', new_obj.id).update()
    return {'charid': new_obj.id, 'character': new_obj.to_dict()}


@router.post('/{sid}/duplicate/')
async def duplicate_character(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if not sid in server.get('users', server.connections[fp].user).characters:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': 'Could not find that character.'}
    if CONFIG['user_restrictions'][server.get('users', server.connections[fp].user).user_type]['max_characters'] <= len(server.get('users', server.connections[fp].user).characters):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result': 'You have too many characters. Maximum allowed: '+str(CONFIG['user_restrictions'][server.get('users', server.connections[fp].user).user_type]['max_characters'])}
    dct = server.get('characters', sid).to_dict()
    del dct['id']
    del dct['campaign']
    dct['name'] = 'Copy of '+dct['name']
    obj = XLCharacter(dct)
    server.add_object(obj)
    server.get('users', server.connections[fp].user).characters.append(obj.id)
    server.store(server.connections[fp].user)
    server.get('users', server.connections[fp].user).update()
    server.get('characters', obj.id).update()
    server.get('users', server.connections[fp].user).update(
        endpoint='characters')
    return {'charid': obj.id, 'character': obj.to_dict()}


@router.post('/{sid}/delete/')
async def duplicate_character(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if not sid in server.get('users', server.connections[fp].user).characters:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': 'Could not find that character.'}
    server.delete('characters', sid)
    server.get('users', server.connections[fp].user).characters.remove(sid)
    server.store(server.connections[fp].user)
    server.get('users', server.connections[fp].user).update(
        endpoint='characters')
    return {'result': 'Success.'}


@router.post('/{sid}/modify/')
async def modify_character(sid: str, model: ModifyModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if not sid in server.get('users', server.connections[fp].user).characters:
        try:
            ochar = server.get('characters', sid)
            if ochar.campaign != None:
                try:
                    cmp = server.get('campaigns.campaigns', ochar.campaign)
                    if not server.connections[fp].user == cmp.owner and not server.connections[fp].user in cmp.dms:
                        response.status_code = status.HTTP_404_NOT_FOUND
                        return {'result': 'Could not find that character.'}
                except KeyError:
                    response.status_code = status.HTTP_404_NOT_FOUND
                    return {'result': 'Could not find that character.'}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': 'Could not find that character.'}
        except KeyError:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': 'Could not find that character.'}
    code = f'server.get("characters",sid).{model.path.split(".")[0]}'
    prev = model.path.split('.')[0]
    for i in model.path.split('.')[1:]:
        if i in ['manual_mod', 'mod', 'min', 'max', 'base', 'temporary'] and prev in ['armor_class', 'hit_points', 'walk', 'fly', 'swim', 'climb', 'burrow']:
            code += '.'
            item = True
        else:
            code += '['
            item = False
        prev = i
        if item:
            code += i
        else:
            try:
                code += str(int(i))
            except ValueError:
                code += '"'+str(i)+'"'
        if not item:
            code += ']'
    code += ' = '+condition(type(model.value) == str,
                            '"'+str(model.value)+'"', str(model.value))
    try:
        exec(code, globals(), locals())
    except KeyError:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': f'Path {model.path} not found.'}
    server.get('characters', sid).reprocess()
    server.get('characters', sid).update()
    server.store(sid)
    return server.get('characters', sid).to_dict()


@router.post('/{sid}/batch_modify/')
async def batch_modify_character(sid: str, model: BatchModifyModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if not sid in server.get('users', server.connections[fp].user).characters:
        try:
            ochar = server.get('characters', sid)
            if ochar.campaign != None:
                try:
                    cmp = server.get('campaigns.campaigns', ochar.campaign)
                    if not server.connections[fp].user == cmp.owner and not server.connections[fp].user in cmp.dms:
                        response.status_code = status.HTTP_404_NOT_FOUND
                        return {'result': 'Could not find that character.'}
                except KeyError:
                    response.status_code = status.HTTP_404_NOT_FOUND
                    return {'result': 'Could not find that character.'}
            else:
                response.status_code = status.HTTP_404_NOT_FOUND
                return {'result': 'Could not find that character.'}
        except KeyError:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {'result': 'Could not find that character.'}

    for path in model.items.keys():
        val = model.items[path]

        code = f'server.get("characters",sid).{path.split(".")[0]}'
        prev = path.split('.')[0]
        for i in path.split('.')[1:]:
            if i in ['manual_mod', 'mod', 'min', 'max', 'base', 'temporary'] and prev in ['armor_class', 'hit_points', 'walk', 'fly', 'swim', 'climb', 'burrow']:
                code += '.'
                item = True
            else:
                code += '['
                item = False
            prev = i
            if item:
                code += i
            else:
                try:
                    code += str(int(i))
                except ValueError:
                    code += '"'+str(i)+'"'
            if not item:
                code += ']'
        code += ' = '+condition(type(val) == str, '"'+str(val)+'"', str(val))
        try:
            exec(code, globals(), locals())
        except KeyError:
            pass
    server.get('characters', sid).reprocess()
    server.get('characters', sid).update()
    server.store(sid)
    return server.get('characters', sid).to_dict()


@router.post('/{sid}/join_campaign/{cid}/')
async def join_campaign(sid: str, cid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if not sid in server.get('users', server.connections[fp].user).characters:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': 'Could not find that character.'}
    try:
        server.get('campaigns.campaigns', cid)
    except KeyError:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': 'Could not find that campaign.'}
    server.get('characters', sid).campaign = cid
    server.get('characters', sid).update()
    server.store(sid)
    server.get('campaigns.campaigns', cid).characters.append(sid)
    if not server.connections[fp].user in server.get('campaigns.campaigns', cid).players:
        server.get('campaigns.campaigns', cid).players.append(server.connections[fp].user)
    server.get('campaigns.campaigns', cid).update()
    server.store(cid)
    if not cid in server.get('users', server.connections[fp].user).campaigns:
        server.get('users', server.connections[fp].user).campaigns.append(cid)
        server.store(server.connections[fp].user)
        server.get('users', server.connections[fp].user).update()
    return {'result': f'Successfully joined campaign "{server.get("campaigns.campaigns",cid).name}".'}


@router.post('/{sid}/leave_campaign/')
async def leave_campaign(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp, response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Must be logged in.'}
    if not sid in server.get('users', server.connections[fp].user).characters:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result': 'Could not find that character.'}
    if server.get('characters', sid).campaign == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result': 'Character is not in a campaign'}

    cid = server.get('characters', sid).campaign
    cmp = server.get('campaigns.campaigns', cid)
    try:
        server.get('campaigns.campaigns', cid).characters.remove(sid)
    except ValueError:
        pass
    if not any([i in server.get('users', server.connections[fp].user).characters for i in server.get('campaigns.campaigns', cid).characters]):
        try:
            server.get('campaigns.campaigns', cid).players.remove(sid)
        except ValueError:
            pass
        try:
            server.get('users', server.connections[fp].user).campaigns.remove(cid)
            server.store(server.connections[fp].user)
            server.get('users', server.connections[fp].user).update()
        except ValueError:
            pass
    server.get('characters', sid).campaign = None
    server.get('characters', sid).update()
    server.store(sid)
    server.get('campaigns.campaigns', cmp.id).update()
    server.store(cid)
    return {'result': f'Successfully left campaign "{cmp.name}".'}
