from fastapi import APIRouter, Header, Response, status
from typing import Optional
from common import *
from api import *

router = APIRouter()

@router.post('/keepalive/')
async def keepalive(response: Response, fp: Optional[str] = Header(None)):
    if fp == 'requesting':
        fp = fingerprint()
        return {
            'timestamp':time.time(),
            'runtime':CONFIG['runtime'],
            'updates':server.update_connection(fp),
            'new_fp':fp
        }
    if fp == 'null':
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'Must have a session fingerprint to access API.'}
    if len(fp) != 43:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {'result':f'Invalid fingerprint. Must be of length 43, recieved fingerprint "{fp}" with length {str(len(fp))}'}
    return {
        'timestamp':time.time(),
        'runtime':CONFIG['runtime'],
        'updates':server.update_connection(fp)
    }
    
