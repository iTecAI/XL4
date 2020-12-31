from fastapi import APIRouter, Header, Response, status
from typing import Optional

from starlette.status import HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND, HTTP_405_METHOD_NOT_ALLOWED, HTTP_409_CONFLICT
from common import *
from api import *
from models import *
import hashlib
import logging

logger = logging.getLogger('uvicorn.error')

router = APIRouter()

@router.post('/settings/{setting}/')
async def settings_post(setting: str, model: UserSettingModel, response: Response, fp: Optional[str] = Header(None)):
    if fp == 'null' or fp == None:
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Must have a session fingerprint to access API.'}
    if len(fp) != 43:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {'result':f'Invalid fingerprint. Must be of length 43, recieved fingerprint "{fp}" with length {str(len(fp))}'}
    if not server.check_connection(fp):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Unknown session fingerprint'}
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in to perform this action.'}
    if not setting in server.get('users',server.connections[fp].user).options.keys():
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result':'Invalid setting name.'}
    server.get('users',server.connections[fp].user).options[setting] = model.value
    server.get('users',server.connections[fp].user).update()
    server.store(server.connections[fp].user)
    return server.get('users',server.connections[fp].user).to_dict()

@router.get('/settings/{setting}/')
async def settings_get(setting: str, response: Response, fp: Optional[str] = Header(None)):
    if fp == 'null' or fp == None:
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Must have a session fingerprint to access API.'}
    if len(fp) != 43:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {'result':f'Invalid fingerprint. Must be of length 43, recieved fingerprint "{fp}" with length {str(len(fp))}'}
    if not server.check_connection(fp):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Unknown session fingerprint'}
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in to perform this action.'}
    if not setting in server.get('users',server.connections[fp].user).options.keys():
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result':'Invalid setting name.'}
    return {'value':server.get('users',server.connections[fp].user).options[setting]}

@router.get('/')
async def user_get(response: Response, fp: Optional[str] = Header(None)):
    if fp == 'null' or fp == None:
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Must have a session fingerprint to access API.'}
    if len(fp) != 43:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {'result':f'Invalid fingerprint. Must be of length 43, recieved fingerprint "{fp}" with length {str(len(fp))}'}
    if not server.check_connection(fp):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Unknown session fingerprint'}
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in to perform this action.'}
    return server.get('users',server.connections[fp].user).to_dict()