import os
import time
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Boolean, create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Complete Database URL from user
DATABASE_URL = "postgresql://neondb_owner:npg_O9kcqlu5QXYb@ep-delicate-poetry-ams5462c-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Increased timeout and pre-ping for Neon
engine = create_engine(
    DATABASE_URL,
    connect_args={"connect_timeout": 30},
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String)
    city = Column(String)
    bill = Column(String)

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    role = Column(String)
    content = Column(String)

# Global App
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LeadCreate(BaseModel):
    name: str
    phone: str
    city: str
    bill: str

class ChatCreate(BaseModel):
    session_id: str
    role: str
    content: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database schema verified.")
    except Exception as e:
        print(f"DB Startup Warning: {e}")

@app.get("/")
def read_root():
    return {"status": "Mierae Solar Backend Active", "v": "Sales_Terminal_v1"}

@app.post("/api/leads")
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    db_lead = Lead(name=lead.name, phone=lead.phone, city=lead.city, bill=lead.bill)
    db.add(db_lead)
    db.commit()
    return {"message": "Success"}

@app.post("/api/chat-history")
def save_chat(chat: ChatCreate, db: Session = Depends(get_db)):
    try:
        db_chat = ChatHistory(session_id=chat.session_id, role=chat.role, content=chat.content)
        db.add(db_chat)
        db.commit()
        return {"message": "Saved"}
    except Exception as e:
        return {"message": "Local only"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
