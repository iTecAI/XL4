from pydantic import BaseModel

class UserLoginModel(BaseModel):
    username: str
    passhash: str