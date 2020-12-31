from fastapi import APIRouter, Header, Response, status
from typing import Optional

from starlette.status import HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND, HTTP_409_CONFLICT
from common import *
from api import *
from models import *
import hashlib
import logging

logger = logging.getLogger('uvicorn.error')

router = APIRouter()

@router.post('/keepalive/')
async def keepalive(response: Response, fp: Optional[str] = Header(None)):
    if fp == 'requesting':
        fp = fingerprint()
        logger.debug(f'User has requested a fingerprint. Assigned to {fp}.')
        updates, uid = server.update_connection(fp)
        return {
            'timestamp':time.time(),
            'runtime':CONFIG['runtime'],
            'updates':updates,
            'uid':uid,
            'new_fp':fp
        }
    if fp == 'null':
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Must have a session fingerprint to access API.'}
    if len(fp) != 43:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {'result':f'Invalid fingerprint. Must be of length 43, recieved fingerprint "{fp}" with length {str(len(fp))}'}
    updates, uid = server.update_connection(fp)
    return {
        'timestamp':time.time(),
        'runtime':CONFIG['runtime'],
        'updates':updates,
        'uid':uid
    }

@router.post('/signup/')
async def signup(user: UserLoginModel, response: Response, fp: Optional[str] = Header(None)):
    if fp == 'null' or fp == None:
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Must have a session fingerprint to access API.'}
    if len(fp) != 43:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {'result':f'Invalid fingerprint. Must be of length 43, recieved fingerprint "{fp}" with length {str(len(fp))}'}
    if not server.check_connection(fp):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Unknown session fingerprint'}
    with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
        lock = json.load(f)
    if user.username in lock['user_map'].keys():
        response.status_code = status.HTTP_409_CONFLICT
        return {'result':'User already exists. Please login.'}
    obj = server.add_object(User({
        'connection':fp,
        'username':user.username,
        'passhash':user.passhash
    }))['object']
    server.connections[fp].user = obj.id
    updates, uid = server.update_connection(fp)
    logger.debug(f'Client @ {fp} has created a new account with ID {uid} and username {user.username}.')
    return {
        'result':'Success',
        'userid':obj.id,
        'updates':updates
    }

@router.post('/login/')
async def login(user: UserLoginModel, response: Response, fp: Optional[str] = Header(None)):
    if fp == 'null' or fp == None:
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Must have a session fingerprint to access API.'}
    if len(fp) != 43:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {'result':f'Invalid fingerprint. Must be of length 43, recieved fingerprint "{fp}" with length {str(len(fp))}'}
    if not server.check_connection(fp):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Unknown session fingerprint'}
    
    with open(os.path.join(*CONFIG['session_lock'].split('/')),'r') as f:
        lock = json.load(f)
    if user.username in lock['user_map'].keys():
        if sensitive.get_password_check_hash(server.get('users',lock['user_map'][user.username]).passhash,fp) == user.passhash:
            server.connections[fp].user = lock['user_map'][user.username]
            updates, uid = server.update_connection(fp)
            logger.debug(f'Client @ {fp} has logged in to user {user.username} [{uid}]')
            return {
                'result':'Success',
                'userid':uid,
                'updates':updates
            }
        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result':'Incorrect password.'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result':f'User with username "{user.username}" not found.'}

@router.post('/logout/')
async def logout(response: Response, fp: Optional[str] = Header(None)):
    if fp == 'null' or fp == None:
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Must have a session fingerprint to access API.'}
    if len(fp) != 43:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {'result':f'Invalid fingerprint. Must be of length 43, recieved fingerprint "{fp}" with length {str(len(fp))}'}
    if not server.check_connection(fp):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Unknown session fingerprint'}
    server.connections[fp].user = None
    updates, uid = server.update_connection(fp)
    logger.debug(f'Client @ {fp} has logged out.')
    return {
        'result':'Success',
        'userid':uid,
        'updates':updates
    }
