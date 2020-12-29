from api.Py5e.common import *

class Level(BaseObject):
    def __init__(self,level,xp,class_string,classes):
        super().__init__()
        self.class_list = classes
        self.level = level
        self.xp = xp
    def __call__(self, *args, **kwds):
        return self.class_list

class ValueItem(BaseObject):
    def __init__(self,base,_min,_max,current=None,base_min=None,base_max=None):
        super().__init__()
        self.current = condition(current!=False,current,base) # Current value with modifiers
        self.base = base # Base value
        self.min = _min # Minimum value
        self.base_min = condition(base_min!=False,base_min,_min) # Base minimum
        self.max = _max # Maximum value
        self.base_max = condition(base_max!=False,base_max,_max) # Base maximum
    
    @classmethod
    def from_elements(cls,current,base,_min,base_min,_max,base_max):
        return cls(base,_min,_max,current=current,base_min=base_min,base_max=base_max)

class HitPoints(ValueItem):
    def __init__(self, base, _min, _max, thp, current=None, base_min=None, base_max=None):
        super().__init__(base, _min, _max, current=current, base_min=base_min, base_max=base_max)
        self.temporary = thp
    
    @classmethod
    def from_elements(cls,current,base,_min,base_min,_max,base_max,thp):
        return cls(base,_min,_max,thp,current=current,base_min=base_min,base_max=base_max)

INPUTS = [
    'name',
    'alignment',
    'creature_type', # {'type':'humanoid/etc','tags':['shapechanger','demon',etc]}
    'proficiency_bonus',
    'speeds', # dict {'speed name':'speed',...}
    'max_hp',
    'scores', # dict of 'ability name':[score(int),save_proficient(bool),advantage/none/disadvantage(1/0/-1),(optional)value]
    'skills', # dict of 'skill name':[proficient(bool),expert(bool),advantage/none/disadvantage(1/0/-1),(optional)value]
    'senses', # dict {'sense name':'distance',...}
    'immunities', # list of {'type':'damage type', 'flags':['magical','adamantine',etc]}
    'resistances', # list of {'type':'damage type', 'flags':['magical','adamantine',etc]}
    'vulnerabilities', # list of {'type':'damage type', 'flags':['magical','adamantine',etc]}
    'condition_immunities'
]

def _get_mod_from_score(score):
    return int((score-10)/2)

class Creature(BaseObject):
    @classmethod
    def creature_from_parameters(
        cls,
        name=None,
        alignment=None,
        size=None,
        creature_type=None,
        proficiency_bonus=None,
        speeds=None,
        max_hp=None,
        armor_class=None,
        scores=None,
        skills=None,
        senses={},
        immunities=[],
        resistances=[],
        vulnerabilities=[],
        condition_immunities=[],
        languages=[]
    ):
        abilities = {}
        for i in scores.keys():
            if len(scores[i]) == 4:
                save_override = scores[i][3]
            else:
                save_override = None
            abilities[i] = {
                'score':int(scores[i][0]),
                'score_base':int(scores[i][0]),
                'save_proficient':bool(scores[i][1]),
                'save_advantage':int(scores[i][2]),
                'save_override':save_override
            }
        
        _skills = {}
        for i in SKILLS.keys():
            if i in skills.keys():
                if len(skills[i]) == 4:
                    override = True
                    value = skills[i][3]
                else:
                    override = False
                    value = sum([
                        _get_mod_from_score(abilities[SKILLS[i]]['score']),
                        condition(skills[i][0],proficiency_bonus,0),
                        condition(skills[i][1] and skills[i][0],proficiency_bonus,0)
                    ])
                _skills[i] = {
                    'ability':SKILLS[i],
                    'proficient':bool(skills[i][0]),
                    'expert':bool(skills[i][1]),
                    'advantage':int(skills[i][2]),
                    'value':value,
                    'override':override
                }
            else:
                _skills[i] = {
                    'ability':SKILLS[i],
                    'proficient':False,
                    'expert':False,
                    'advantage':0,
                    'value':_get_mod_from_score(abilities[SKILLS[i]]['score']),
                    'override':False
                }
        
        _speeds = {i:ValueItem(speeds[i],0,None).to_dict() for i in speeds.keys()}
        max_hp = HitPoints(max_hp,0,max_hp,0).to_dict()
        armor_class = ValueItem(armor_class,0,None).to_dict()

        dct = {
            'name':name,
            'alignment':alignment,
            'size':size,
            'creature_type':creature_type['type'],
            'tags':creature_type['tags'],
            'proficiency_bonus':proficiency_bonus,
            'speeds':_speeds,
            'hit_points':max_hp,
            'armor_class':armor_class,
            'abilities':abilities,
            'skills':_skills,
            'senses':senses,
            'immunities':immunities,
            'resistances':resistances,
            'vulnerabilities':vulnerabilities,
            'condition_immunities':condition_immunities,
            'languages':languages,
            'effects':[],
            'conditions':[]
        }
        return dct
    
    @classmethod
    def from_parameters(
        cls,
        name=None,
        alignment=None,
        size=None,
        creature_type=None,
        proficiency_bonus=None,
        speeds=None,
        max_hp=None,
        armor_class=None,
        scores=None,
        skills=None,
        senses={},
        immunities=[],
        resistances=[],
        vulnerabilities=[],
        condition_immunities=[],
        languages=[]
    ):
        return cls(cls.creature_from_parameters(
            name=name,
            alignment=alignment,
            size=size,
            creature_type=creature_type,
            proficiency_bonus=proficiency_bonus,
            speeds=speeds,
            max_hp=max_hp,
            armor_class=armor_class,
            scores=scores,
            skills=skills,
            senses=senses,
            immunities=immunities,
            resistances=resistances,
            vulnerabilities=vulnerabilities,
            condition_immunities=condition_immunities,
            languages=languages
        ))

    def __init__(self,dct):
        super().__init__()

        name = dct['name']
        alignment = dct['alignment']
        size = dct['size']
        creature_type = dct['creature_type']
        tags = dct['tags']
        proficiency_bonus = dct['proficiency_bonus']
        speeds = dct['speeds']
        hp = dct['hit_points']
        armor_class = dct['armor_class']
        scores = dct['abilities']
        skills = dct['skills']
        senses = dct['senses']
        immunities = dct['immunities']
        resistances = dct['resistances']
        vulnerabilities = dct['vulnerabilities']
        condition_immunities = dct['condition_immunities']

        self.name = name
        self.alignment = alignment
        self.size = size
        
        self.creature_type = creature_type
        self.tags = tags

        self.proficiency_bonus = proficiency_bonus
        self.speeds = {i:ValueItem.from_elements(
            speeds[i]['current'],
            speeds[i]['base'],
            speeds[i]['min'],
            speeds[i]['base_min'],
            speeds[i]['max'],
            speeds[i]['base_max']
        ) for i in speeds.keys()}

        self.hit_points = HitPoints.from_elements(
            hp['current'],
            hp['base'],
            hp['min'],
            hp['base_min'],
            hp['max'],
            hp['base_max'],
            hp['temporary']
        )
        self.armor_class = ValueItem.from_elements(
            armor_class['current'],
            armor_class['base'],
            armor_class['min'],
            armor_class['base_min'],
            armor_class['max'],
            armor_class['base_max']
        )

        self.abilities = scores
        self.skills = skills
        
        self.senses = senses
        self.languages = dct['languages']

        self.immunities = [i for i in immunities if i['type'] in DAMAGETYPES and all([x in DAMAGEFLAGS for x in i['flags']])]
        self.resistances = [i for i in resistances if i['type'] in DAMAGETYPES and all([x in DAMAGEFLAGS for x in i['flags']])]
        self.vulnerabilities = [i for i in vulnerabilities if i['type'] in DAMAGETYPES and all([x in DAMAGEFLAGS for x in i['flags']])]
        self.condition_immunities = [i for i in condition_immunities if i in CONDITIONS]

        self.effects = dct['effects']
        self.conditions = dct['conditions']
    
    def get_modifier(self,skill_or_ability,ability_override='',save=False):
        if skill_or_ability in ABILITIES:
            if save:
                if self.abilities[skill_or_ability]['save_override'] != None:
                    return int(self.abilities[skill_or_ability]['save_override'])
                else:
                    return int((self.abilities[skill_or_ability]['score']-10)/2)+condition(self.abilities[skill_or_ability]['save_proficient'],self.proficiency_bonus,0)
            else:
                return int((self.abilities[skill_or_ability]['score']-10)/2)
        elif skill_or_ability in SKILLS.keys():
            if self.skills[skill_or_ability]['override']:
                return self.skills[skill_or_ability]['value']
            else:
                if ability_override in ABILITIES:
                    ability = ability_override
                else:
                    ability = self.skills[skill_or_ability]['ability']
                self.skills[skill_or_ability]['value'] = sum([
                    self.get_modifier(ability),
                    condition(self.skills[skill_or_ability]['proficient'],self.proficiency_bonus,0),
                    condition(self.skills[skill_or_ability]['expert'] and self.skills[skill_or_ability]['proficient'],self.proficiency_bonus,0)
                ])
                return self.skills[skill_or_ability]['value']
        else:
            raise KeyError(f'Skill or ability "{skill_or_ability}" not found.')
    
    def check(self,skill_or_ability,ability_override='',advantage_override=0):
        check = self.get_modifier(skill_or_ability,ability_override=ability_override)
        return d20.roll('d20'+condition(check>0,'+','')+condition(check==0,'',str(check)),advantage=condition(advantage_override in [-1,0,1],advantage_override,0)).total
    
    def save(self,ability,advantage_override=0):
        save = self.get_modifier(ability,save=True)
        return d20.roll('d20'+condition(save>0,'+','')+condition(save==0,'',str(save)),advantage=condition(advantage_override in [-1,0,1],advantage_override,0)).total
    
    def initiative(self):
        check = self.get_modifier('dexterity')
        return d20.roll('d20'+condition(check>0,'+','')+condition(check==0,'',str(check))).total
    
    def take_attack(self,atk,adv=0):
        if atk.automated:
            attack = d20.roll('d20'+condition(atk.bonus>=0,'+'+str(atk.bonus),str(atk.bonus)),advantage=adv).total
            if attack >= self.armor_class.current:
                for damage in atk.damages:
                    if len(damage['type'].split(':')) > 1:
                        flags = damage['type'].split(':')[1:]
                    else:
                        flags = ['nonmagical']
                    dtype = damage['type'].split(':')[0]
                    
                    dmod = 1
                    for i in self.immunities:
                        if i['type'] == dtype:
                            if len(i['flags']) > 0:
                                for x in i['flags']:
                                    if x in flags or (x.startswith('!') and not x in flags):
                                        dmod = 0
                                        break
                            else:
                                dmod = 0
                            break
                    
                    for i in self.resistances:
                        if i['type'] == dtype:
                            if len(i['flags']) > 0:
                                for x in i['flags']:
                                    if x in flags or (x.startswith('!') and not x in flags):
                                        dmod = 0.5
                                        break
                            else:
                                dmod = 0.5
                            break
                    
                    for i in self.vulnerabilities:
                        if i['type'] == dtype:
                            if len(i['flags']) > 0:
                                for x in i['flags']:
                                    if x in flags or (x.startswith('!') and not x in flags):
                                        dmod = 2
                                        break
                            else:
                                dmod = 2
                            break
                    
                    self.hit_points.current -= d20.roll(damage['roll']).total*dmod
        else:
            return
        
class Action(BaseObject):
    def __init__(self,dct):
        super().__init__()
        self.automated = dct['automated']
        self.damages = dct['damages']
        self.name = dct['name']
        self.desc = dct['desc']
        self.bonus = dct['bonus']
        self.type = dct['type']
        self.range = dct['range']
    
    @classmethod
    def from_open5e_damage(cls,ddct):
        try:
            desc = ddct['desc']
            _type = desc.split(' Attack: ')[0]
            _range = desc.split(' Attack: ')[1].split('. Hit: ')[0].split(', ')[1].split(' ')[1]
            if '/' in _range:
                _range = [int(i) for i in _range.split('/')]
            else:
                _range = int(_range)
            
            damage = []
            for d in split_on(desc.split('. Hit: ')[1],[' plus ',' and ']):
                parts = split_on(d,[' (',') '])
                damage.append({
                    'average':int(parts[0]),
                    'roll':parts[1].replace(' ',''),
                    'type':[x for x in DAMAGETYPES if x in d.split(' ')][0]
                })

            return cls({
                'automated':True,
                'damages':damage,
                'name':ddct['name'],
                'desc':ddct['desc'],
                'bonus':ddct['attack_bonus'],
                'type':_type,
                'range':_range
            })
        except:
            return cls({
                'automated':False,
                'damages':[],
                'name':ddct['name'],
                'desc':ddct['desc'],
                'bonus':0,
                'type':'',
                'range':0
            })
    @classmethod
    def from_critterdb_damage(cls,ddct):
        try:
            desc = ddct['description'].replace('<i>','').replace('</i>','')
            _type = desc.split(' Attack: ')[0]
            _range = desc.split(' Attack: ')[1].split('. Hit: ')[0].split(', ')[1].split(' ')[1]
            bonus = int(desc.split(' Attack: ')[1].split('. Hit: ')[0].split(', ')[0].split(' ')[0].strip('+ '))
            if '/' in _range:
                _range = [int(i) for i in _range.split('/')]
            else:
                _range = int(_range)
            
            damage = []
            for d in split_on(desc.split('. Hit: ')[1],[' plus ',' and ']):
                parts = split_on(d,[' (',') '])
                damage.append({
                    'average':int(parts[0]),
                    'roll':parts[1].replace(' ',''),
                    'type':[x for x in DAMAGETYPES if x in d.split(' ')][0]
                })

            return cls({
                'automated':True,
                'damages':damage,
                'name':ddct['name'],
                'desc':desc,
                'bonus':bonus,
                'type':_type,
                'range':_range
            })
        except:
            return cls({
                'automated':False,
                'damages':[],
                'name':ddct['name'],
                'desc':ddct['description'].replace('<i>','').replace('</i>',''),
                'bonus':0,
                'type':'',
                'range':0
            })