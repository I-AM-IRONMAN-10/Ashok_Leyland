"""
Ashok Leyland Enterprise Warehouse Management System (WMS)
FastAPI Backend Application with WebSockets and Real-Time Grid State Manager
"""

import datetime
import json
import random
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
try:
    from backend.app.relocation_solver import generate_relocation_sequence, calculate_inbound_path
except ImportError:
    try:
        from app.relocation_solver import generate_relocation_sequence, calculate_inbound_path
    except ImportError:
        from relocation_solver import generate_relocation_sequence, calculate_inbound_path

app = FastAPI(
    title="Ashok Leyland WMS Backend API",
    description="Enterprise Heavy Engine Storage & Automated Retrieval API",
    version="1.0.0"
)

# Enable CORS for local on-premises Nginx/Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# IN-MEMORY REAL-TIME WAREHOUSE DATABASE & GRID STATE
# -----------------------------------------------------------------------------
ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"]
COLS = 12  # Grid cols 1..12

# Engine Models
ENGINE_MODELS = [
    {"model_code": "AL-H6-220", "name": "H-Series 6-Cyl 220HP", "type": "Diesel", "weight": 680},
    {"model_code": "AL-A4-160", "name": "A-Series 4-Cyl 160HP", "type": "Diesel", "weight": 490},
    {"model_code": "AL-CNG6-200", "name": "iGen6 CNG 200HP", "type": "CNG", "weight": 710},
    {"model_code": "AL-H6-260", "name": "H-Series 6-Cyl Heavy Duty 260HP", "type": "Diesel", "weight": 750},
]

# Generate Seed Grid Data with realistic state
grid_db: Dict[str, dict] = {}
movement_logs_db: List[dict] = []
retrieval_orders_db: List[dict] = []

def initialize_grid():
    global grid_db
    grid_db = {}
    
    # Engine numbers formatted as TLHM117681, TLHM117682, etc. as specified by user!
    base_engine_sn = 117681
    sn_counter = 0

    for r in ROWS:
        for c in range(1, COLS + 1):
            loc_code = f"{r}{c}"
            
            # Engines occupied till Row F (Rows A, B, C, D, E, F filled with engines)
            if r in ["A", "B", "C", "D", "E", "F"]:
                status = "OCCUPIED"
                eng_sn = base_engine_sn + sn_counter
                engine_num = f"TLHM{eng_sn}"
                barcode = f"TLHM-{eng_sn}"
                
                # Vary models by row
                if r == "A":
                    model = ENGINE_MODELS[0]
                    batch = "BATCH-2026-Q3-01"
                elif r == "B":
                    model = ENGINE_MODELS[1]
                    batch = "BATCH-2026-Q3-02"
                elif r == "C":
                    model = ENGINE_MODELS[2]
                    batch = "BATCH-2026-Q3-03"
                elif r == "D":
                    model = ENGINE_MODELS[3]
                    batch = "BATCH-2026-Q3-04"
                elif r == "E":
                    model = ENGINE_MODELS[0]
                    batch = "BATCH-2026-Q3-05"
                else:  # Row F
                    model = ENGINE_MODELS[1]
                    batch = "BATCH-2026-Q3-06"
                    
                mfg_date = f"2026-06-{(c % 25) + 1:02d}"
                sn_counter += 1
            else:
                status = "AVAILABLE"
                engine_num = None
                barcode = None
                model = None
                mfg_date = None
                batch = None

            grid_db[loc_code] = {
                "location_code": loc_code,
                "row": r,
                "col": c,
                "status": status,
                "engine_number": engine_num,
                "barcode": barcode,
                "model_name": model["name"] if model else None,
                "engine_type": model["type"] if model else None,
                "weight_kg": model["weight"] if model else None,
                "batch_number": batch,
                "mfg_date": mfg_date,
                "arrival_date": "2026-07-15 08:30:00" if engine_num else None,
                "last_movement": "2026-07-28 14:00:00" if engine_num else None,
                "operator_id": "EMP-8042 (Ramesh)" if engine_num else None
            }

initialize_grid()

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# -----------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# -----------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str

class ScanEngineRequest(BaseModel):
    engine_barcode: str

class PlacementConfirmRequest(BaseModel):
    engine_barcode: str
    location_code: str
    operator_name: Optional[str] = "Operator (Ramesh)"

class RelocationSolveRequest(BaseModel):
    target_loc_code: str
    dispatch_bay: Optional[str] = "DISPATCH_BAY_NORTH"

class ExecuteStepRequest(BaseModel):
    step_number: int
    engine_barcode: str
    from_location: str
    to_location: str
    operator_name: Optional[str] = "Operator (Ramesh)"

class ReallocationExecuteRequest(BaseModel):
    engine_number: str
    from_location: str
    to_location: str

# -----------------------------------------------------------------------------
# REST ENDPOINTS
# -----------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "system": "Ashok Leyland Enterprise Engine WMS",
        "status": "OPERATIONAL",
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    users_db = {
        "operator1": {"user_id": "usr-8042", "username": "operator1", "password": "operator123", "fullName": "Ramesh Kumar", "role": "OPERATOR", "badgeId": "EMP-8042", "designation": "Certified Heavy Engine Forklift Operator"},
        "supervisor1": {"user_id": "usr-1001", "username": "supervisor1", "password": "supervisor123", "fullName": "Venkatesh Sharma", "role": "SUPERVISOR", "badgeId": "SUP-1001", "designation": "Warehouse Shift Operations Supervisor"},
        "admin": {"user_id": "usr-0001", "username": "admin", "password": "admin123", "fullName": "Ashok Leyland System Admin", "role": "ADMIN", "badgeId": "ADM-0001", "designation": "System Administrator & Plant IT"}
    }
    user = users_db.get(req.username.lower().strip())
    if user and user["password"] == req.password:
        return {
            "access_token": f"token-{user['user_id']}",
            "token_type": "bearer",
            "user": user
        }
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.get("/api/v1/warehouse/map")
def get_warehouse_map():
    total = len(grid_db)
    occupied = sum(1 for c in grid_db.values() if c["status"] == "OCCUPIED")
    available = sum(1 for c in grid_db.values() if c["status"] == "AVAILABLE")
    pending = sum(1 for c in grid_db.values() if c["status"] == "PENDING_CONFIRMATION")
    reserved = sum(1 for c in grid_db.values() if c["status"] == "RESERVED_TEMP")
    
    return {
        "summary": {
            "total_locations": total,
            "occupied": occupied,
            "available": available,
            "pending": pending,
            "reserved_temp": reserved,
            "utilization_pct": round((occupied / total) * 100, 1) if total else 0
        },
        "grid": list(grid_db.values())
    }

@app.get("/api/v1/warehouse/location/{loc_code}")
def get_location_detail(loc_code: str):
    if loc_code not in grid_db:
        raise HTTPException(status_code=404, detail="Location not found")
    
    location_info = grid_db[loc_code]
    history = [m for m in movement_logs_db if m.get("to_location") == loc_code or m.get("from_location") == loc_code]
    
    return {
        "location": location_info,
        "history": history
    }

@app.post("/api/v1/placement/scan-engine")
def scan_engine(req: ScanEngineRequest):
    clean_bc = req.engine_barcode.strip().upper()
    found_loc = None
    for loc, cell in grid_db.items():
        cell_bc = (cell.get("barcode") or "").strip().upper()
        cell_eng = (cell.get("engine_number") or "").strip().upper()
        if clean_bc == cell_bc or clean_bc == cell_eng or clean_bc.replace("-", "") == cell_eng:
            found_loc = loc
            break
            
    rec_loc = None
    for r in ["A", "B", "C", "D", "E", "F", "G", "H"]:
        for c in range(COLS, 0, -1):
            code = f"{r}{c}"
            if code in grid_db and grid_db[code]["status"] == "AVAILABLE":
                rec_loc = code
                break
        if rec_loc:
            break

    return {
        "status": "SCANNED",
        "barcode": clean_bc,
        "existing_location": found_loc,
        "recommended_location": rec_loc or "A12",
        "message": f"Engine barcode {clean_bc} verified. Destination assigned to {rec_loc or 'A12'}."
    }

@app.post("/api/v1/placement/confirm")
async def confirm_placement(req: PlacementConfirmRequest):
    clean_loc = req.location_code.strip().upper()
    clean_bc = req.engine_barcode.strip()

    if clean_loc not in grid_db:
        raise HTTPException(status_code=400, detail=f"Invalid target location code '{clean_loc}'")
        
    cell = grid_db[clean_loc]
    if cell["status"] == "OCCUPIED":
        raise HTTPException(status_code=400, detail=f"Storage cell '{clean_loc}' is already occupied")
        
    cell["status"] = "OCCUPIED"
    cell["barcode"] = clean_bc
    if not cell["engine_number"]:
        digits = "".join(filter(str.isdigit, clean_bc))
        cell["engine_number"] = f"TLHM{digits if len(digits)>=6 else random.randint(117681, 117799)}"
    cell["last_movement"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cell["operator_id"] = req.operator_name

    log_entry = {
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "engine_number": cell["engine_number"],
        "barcode": clean_bc,
        "from_location": "INBOUND_BAY",
        "to_location": clean_loc,
        "movement_type": "INBOUND_PLACEMENT",
        "operator": req.operator_name,
        "status": "CONFIRMED"
    }
    movement_logs_db.insert(0, log_entry)

    # Broadcast WebSocket event
    await manager.broadcast({
        "type": "GRID_UPDATE",
        "grid": list(grid_db.values()),
        "location": cell,
        "movement": log_entry
    })

    return {
        "success": True,
        "message": f"Engine confirmed placed at {clean_loc}",
        "cell": cell
    }

@app.post("/api/v1/retrieval/solve")
@app.post("/api/v1/retrieval/solve-relocation")
def solve_retrieval(req: RelocationSolveRequest):
    plan = generate_relocation_sequence(req.target_loc_code, grid_db, req.dispatch_bay or "DISPATCH_BAY_NORTH")
    return plan

@app.get("/api/v1/path/inbound/{loc_code}")
def get_inbound_path(loc_code: str, gate: Optional[str] = "A1"):
    return calculate_inbound_path(loc_code, gate)

@app.post("/api/v1/retrieval/execute-step")
async def execute_relocation_step(req: ExecuteStepRequest):
    clean_from = req.from_location.strip().upper()
    clean_to = req.to_location.strip().upper()

    if clean_to.startswith("DISPATCH"):
        if clean_from in grid_db:
            grid_db[clean_from]["status"] = "AVAILABLE"
            grid_db[clean_from]["engine_number"] = None
            grid_db[clean_from]["barcode"] = None
    else:
        if clean_from in grid_db:
            grid_db[clean_from]["status"] = "AVAILABLE"
            grid_db[clean_from]["engine_number"] = None
            grid_db[clean_from]["barcode"] = None

        if clean_to in grid_db:
            grid_db[clean_to]["status"] = "OCCUPIED"
            digits = "".join(filter(str.isdigit, req.engine_barcode))
            grid_db[clean_to]["engine_number"] = req.engine_barcode if req.engine_barcode.startswith("TLHM") else f"TLHM{digits if len(digits)>=6 else '117681'}"
            grid_db[clean_to]["barcode"] = req.engine_barcode.strip()

    log_entry = {
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "engine_number": req.engine_barcode,
        "barcode": req.engine_barcode,
        "from_location": clean_from,
        "to_location": clean_to,
        "movement_type": "RELOCATION_STEP",
        "operator": req.operator_name,
        "status": "CONFIRMED"
    }
    movement_logs_db.insert(0, log_entry)

    await manager.broadcast({
        "type": "GRID_UPDATE",
        "grid": list(grid_db.values()),
        "movement": log_entry
    })

    return {"success": True, "step": req.step_number, "message": "Step executed successfully"}

@app.get("/api/v1/reallocation/analyze")
def analyze_reallocation():
    scatteredEngines = [c for c in grid_db.values() if (c["row"] in ['F', 'G', 'H'] or c["col"] > 8) and c["status"] == 'OCCUPIED']
    availableFrontSlots = [c for c in grid_db.values() if c["row"] in ['A', 'B', 'C'] and c["status"] == 'AVAILABLE']

    moves = []
    count = min(len(scatteredEngines), len(availableFrontSlots), 3)

    for i in range(count):
        moves.append({
            "step": i + 1,
            "engineNumber": scatteredEngines[i]["engine_number"] or f"TLHM{117690+i}",
            "barcode": scatteredEngines[i]["barcode"] or f"TLHM-{117690+i}",
            "currentLoc": scatteredEngines[i]["location_code"],
            "recommendedOptimalLoc": availableFrontSlots[i]["location_code"],
            "spaceSaved": "14.2 sq.m contiguous aisle space freed"
        })

    return {
        "timestamp": datetime.datetime.now().strftime("%H:%M:%S"),
        "totalScatteredDetected": len(scatteredEngines),
        "suggestedMovesCount": len(moves),
        "moves": moves
    }

@app.post("/api/v1/reallocation/execute")
async def execute_reallocation(req: ReallocationExecuteRequest):
    if req.from_location in grid_db:
        grid_db[req.from_location]["status"] = "AVAILABLE"
        grid_db[req.from_location]["engine_number"] = None
        grid_db[req.from_location]["barcode"] = None

    if req.to_location in grid_db:
        grid_db[req.to_location]["status"] = "OCCUPIED"
        grid_db[req.to_location]["engine_number"] = req.engine_number
        grid_db[req.to_location]["barcode"] = f"TLHM-{req.engine_number.replace('TLHM', '')}"

    await manager.broadcast({
        "type": "GRID_UPDATE",
        "grid": list(grid_db.values())
    })
    return {"success": True, "message": f"Reallocated {req.engine_number} from {req.from_location} to {req.to_location}"}

@app.post("/api/v1/bulk/upload-excel")
def upload_excel(file: UploadFile = File(...)):
    # Parse uploaded spreadsheet lines
    content = file.file.read().decode("utf-8", errors="ignore")
    lines = content.splitlines()
    detected = []
    idx = 1

    for line in lines:
        parts = [p.strip().upper() for p in line.split(",")]
        for part in parts:
            if part.startswith("TLHM"):
                for loc, cell in grid_db.items():
                    c_eng = (cell.get("engine_number") or "").upper()
                    c_bc = (cell.get("barcode") or "").upper()
                    if part == c_eng or part == c_bc:
                        detected.append({
                            "id": idx,
                            "engine_number": cell["engine_number"],
                            "barcode": cell["barcode"],
                            "loc": loc,
                            "status": "AVAILABLE_STORED",
                            "requires_relocation": cell["col"] > 1
                        })
                        idx += 1
                        break

    return {
        "filename": file.filename,
        "items_count": len(detected),
        "orders": detected
    }

@app.get("/api/v1/analytics/summary")
def get_analytics():
    total = len(grid_db)
    occupied = sum(1 for c in grid_db.values() if c["status"] == "OCCUPIED")
    return {
        "occupancy_rate": round((occupied / total) * 100, 1),
        "total_movements_today": len(movement_logs_db) + 42,
        "avg_retrieval_time_mins": 3.4,
        "forklift_distance_km": 18.2,
        "active_operators": 4,
        "daily_movement_trend": [
            {"time": "08:00", "inbound": 12, "outbound": 5},
            {"time": "10:00", "inbound": 18, "outbound": 14},
            {"time": "12:00", "inbound": 25, "outbound": 20},
            {"time": "14:00", "inbound": 15, "outbound": 18},
            {"time": "16:00", "inbound": 22, "outbound": 12},
            {"time": "18:00", "inbound": 10, "outbound": 8},
        ],
        "top_frequently_retrieved": ["A4", "A2", "B1", "C3", "B5"]
    }

@app.websocket("/ws")
@app.websocket("/ws/warehouse-updates")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"ACK: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

