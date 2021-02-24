from pydantic import BaseModel
from typing import Any

class UserLoginModel(BaseModel):
    username: str
    passhash: str

class UserSettingModel(BaseModel):
    value: str

class CategoriesModel(BaseModel):
    cats: list

class NewCharacterModel(BaseModel):
    ctype: str
    url: str

class ModifyModel(BaseModel):
    path: str
    value: Any

class BatchModifyModel(BaseModel):
    items: dict

class NewCampaignModel(BaseModel):
    name: str

class GetCharsBatchModel(BaseModel):
    ids: list

class FSPostModel(BaseModel):
    uri: str
    permissions: dict

class AddMapModel(BaseModel):
    image: str
    dimensions: dict
    name: str

class AddObjectModel(BaseModel):
    object_type: str
    data: dict
    x: float
    y: float

class MoveObjectModel(BaseModel):
    x: float
    y: float