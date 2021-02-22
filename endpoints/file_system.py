from fastapi import APIRouter, Header, Response, status
from typing import Optional
from starlette.responses import FileResponse

from starlette.status import HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND, HTTP_405_METHOD_NOT_ALLOWED, HTTP_409_CONFLICT
from common import *
from api import *
from models import *
import hashlib
import logging
import urllib.parse as uparse
from w3lib.url import parse_data_uri

logger = logging.getLogger('uvicorn.error')

router = APIRouter()

@router.get('/{endpoint}/{filename}/')
def get_file(endpoint: str, filename: str, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    if not endpoint in ALLOWED_FS_ENDPOINTS:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result':f'Endpoint {endpoint} is invalid for FS access. Use one of {str(ALLOWED_FS_ENDPOINTS)}'}
    
    try:
        metadata = server.get(endpoint+'.meta',filename)
    except KeyError:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result':f'File with name {filename} at endpoint {endpoint} not found.'}
    
    if (
        server.connections[fp].user in metadata.can_access['user'] or
        any([server.connections[fp].user in server.get('campaigns.campaigns', i).players for i in metadata.can_access['campaign_participant']]) or
        any([server.connections[fp].user in server.get('campaigns.campaigns', i).dms for i in metadata.can_access['campaign_dm']])
    ):
        return FileResponse(get_raw_path(endpoint+'.raw', filename + '.' + metadata.ext))
    else:
        response.status_code = status.HTTP_403_FORBIDDEN
        return {'result':f'You do not access to the file at {endpoint}.{filename}'}

@router.post('/{endpoint}/')
def post_file(endpoint: str, model: FSPostModel, response: Response, fp: Optional[str] = Header(None)):
    response, res = fingerprint_validate(fp,response)
    if res != 0:
        return res
    if server.connections[fp].user == None:
        response.status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        return {'result':'Must be logged in.'}
    if not endpoint in ALLOWED_FS_ENDPOINTS:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {'result':f'Endpoint {endpoint} is invalid for FS access. Use one of {str(ALLOWED_FS_ENDPOINTS)}'}
    
    data = parse_data_uri(model.uri)
    new_meta = FileSystemMeta({'id': fingerprint(), 'ext': data.media_type.split('/')[1], 'can_access': model.permissions})
    with get_raw(endpoint+'.raw', new_meta.id + '.' + new_meta.ext, mode='wb') as f:
        f.write(data.data)
    
    server.add_object(new_meta)
    return {
        'result':'Success',
        'id':new_meta.id
    }
    

