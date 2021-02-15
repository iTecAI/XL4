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

class CharacterModifyModel(BaseModel):
    path: str
    value: Any

class CharacterBatchModifyModel(BaseModel):
    items: dict

class NewCampaignModel(BaseModel):
    name: str