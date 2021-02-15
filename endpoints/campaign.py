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
async def get_campaigns(response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    return {
        'uid': server.connections[fp].user,
        'campaigns': {i: server.get('campaigns.campaigns', i).to_dict() for i in server.get('users',server.connections[fp].user).campaigns}
    }

@router.get('/{sid}/')
async def get_campaign_specific(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    if sid in server.get('users',server.connections[fp].user).campaigns:
        return server.get('campaigns.campaigns', sid).to_dict()
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result':f'Could not find campaign {sid}.'}

@router.post('/new/')
async def new_campaign(model: NewCampaignModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    if CONFIG['user_restrictions'][server.get('users',server.connections[fp].user).user_type]['max_campaigns'] <= len([i for i in server.get('users',server.connections[fp].user).campaigns if server.get('campaigns.campaigns', i).owner == server.connections[fp].user]):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':'You have too many campaigns. Maximum allowed: '+str(CONFIG['user_restrictions'][server.get('users',server.connections[fp].user).user_type]['max_campaigns'])}
    
    obj = Campaign({'owner':server.connections[fp].user,'name':model.name})
    server.add_object(obj)
    server.get('users',server.connections[fp].user).campaigns.append(obj.id)
    server.store(server.connections[fp].user)
    server.get('users',server.connections[fp].user).update()
    server.get('campaigns.campaigns',obj.id).update()
    return {'cmpid':obj.id,'campaign':obj.to_dict()}

@router.post('/{sid}/delete/')
async def delete_campaign(sid: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    if sid in server.get('users',server.connections[fp].user).campaigns:
        if server.get('campaigns.campaigns', sid).owner == server.connections[fp].user:
            server.delete('campaigns.campaigns',sid)
            server.get('users',server.connections[fp].user).campaigns.remove(sid)
            server.store(server.connections[fp].user)
            server.get('users',server.connections[fp].user).update(endpoint='campaigns')
            return {'result':f'Deleted campaign {sid}'}
        else:
            response.status_code = status.HTTP_403_FORBIDDEN
            return {'result':f'You do not own campaign {sid}'}
    else:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result':f'Could not find campaign {sid}.'}