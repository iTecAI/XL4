from api import *
import requests
import os, json

monsters = []
current = 'https://api.open5e.com/monsters/'
while current != None:
    dat = requests.get(current).json()
    print(current)
    current = dat['next']
    for i in dat['results']:
        d = NPC.from_open5e(i).to_dict()
        d['slug'] = i['slug']
        monsters.append(d)

with open(os.path.join('api','static','monsters.json'),'w') as f:
    json.dump(monsters,f,indent=4)

items = []
current = 'https://api.open5e.com/magicitems/'
while current != None:
    dat = requests.get(current).json()
    print(current)
    current = dat['next']
    items.extend(dat['results'])

with open(os.path.join('api','static','magicitems.json'),'w') as f:
    json.dump(items,f,indent=4)

sections = []
current = 'https://api.open5e.com/sections/'
while current != None:
    dat = requests.get(current).json()
    print(current)
    current = dat['next']
    sections.extend(dat['results'])

with open(os.path.join('api','static','sections.json'),'w') as f:
    json.dump(sections,f,indent=4)

conditions = []
current = 'https://api.open5e.com/conditions/'
while current != None:
    dat = requests.get(current).json()
    print(current)
    current = dat['next']
    conditions.extend(dat['results'])

with open(os.path.join('api','static','conditions.json'),'w') as f:
    json.dump(conditions,f,indent=4)
