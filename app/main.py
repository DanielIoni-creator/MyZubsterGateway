from fastapi import FastAPI

from app.api.seed_exchange import router as seed_exchange_router
from app.api.seed_exchange_export import router as seed_exchange_export_router
# other imports ...

app = FastAPI(title="MyZubster Gateway")

# include existing routers
app.include_router(seed_exchange_router)
# include the new export router
app.include_router(seed_exchange_export_router)

# any additional startup / shutdown events ...
