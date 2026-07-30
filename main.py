from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from motor import motor_asyncio
from jose import jwt
import os
import bcrypt

app = FastAPI()

# Define the garden data model
class GardenData(BaseModel):
    gardenId: str
    ph: float
    ec: float
    temperature: float
    humidity: float

# Define the authentication model
class GardenAuth(BaseModel):
    gardenId: str
    password: str

# Define the secret key for JWT encryption
SECRET_KEY = "mysecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Initialize the MongoDB client
client = motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
# Create a database object
db = client['garden_data']
# Create a collection object
collection = db['data']

# Define the OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Function to verify password
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)

# Function to get password hash
def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# Authentication route
@app.post('/token', response_model=dict)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    garden = await collection.find_one({'gardenId': form_data.username})
    if not garden:
        raise HTTPException(
            status_code=401,
            detail="Incorrect gardenId or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(form_data.password, garden['password']):
        raise HTTPException(
            status_code=401,
            detail="Incorrect gardenId or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": garden['gardenId']}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, "token_type": "bearer"
    }

# Function to create access token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Protected route with JWT authentication
@app.post('/api/garden/data')
async def create_garden_data(garden_data: GardenData, token: str = Depends(oauth2_scheme)):
    try:
        # Verify the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        garden_id = payload.get('sub')
        if garden_id != garden_data.gardenId:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized gardenId",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Save the data to MongoDB
        await collection.insert_one(garden_data.dict())
        return {"message": "Data saved successfully"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Access token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Protected route to get historical data
@app.get('/api/garden/{garden_id}/stats')
async def get_garden_stats(garden_id: str, token: str = Depends(oauth2_scheme)):
    try:
        # Verify the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if garden_id != payload.get('sub'):
            raise HTTPException(
                status_code=401,
                detail="Unauthorized gardenId",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Get the historical data from MongoDB
        data = await collection.find({"gardenId": garden_id}).to_list(length=100)
        return data
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Access token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )