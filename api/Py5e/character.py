from api.Py5e.common import *
from api.Py5e.creature import *
import os, math

class Character(Creature):
    @classmethod
    def from_parameters(
        cls, 
        name, 
        alignment,
        size,
        creature_type, 
        proficiency_bonus, 
        speeds, 
        max_hp, 
        armor_class, 
        scores, 
        skills, 
        senses, 
        immunities, 
        resistances, 
        vulnerabilities, 
        condition_immunities,
        languages,
        race,
        level,
        background,
        hit_dice,
        equipped,
        proficiencies,
        attacks,
        spellcasting,
        appearance,
        inventory,
        traits,
        attack_info,
        gear_info,
        race_info,
        class_info,
        source=None
    ):
        dct = cls.creature_from_parameters(
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
        )
        dct['race'] = race
        dct['level'] = level
        dct['background'] = background
        dct['hit_dice'] = hit_dice
        dct['equipped'] = equipped
        dct['proficiencies'] = proficiencies
        dct['attacks'] = attacks
        dct['spellcasting'] = spellcasting
        dct['appearance'] = appearance
        dct['inventory'] = inventory
        dct['traits'] = traits
        dct['source'] = source
        dct['attack_info'] = attack_info
        dct['gear_info'] = gear_info
        dct['race_info'] = race_info
        dct['class_info'] = class_info

        return cls(dct)
    
    def __init__(self, dct):
        super().__init__(dct)
        self.race = dct['race']
        self.level = dct['level']
        self.background = dct['background']
        self.hit_dice = dct['hit_dice']
        self.equipped = dct['equipped']
        self.proficiencies = dct['proficiencies']
        self.attacks = dct['attacks']
        self.spellcasting = dct['spellcasting']
        self.appearance = dct['appearance']
        self.inventory = dct['inventory']
        self.traits = dct['traits']
        self.source = dct['source']
        self.attack_info = dct['attack_info']
        self.gear_info = dct['gear_info']
        self.race_info = dct['race_info']
        self.class_info = dct['class_info']
    
    @classmethod
    def from_gsheet(cls,sheet_id,api_path):
        source = {
            'type':'google_sheet',
            'sheet_id':sheet_id
        }

        engine = get_gapi(api_path)

        ranges = {
            'v2.1!c6':'name',
            'v2.1!c15':'abStr',
            'v2.1!c20':'abDex',
            'v2.1!c25':'abCon',
            'v2.1!c30':'abInt',
            'v2.1!c35':'abWis',
            'v2.1!c40':'abCha',
            'v2.1!h17:h22':'saveProfs',
            'v2.1!u16':'hp',
            'v2.1!r12':'ac',
            'v2.1!h25:h42':'skillProfs',
            'v2.1!r25':'hitDice',
            'v2.1!h14':'proficiency',
            'v2.1!t7':'race',
            'v2.1!t5':'classes',
            'v2.1!ae7':'xp',
            'v2.1!al6':'level',
            'v2.1!aj11':'background',
            'v2.1!ae12:ae14':'personalityTraits',
            'v2.1!ae16:ae18':'ideals',
            'v2.1!ae20:ae22':'bonds',
            'v2.1!ae24:ae26':'flaws',
            'v2.1!aj28':'alignment',
            'v2.1!i49':'armorProfs',
            'v2.1!i50':'weaponProfs',
            'v2.1!i51':'vehicleProfs',
            'v2.1!i52':'toolProfs',
            'v2.1!i53':'otherProfs',
            'v2.1!i54':'otherSpeeds',
            'v2.1!z12':'speed',
            'v2.1!r45:r56':'languages',
            'v2.1!ac45:ac56':'equippedItems',
            'v2.1!c59:n84':'traits0',
            'v2.1!p59:aa84':'traits1',
            'v2.1!ac59:an84':'traits2',
            'additional!t69:t79':'resistances',
            'additional!ab69:ab79':'immunities',
            'additional!ai69:ai79':'vulnerabilities',
            'v2.1!n96:n98':'spell0-0',
            'v2.1!x96:x98':'spell0-1',
            'v2.1!ah96:ah98':'spell0-2',
            'v2.1!d100:d104':'spell1-0',
            'v2.1!n100:n104':'spell1-1',
            'v2.1!x100:x104':'spell1-2',
            'v2.1!n106:n110':'spell2-0',
            'v2.1!x106:x110':'spell2-1',
            'v2.1!ah106:ah110':'spell2-2',
            'v2.1!d112:d116':'spell3-0',
            'v2.1!n112:n116':'spell3-1',
            'v2.1!x112:x116':'spell3-2',
            'v2.1!n118:n122':'spell4-0',
            'v2.1!x118:x122':'spell4-1',
            'v2.1!ah118:ah122':'spell4-2',
            'v2.1!d123:d126':'spell5-0',
            'v2.1!n123:n126':'spell5-1',
            'v2.1!x123:x126':'spell5-2',
            'v2.1!n128:n131':'spell6-0',
            'v2.1!x128:x131':'spell6-1',
            'v2.1!ah128:ah131':'spell6-2',
            'v2.1!d133:d135':'spell7-0',
            'v2.1!n133:n135':'spell7-1',
            'v2.1!x133:x135':'spell7-2',
            'v2.1!n137:n139':'spell8-0',
            'v2.1!x137:x139':'spell8-1',
            'v2.1!ah137:ah139':'spell8-2',
            'v2.1!d141:d143':'spell9-0',
            'v2.1!n141:n143':'spell9-1',
            'v2.1!x141:x143':'spell9-2',
            'v2.1!c148':'age',
            'v2.1!f148':'height',
            'v2.1!i148':'weight',
            'v2.1!l148':'size',
            'v2.1!c150':'gender',
            'v2.1!f150':'eyes',
            'v2.1!i150':'hair',
            'v2.1!l150':'skin',
            'v2.1!c176':'appearance',
            'v2.1!r147:r162':'alliesOrganizations',
            'v2.1!i176':'symbolUrl',
            'v2.1!r165:r177':'backstory',
            'inventory!d3':'coinCp',
            'inventory!d6':'coinSp',
            'inventory!d9':'coinEp',
            'inventory!d12':'coinGp',
            'inventory!d15':'coinPp',
            "'attack info'!b7:ao201":'attackInfo',
            "'gear info'!b7:ao201":'gearInfo',
            "'race info'!b7:ao201":'raceInfo',
            "'class info'!b7:ao201":'classInfo',
            'v2.1!r32:r36':'attacks'
        }
        [ranges.__setitem__('v2.1!p'+str(i+17),ABILITIES[i]+'SaveAdv') for i in range(6)]
        [ranges.__setitem__('v2.1!p'+str(i+25),list(SKILLS.keys())[i]+'SkillAdv') for i in range(18)]
        [ranges.__setitem__('inventory!i'+str(i+3),'inventoryCount'+str(i)) for i in range(74)]
        [ranges.__setitem__('inventory!j'+str(i+3),'inventory'+str(i)) for i in range(74)]
        [ranges.__setitem__('inventory!r'+str(i+3),'inventoryCost'+str(i)) for i in range(74)]
        [ranges.__setitem__('inventory!u'+str(i+3),'inventoryWeight'+str(i)) for i in range(74)]
        [ranges.__setitem__('inventory!z'+str(i+3),'inventoryCount'+str(i+74)) for i in range(74)]
        [ranges.__setitem__('inventory!aa'+str(i+3),'inventory'+str(i+74)) for i in range(74)]
        [ranges.__setitem__('inventory!ai'+str(i+3),'inventoryCost'+str(i+74)) for i in range(74)]
        [ranges.__setitem__('inventory!al'+str(i+3),'inventoryWeight'+str(i+74)) for i in range(74)]

        vals = engine.spreadsheets().values().batchGet(spreadsheetId=sheet_id,ranges=list(ranges.keys()),valueRenderOption='UNFORMATTED_VALUE').execute().get('valueRanges',[])
        [i.__setitem__('values',[]) for i in vals if not 'values' in i.keys()]
        preloaded = {ranges[x['range'].lower()]:x['values'] for x in vals}
        for k in preloaded.keys():
            for i in range(2):
                if len(preloaded[k]) == 1:
                    preloaded[k] = preloaded[k][0]
            if type(preloaded[k]) == list:
                for i in range(len(preloaded[k])):
                    if type(preloaded[k][i]) == list and len(preloaded[k][i]) == 1:
                        preloaded[k][i] = preloaded[k][i][0]
            if type(preloaded[k]) == str:
                try:
                    preloaded[k] = int(preloaded[k])
                except ValueError:
                    pass
            if preloaded[k] == [] or preloaded[k] == '-':
                preloaded[k] = None
        
        listify = [
            'equippedItems','languages','traits0','traits1','traits2','resistances','immunities','vulnerabilities',
            'spell0-0','spell0-1','spell0-2','spell1-0','spell1-1','spell1-2','spell2-0','spell2-1','spell2-2',
            'spell3-0','spell3-1','spell3-2','spell4-0','spell4-1','spell4-2','spell5-0','spell5-1','spell5-2',
            'spell6-0','spell6-1','spell6-2','spell7-0','spell7-1','spell7-2','spell8-0','spell8-1','spell8-2',
            'spell9-0','spell9-1','spell9-2'
        ]
        for k in listify:
            if type(preloaded[k]) != list:
                preloaded[k] = [preloaded[k]]
            if preloaded[k] == [None]:
                preloaded[k] = []
        for k in ['attackInfo','gearInfo','raceInfo','classInfo']:
            new = []
            for i in preloaded[k]:
                _new = []
                for d in i:
                    if not d == '':
                        _new.append(d)
                if len(_new) > 0:
                    if _new[0] != '':
                        new.append(_new)
            preloaded[k] = new[:]
        
        for s in range(10):
            new = []
            for c in range(3):
                new.extend(preloaded[f'spell{str(s)}-{str(c)}'])
                del preloaded[f'spell{str(s)}-{str(c)}']
            preloaded[f'spell{str(s)}'] = new[:]
        traits = []
        [traits.extend(preloaded['traits'+str(c)]) for c in range(3)]
        del preloaded['traits0']
        del preloaded['traits1']
        del preloaded['traits2']
        preloaded['traits'] = traits[:]

        inventory = []
        for i in range(148):
            if preloaded['inventory'+str(i)] != None:
                inventory.append({
                    'name':preloaded['inventory'+str(i)],
                    'quantity':preloaded['inventoryCount'+str(i)],
                    'cost':preloaded['inventoryCost'+str(i)],
                    'weight':preloaded['inventoryWeight'+str(i)]
                })
            del preloaded['inventory'+str(i)]
            del preloaded['inventoryCount'+str(i)]
            del preloaded['inventoryCost'+str(i)]
            del preloaded['inventoryWeight'+str(i)]
        
        preloaded['inventory'] = inventory[:]

        newInfo = []
        cats = ['name','damage','type','proficiency_category','range_class','monk_weapon','enchant_bonus','bonus_damage','bonus_type','ability_override','properties','apply_mod']
        for item in preloaded['attackInfo']:
            d = {cats[i]:condition(item[i]=='-',None,item[i]) for i in range(len(item))}
            if d['name'] != 0:
                newInfo.append(d)
        preloaded['attackInfo'] = newInfo[:]
        newInfo = []
        cats = ['name','ac_bonus','max_dex','category','required_str','stealth_mod','enchantment_bonus','proficiency_bonus','skills_bonus','saves_bonus','properties']
        for item in preloaded['gearInfo']:
            newInfo.append({cats[i]:condition(item[i]=='-',None,item[i]) for i in range(len(item))})
        preloaded['gearInfo'] = newInfo[:]
        newInfo = []
        cats = ['name','scores','armor','speed','hp_bonus','resist_immune_vuln','languages','attacks','weapon_armor_profs','other_proficiencies']
        for item in preloaded['raceInfo']:
            newInfo.append({cats[i]:condition(item[i]=='-',None,item[i]) for i in range(len(item))})
        preloaded['raceInfo'] = newInfo[:]
        newInfo = []
        cats = ['name','subclass','alt_ac','hit_die','init_bonus','bonus_hp','saves_skills','first_level_profs','multiclass_profs','spell_type','spell_ability','speed_increase']
        for item in preloaded['classInfo']:
            newInfo.append({cats[i]:condition(item[i]=='-',None,item[i]) for i in range(len(item))})
        preloaded['classInfo'] = newInfo[:]

        preloaded['personalityTraits'] = ''.join(condition(preloaded['personalityTraits']==None,[],preloaded['personalityTraits'])).strip()
        preloaded['ideals'] = ''.join(condition(preloaded['ideals']==None,[],preloaded['ideals'])).strip()
        preloaded['bonds'] = ''.join(condition(preloaded['bonds']==None,[],preloaded['bonds'])).strip()
        preloaded['flaws'] = ''.join(condition(preloaded['flaws']==None,[],preloaded['flaws'])).strip()
        if type(preloaded['alliesOrganizations']) == list:
            preloaded['alliesOrganizations'] = ''.join(preloaded['alliesOrganizations']).strip()
        if type(preloaded['backstory']) == list:
            preloaded['backstory'] = ''.join(preloaded['backstory']).strip()
        
        speeds = {}
        if not preloaded['otherSpeeds'] == None:
            speeds = {i.split(' ')[2].lower():int(i.split(' ')[0]) for i in preloaded['otherSpeeds'].split(', ')}
        speeds['walk'] = preloaded['speed']

        scores = {}
        c = 0
        for s in ABILITIES:
            scores[s] = [
                preloaded['ab'+s[0].upper()+s[1:3]],
                bool(preloaded['saveProfs'][c]),
                condition(
                    preloaded[s+'SaveAdv']=='adv',
                    1,condition(
                        preloaded[s+'SaveAdv']=='dis',
                        -1,0
                    )
                )
            ]
            c+=1
        
        skills = {}
        c = 0
        for s in SKILLS.keys():
            skills[s] = [
                preloaded['skillProfs'][c] in [1,'e'],
                preloaded['skillProfs'][c] == 'e',
                condition(
                    preloaded[s+'SkillAdv']=='adv',
                    1,condition(
                        preloaded[s+'SkillAdv']=='dis',
                        -1,0
                    )
                )
            ]
            c+=1
        
        resistances = []
        for i in preloaded['resistances']:
            item = {'type':None,'flags':[]}
            for d in DAMAGETYPES:
                if d in i.lower().split(' '):
                    item['type'] = d
                    break
            for f in DAMAGEFLAGS:
                if f in i.lower().split(' '):
                    if 'aren\'t '+f in i.lower():
                        item['flags'].append('!'+f)
                    else:
                        item['flags'].append(f)
            resistances.append(item)
        immunities = []
        for i in preloaded['immunities']:
            item = {'type':None,'flags':[]}
            for d in DAMAGETYPES:
                if d in i.lower().split(' '):
                    item['type'] = d
                    break
            for f in DAMAGEFLAGS:
                if f in i.lower().split(' '):
                    if 'aren\'t '+f in i.lower():
                        item['flags'].append('!'+f)
                    else:
                        item['flags'].append(f)
            immunities.append(item)
        vulnerabilities = []
        for i in preloaded['vulnerabilities']:
            item = {'type':None,'flags':[]}
            for d in DAMAGETYPES:
                if d in i.lower().split(' '):
                    item['type'] = d
                    break
            for f in DAMAGEFLAGS:
                if f in i.lower().split(' '):
                    if 'aren\'t '+f in i.lower():
                        item['flags'].append('!'+f)
                    else:
                        item['flags'].append(f)
            vulnerabilities.append(item)
        
        classes = []
        csplit = []
        jnr = ''
        for i in preloaded['classes'].split(' '):
            jnr += ' '+i
            if i in [str(c) for c in range(100)]:
                csplit.append(jnr.strip())
                jnr = ''
        if len(jnr) > 0:
            csplit.append(jnr.strip())
        for c in csplit:
            cs = c.split(' ')
            classes.append({
                'class':cs[len(cs)-2].lower(),
                'subclass':condition(len(cs)>2,' '.join(cs[:len(cs)-2]).lower(),None),
                'level':int(cs[len(cs)-1])
            })
        
        sc_classes = []
        for c in classes:
            for i in preloaded['classInfo']:
                if i['name'].lower() == c['class'] or str(i['subclass']).lower() == str(c['subclass']).lower():
                    if i['spell_type'] != None:
                        sc_classes.append({'class':c,'type':i['spell_type'].lower()})
        
        level_casting = {
            'full':0,
            'half':0,
            'third':0,
            'pact':0
        }
        multi = -1
        for c in sc_classes:
            if c['type'] == 'full caster':
                level_casting['full']+=c['class']['level']
                multi += 1
            if c['type'] == 'half caster':
                level_casting['half']+=c['class']['level']
                multi += 1
            if c['type'] == 'third caster':
                level_casting['third']+=c['class']['level']
                multi += 1
            if c['type'] == 'pact magic':
                level_casting['pact']+=c['class']['level']
        spellcasting = {
            'caster_classes':sc_classes,
            'main_casting':condition(multi >= 0,{
                'class':condition(multi > 0,'multiclass',[i['class'] for i in sc_classes if not i['type'] == 'pact_magic'][0]),
                'levels':condition(multi > 0,level_casting['full']+math.floor(level_casting['half']/2)+math.floor(level_casting['third']/3),[i['class']['level'] for i in sc_classes if not i['type'] == 'pact_magic'][0]),
                'slots':SPELLCASTING[condition(multi > 0,'multiclass',[i['type'] for i in sc_classes if not i['type'] == 'pact_magic'][0])][condition(multi > 0,level_casting['full']+math.floor(level_casting['half']/2)+math.floor(level_casting['third']/3),[i['class']['level'] for i in sc_classes if not i['type'] == 'pact_magic'][0])-1]
            },None),
            'pact_magic':condition(level_casting['pact']>0,{
                'levels':level_casting['pact'],
                'slots':SPELLCASTING['pact magic'][level_casting['pact']-1]
            },None),
            'spells':[preloaded['spell'+str(i)] for i in range(10)]
        }
        
        return cls.from_parameters(
            preloaded['name'],
            preloaded['alignment'],
            str(preloaded['size']).lower(),
            {'type':'humanoid','tags':[]},
            preloaded['proficiency'],
            speeds,
            preloaded['hp'],
            preloaded['ac'],
            scores,
            skills,
            [],
            immunities,
            resistances,
            vulnerabilities,
            [],
            preloaded['languages'],
            preloaded['race'],
            {
                'level':preloaded['level'],
                'xp':preloaded['xp'],
                'classes':classes
            },
            {
                'background':preloaded['background'],
                'personality_traits':preloaded['personalityTraits'],
                'ideals':preloaded['ideals'],
                'bonds':preloaded['bonds'],
                'flaws':preloaded['flaws'],
                'allies_and_organizations':preloaded['alliesOrganizations'],
                'symbol':preloaded['symbolUrl'],
                'backstory':preloaded['backstory']
            },
            preloaded['hitDice'].replace(' ',''),
            preloaded['equippedItems'],
            {
                'armor':condition(type(preloaded['armorProfs'])==type(None),[],[x.lower() for x in str(preloaded['armorProfs']).split(', ')]),
                'weapon':condition(type(preloaded['weaponProfs'])==type(None),[],[x.lower() for x in str(preloaded['weaponProfs']).split(', ')]),
                'vehicle':condition(type(preloaded['vehicleProfs'])==type(None),[],[x.lower() for x in str(preloaded['vehicleProfs']).split(', ')]),
                'tool':condition(type(preloaded['toolProfs'])==type(None),[],[x.lower() for x in str(preloaded['toolProfs']).split(', ')]),
                'other':condition(type(preloaded['otherProfs'])==type(None),[],[x.lower() for x in str(preloaded['otherProfs']).split(', ')])
            },
            preloaded['attacks'],
            spellcasting,
            {
                'age':preloaded['age'],
                'height':preloaded['height'],
                'weight':preloaded['weight'],
                'gender':preloaded['gender'],
                'eyes':preloaded['eyes'],
                'hair':preloaded['hair'],
                'image':preloaded['appearance']
            },
            {
                'main':{
                    'display_name':'Main Inventory',
                    'coin':{
                        'cp':condition(preloaded['coinCp']==None,0,preloaded['coinCp']),
                        'sp':condition(preloaded['coinSp']==None,0,preloaded['coinSp']),
                        'ep':condition(preloaded['coinEp']==None,0,preloaded['coinEp']),
                        'gp':condition(preloaded['coinGp']==None,0,preloaded['coinGp']),
                        'pp':condition(preloaded['coinPp']==None,0,preloaded['coinPp'])
                    },
                    'apply_weight':True,
                    'removable':False,
                    'items':preloaded['inventory']
                }
            },
            preloaded['traits'],
            preloaded['attackInfo'],
            preloaded['gearInfo'],
            preloaded['raceInfo'],
            preloaded['classInfo'],
            source=source
        )
    
    def check_feat(self,name):
        for i in self.traits:
            if i.lower() == 'feat: '+name.lower():
                return True
        return False
    def check_trait(self,name):
        for i in self.traits:
            if i.lower() == name.lower():
                return True
        return False
    def get_attack(self,name):
        for i in self.attack_info:
            if i['name'].lower() == name.lower():
                return i
        raise KeyError(f'Attack {name} not found.')
    def get_gear(self,name):
        for i in self.gear_info:
            if i['name'].lower() == name.lower():
                return i
        raise KeyError(f'Gear {name} not found.')
    def get_race(self,name):
        for i in self.race_info:
            if i['name'].lower() == name.lower():
                return i
        raise KeyError(f'Race {name} not found.')
    def get_class(self,name,subclass=None):
        for i in self.class_info:
            if i['name'].lower() == name.lower():
                if str(subclass).lower() == str(i['subclass']).lower():
                    return i
        raise KeyError(f'Class {name} with subclass {subclass} not found.')
    def initiative(self):
        return sum([
            super().initiative(),
            condition(self.check_feat('alert'),5,0),
            sum([condition(self.get_class(i['class'],subclass=i['subclass'])['init_bonus']==None,0,self.get_class(i['class'],subclass=i['subclass'])['init_bonus']) for i in self.level['classes']]),
            condition(self.check_trait('jack of all trades'),int(self.proficiency_bonus/2),0)
        ])
    def check(self, skill_or_ability, ability_override, advantage_override):
        return sum([
            super().check(skill_or_ability, ability_override=ability_override, advantage_override=advantage_override),
            condition(self.check_trait('jack of all trades'),int(self.proficiency_bonus/2),0)
        ])
    def attack(self,attack):
        atk = self.get_attack(attack)
        damage = [
            {
                'average':None,
                'roll':atk['damage']+condition(
                    atk['apply_mod']==1,
                    '+'+str(sum([condition(
                        atk['ability_override'] == None,
                        condition(
                            'finesse' in atk['properties'].lower() or 'ranged' in atk['range_class'].lower(),
                            self.get_modifier('dexterity'),
                            self.get_modifier('strength')
                        ),
                        ABILITY_MAP[str(atk['ability_override']).lower()]
                    ),
                    condition(
                        atk['enchant_bonus']==None,
                        0,
                        int(atk['enchant_bonus'])
                    )])),
                    ''
                ),
                'type':atk['type']
            }
        ]
        if not atk['bonus_damage'] == None:
            damage.append({
                {
                'average':None,
                'roll':atk['bonus_damage'],
                'type':atk['bonus_type']
            }
            })
        
        _range = None
        for item in atk['properties'].lower().split(', '):
            if 'ammunition' in item or 'thrown' in item:
                r = split_on(item,['(range ',')'])[1]
                if '/' in r:
                    _range = [int(i) for i in r.split('/')]
                else:
                    _range = int(r)
                break
        
        blist = [
            condition(
                atk['ability_override'] == None,
                condition(
                    'finesse' in atk['properties'].lower() or 'ranged' in atk['range_class'].lower(),
                    self.get_modifier('dexterity'),
                    self.get_modifier('strength')
                ),
                ABILITY_MAP[str(atk['ability_override']).lower()]
            ),
            condition(
                any([
                    any([any([i in x for x in self.proficiencies['weapon']]) for i in atk['proficiency_category'].lower().split(' or ')]),
                    any([atk['name'].lower() in x for x in self.proficiencies['weapon']])
                ]),
                self.proficiency_bonus,
                0
            ),
            condition(
                atk['enchant_bonus']==None,
                0,
                int(atk['enchant_bonus'])
            )
        ]

        return Action({
            'automated':True,
            'damages':damage,
            'name':atk['name'],
            'desc':atk['properties'],
            'bonus':sum(blist),
            'type':atk['proficiency_category'].lower(),
            'range':_range
        })