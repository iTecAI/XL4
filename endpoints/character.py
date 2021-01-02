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
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    return server.get('users',server.connections[fp].user).characters

@router.get('/expanded/')
async def get_characters(response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    return {i:server.get('characters',i) for i in server.get('users',server.connections[fp].user).characters}

@router.post('/new/')
async def new_character(model: NewCharacterModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    if model.ctype == 'gsheet2.1':
        sid = uparse.urlparse(model.url).path.split('/')[3]
        obj = XLCharacter.from_gsheet(sid,copath(CONFIG['gapi']))
        server.add_object(obj)
    else:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Invalid character type.'}
    server.get('users',server.connections[fp].user).characters.append(obj.id)
    server.store(server.connections[fp].user)
    server.get('users',server.connections[fp].user).update()
    server.get('characters',obj.id).update()
    return {'charid':obj.id,'character':obj.to_dict()}

@router.post('/{sid}/update/')
async def update_character(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    if not sid in server.get('users',server.connections[fp].user).characters:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result':'Could not find that character.'}
    ochar = server.get('characters',sid)
    if ochar.source == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Cannot update this character.'}
    if ochar.source['type'] == 'google_sheet':
        new_obj = XLCharacter.from_gsheet(ochar.source['sheet_id'],copath(CONFIG['gapi']))
    else:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Invalid sheet type.'}
    new_obj.id = ochar.id
    server.store(new_obj.id)
    server.get('users',server.connections[fp].user).update()
    server.get('characters',new_obj.id).update()
    return {'charid':new_obj.id,'character':new_obj.to_dict()}

    