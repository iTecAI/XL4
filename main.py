from common import *
from fastapi import FastAPI, Response, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import *
import sys, uvicorn

app = FastAPI()

files = list(os.walk('client'))

slashtype = '/'
aux = '/'
if sys.platform == 'win32':
    slashtype = '\\'
    aux = '\\\\'

web_paths = []
for f in files:
    split_path = f[0].split(slashtype)
    if len(split_path) > 1:
        new_path = '/'.join(split_path[1:])+'/'
    else:
        new_path = ''
    
    dirpath = aux.join(f[0].split(slashtype))

    for fn in f[2]:
        ext = os.path.splitext(fn)[1]
        code = '\n'.join([
            '@app.get("/'+new_path+fn+'", include_in_schema=False)',
            'async def web_'+fn.replace('.','_').replace('-','_').replace(' ','_').replace('\'','').replace('"','')+'():',
            '\treturn FileResponse("'+dirpath+aux+fn+'")'
        ])
        web_paths.append(new_path+fn)
        exec(
            code,
            globals(),
            locals()
        )

@app.get('/api')
async def api_root(response: Response):
    return {
        'timestamp':time.time(),
        'runtime':CONFIG['runtime']
    }

if __name__ == "__main__":
    uvicorn.run('main:app',host=CONFIG['runtime']['ip'],port=CONFIG['runtime']['port'],log_level='info',access_log=False)
