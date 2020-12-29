import random
import d20
import json

from googleapiclient.discovery import build
from google.oauth2 import service_account

class BaseObject:
    def __init__(self):
        pass
    def to_dict(self):
        tld = {}
        svars = vars(self)
        for key in svars.keys():
            if type(svars[key]) == dict:
                tld[key] = self._loop_dict(svars[key])
            elif type(svars[key]) in [list,tuple,set]:
                tld[key] = self._loop_list(list(svars[key]))
            elif type(svars[key]) in [str,int,bool]:
                tld[key] = svars[key]
            else:
                try:
                    if issubclass(type(svars[key]),BaseObject):
                        tld[key] = svars[key].to_dict()
                    else:
                        tld[key] = svars[key]
                except TypeError:
                    tld[key] = svars[key]
        return tld
    def _loop_dict(self,dct):
        tld = {}
        for k in dct.keys():
            if type(dct[k]) == dict:
                tld[k] = self._loop_dict(dct[k])
            elif type(dct[k]) in [list,tuple,set]:
                tld[k] = self._loop_list(list(dct[k]))
            else:
                try:
                    if issubclass(type(dct[k]),BaseObject):
                        tld[k] = dct[k].to_dict()
                    else:
                        tld[k] = dct[k]
                except TypeError:
                    tld[k] = dct[k]
        return tld
    def _loop_list(self,lst):
        tld = []
        for i in lst:
            if type(i) == dict:
                tld.append(self._loop_dict(i))
            elif type(i) in [list,tuple,set]:
                tld.append(self._loop_list(list(i)))
            else:
                try:
                    if issubclass(type(i),BaseObject):
                        tld.append(i.to_dict())
                    else:
                        tld.append(i)
                except TypeError:
                    tld.append(i)
        return tld


SKILLS = {
    'acrobatics':'dexterity',
    'animal_handling':'wisdom',
    'arcana':'intelligence',
    'athletics':'strength',
    'deception':'charisma',
    'history':'intelligence',
    'insight':'wisdom',
    'intimidation':'charisma',
    'investigation':'intelligence',
    'medicine':'wisdom',
    'nature':'intelligence',
    'perception':'wisdom',
    'performance':'charisma',
    'persuasion':'charisma',
    'religion':'intelligence',
    'sleight_of_hand':'dexterity',
    'stealth':'dexterity',
    'survival':'wisdom'
}

DAMAGETYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']

CONDITIONS = ['blinded','charmed','deafened','fatigued','frightened','grappled','incapacitated','invisible','paralyzed','petrified','poisoned','prone','restrained','stunned','unconscious','exhaustion']

CASTERS = ['bard','cleric','druid','paladin','ranger','sorcerer','warlock','wizard']

ABILITIES = ['strength','dexterity','constitution','intelligence','wisdom','charisma']

DAMAGEFLAGS = ['magical','nonmagical','silvered','adamantine']

SPELLCASTING = {"full caster": [{"spells": [2,0,0,0,0,0,0,0,0]},{"spells": [3,0,0,0,0,0,0,0,0]},{"spells": [4,2,0,0,0,0,0,0,0]},{"spells": [4,3,0,0,0,0,0,0,0]},{"spells": [4,3,2,0,0,0,0,0,0]},{"spells": [4,3,3,0,0,0,0,0,0]},{"spells": [4,3,3,1,0,0,0,0,0]},{"spells": [4,3,3,2,0,0,0,0,0]},{"spells": [4,3,3,3,1,0,0,0,0]},{"spells": [4,3,3,3,2,0,0,0,0]},{"spells": [4,3,3,3,2,1,0,0,0]},{"spells": [4,3,3,3,2,1,0,0,0]},{"spells": [4,3,3,3,2,1,1,0,0]},{"spells": [4,3,3,3,2,1,1,0,0]},{"spells": [4,3,3,3,2,1,1,1,0]},{"spells": [4,3,3,3,2,1,1,1,0]},{"spells": [4,3,3,3,2,1,1,1,1]},{"spells": [4,3,3,3,2,1,1,1,1]},{"spells": [4,3,3,3,2,2,1,1,1]},{"spells": [4,3,3,3,2,2,2,1,1]}],"half caster": [{"spells": [0,0,0,0,0]},{"spells": [2,0,0,0,0]},{"spells": [3,0,0,0,0]},{"spells": [3,0,0,0,0]},{"spells": [4,2,0,0,0]},{"spells": [4,2,0,0,0]},{"spells": [4,3,0,0,0]},{"spells": [4,3,0,0,0]},{"spells": [4,3,2,0,0]},{"spells": [4,3,2,0,0]},{"spells": [4,3,3,0,0]},{"spells": [4,3,3,0,0]},{"spells": [4,3,3,1,0]},{"spells": [4,3,3,1,0]},{"spells": [4,3,3,2,0]},{"spells": [4,3,3,2,0]},{"spells": [4,3,3,3,1]},{"spells": [4,3,3,3,1]},{"spells": [4,3,3,3,2]},{"spells": [4,3,3,3,2]}],"third caster": [{"spells": [0,0,0,0]},{"spells": [0,0,0,0]},{"spells": [2,0,0,0]},{"spells": [3,0,0,0]},{"spells": [3,0,0,0]},{"spells": [3,0,0,0]},{"spells": [4,2,0,0]},{"spells": [4,2,0,0]},{"spells": [4,2,0,0]},{"spells": [4,3,0,0]},{"spells": [4,3,0,0]},{"spells": [4,3,0,0]},{"spells": [4,3,2,0]},{"spells": [4,3,2,0]},{"spells": [4,3,2,0]},{"spells": [4,3,3,0]},{"spells": [4,3,3,0]},{"spells": [4,3,3,0]},{"spells": [4,3,3,1]},{"spells": [4,3,3,1]}],"pact magic": [{"spells": [1,0,0,0,0]},{"spells": [2,0,0,0,0]},{"spells": [0,2,0,0,0]},{"spells": [0,2,0,0,0]},{"spells": [0,0,2,0,0]},{"spells": [0,0,2,0,0]},{"spells": [0,0,0,2,0]},{"spells": [0,0,0,2,0]},{"spells": [0,0,0,0,2]},{"spells": [0,0,0,0,2]},{"spells": [0,0,0,0,3]},{"spells": [0,0,0,0,3]},{"spells": [0,0,0,0,3]},{"spells": [0,0,0,0,3]},{"spells": [0,0,0,0,3]},{"spells": [0,0,0,0,3]},{"spells": [0,0,0,0,4]},{"spells": [0,0,0,0,4]},{"spells": [0,0,0,0,4]},{"spells": [0,0,0,0,4]}],"multiclass": [{"spells": [2,0,0,0,0,0,0,0,0]},{"spells": [3,0,0,0,0,0,0,0,0]},{"spells": [4,2,0,0,0,0,0,0,0]},{"spells": [4,3,0,0,0,0,0,0,0]},{"spells": [4,3,2,0,0,0,0,0,0]},{"spells": [4,3,3,0,0,0,0,0,0]},{"spells": [4,3,3,1,0,0,0,0,0]},{"spells": [4,3,3,2,0,0,0,0,0]},{"spells": [4,3,3,3,1,0,0,0,0]},{"spells": [4,3,3,3,2,0,0,0,0]},{"spells": [4,3,3,3,2,1,0,0,0]},{"spells": [4,3,3,3,2,1,0,0,0]},{"spells": [4,3,3,3,2,1,1,0,0]},{"spells": [4,3,3,3,2,1,1,0,0]},{"spells": [4,3,3,3,2,1,1,1,0]},{"spells": [4,3,3,3,2,1,1,1,0]},{"spells": [4,3,3,3,2,1,1,1,1]},{"spells": [4,3,3,3,2,1,1,1,1]},{"spells": [4,3,3,3,2,2,1,1,1]},{"spells": [4,3,3,3,2,2,2,1,1]}]}

ABILITY_MAP = {'str':'strength','dex':'dexterity','con':'constitution','int':'intelligence','wis':'wisdom','cha':'charisma','none':None}

def condition(test,t,f):
    if test:
        return t
    else:
        return f
    
def split_on(string,seps):
    ret = string.split(seps.pop())
    for sep in seps:
        nret = []
        for item in ret:
            nret.extend([i for i in item.split(sep)])
        ret = nret[:]
    return ret

def get_gapi(path,scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']): # From https://developers.google.com/sheets/api/quickstart/python
    creds = service_account.Credentials.from_service_account_file(path, scopes=scopes)
    return build('sheets', 'v4', credentials=creds)