import hashlib, time, random, base64, json
import logging

logger = logging.getLogger('uvicorn.error')

def fingerprint(): # Long unique fingerprint
    return base64.urlsafe_b64encode(bytes.fromhex(hashlib.sha256(str(time.time()+random.random()).encode('utf-8')).hexdigest())).decode().strip().strip('=')

def generate_id(l=12): # Shorter unique (probably) fingerprint with length {l}
    return ''.join([random.choice(
        list(base64.urlsafe_b64encode(bytes.fromhex(hashlib.sha256(str(time.time()+random.random()).encode('utf-8')).hexdigest())).decode().strip().strip('='))
    ) for i in range(l)])

def error(dct,key,default):
    try:
        return dct[key]
    except KeyError as e:
        return default