from common import *
from fastapi import FastAPI, Response, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import *
import sys, uvicorn
import logging

logger = logging.getLogger('uvicorn.error')

# Endpoints
from endpoints.server import router as server_router
from endpoints.user import router as user_router
from endpoints.compendium import router as comp_router

app = FastAPI()

# Routers
logger.info('Setting routers.')
app.include_router(
    server_router,
    prefix='/server',
    tags=['server']
)
app.include_router(
    user_router,
    prefix='/user',
    tags=['user']
)
app.include_router(
    comp_router,
    prefix='/compendium',
    tags=['compendium']
)

@app.get('/', include_in_schema=False)
async def get_compendium():
    return FileResponse(os.path.join('client','index.html'))


logger.info('Loading static files.')
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
    uvicorn.run('main:app',host=CONFIG['runtime']['ip'],port=CONFIG['runtime']['port'],log_level='debug',access_log=False)
