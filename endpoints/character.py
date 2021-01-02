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

@router.get('/characters')
async def get_characters(response: Response, fp: Optional[str] = Header(None)):
    pass