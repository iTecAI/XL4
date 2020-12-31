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

@router.get('/{category}/')
async def get_category(category: str, search: Optional[str] = ''):
    return search_static(search,endpoint=category,exclude=[])

@router.get('/')
async def get_all(search: Optional[str] = ''):
    return search_static(search)

@router.post('/categories/')
async def get_categories(model: CategoriesModel, search: Optional[str] = ''):
    return search_static(search,endpoint=model.cats,exclude=[])