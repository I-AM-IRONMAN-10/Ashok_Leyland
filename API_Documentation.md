# API Specification & WebSockets Reference
## Ashok Leyland Enterprise Warehouse Management System (WMS)

---

## 1. Authentication Endpoints

### POST `/api/v1/auth/login`
- **Description**: Authenticate user (Operator/Supervisor/Admin) with credentials.
- **Request Body**:
```json
{
  "username": "operator1",
  "password": "Password123"
}
```
- **Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "user_id": "8f3b2a11-...",
    "username": "operator1",
    "full_name": "Ramesh Kumar",
    "role": "OPERATOR",
    "badge_id": "EMP-8042"
  }
}
```

---

## 2. Warehouse Map & Location APIs

### GET `/api/v1/warehouse/map`
- **Description**: Fetch live cinema-grid storage matrix state (Rows A-H, Cols 1-12).
- **Response (200 OK)**:
```json
{
  "total_locations": 96,
  "occupied": 42,
  "available": 48,
  "pending": 4,
  "reserved_temp": 2,
  "grid": [
    {
      "location_code": "A1",
      "row_code": "A",
      "col_number": 1,
      "status": "OCCUPIED",
      "engine": {
        "engine_number": "AL-ENG-2026-9041",
        "barcode": "AL- 89410",
        "model": "Ashok Leyland H-Series 6-Cylinder",
        "batch_number": "BATCH-2026-Q3",
        "mfg_date": "2026-06-15",
        "arrival_date": "2026-07-01",
        "status": "STORED",
        "last_movement": "2026-07-01 10:30:00"
      }
    }
  ]
}
```

### GET `/api/v1/warehouse/location/{location_code}`
- **Description**: Fetch granular cell details and movement history timeline.

---

## 3. Barcode Placement & Scanning Workflow APIs

### POST `/api/v1/placement/scan-engine`
- **Description**: Operator scans engine barcode. System returns recommended placement location.
- **Request Body**:
```json
{
  "engine_barcode": "AL- 99012"
}
```
- **Response (200 OK)**:
```json
{
  "status": "VALIDATED",
  "engine_number": "AL-ENG-2026-99012",
  "recommended_location": "B4",
  "distance_meters": 14.5
}
```

### POST `/api/v1/placement/confirm`
- **Description**: Operator confirms engine placed correctly at location.
- **Request Body**:
```json
{
  "engine_barcode": "AL- 99012",
  "location_code": "B4",
  "operator_id": "8f3b2a11-..."
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Engine AL-ENG-2026-99012 stored at location B4 successfully.",
  "location_status": "OCCUPIED"
}
```

---

## 4. Intelligent Retrieval & Relocation APIs

### POST `/api/v1/retrieval/solve-relocation`
- **Description**: Calculate multi-deep relocation sequence for target engine.
- **Request Body**:
```json
{
  "target_engine_number": "AL-ENG-2026-9044"
}
```
- **Response (200 OK)**:
```json
{
  "target_engine": "AL-ENG-2026-9044",
  "current_location": "A4",
  "requires_relocation": true,
  "blockers_count": 3,
  "sequence": [
    {
      "step": 1,
      "phase": "TEMP_RELOCATION",
      "action": "Move Blocker Engine AL-ENG-2026-9041 from A1 -> Temp Cell C5",
      "engine_number": "AL-ENG-2026-9041",
      "from": "A1",
      "to": "C5"
    },
    {
      "step": 2,
      "phase": "TEMP_RELOCATION",
      "action": "Move Blocker Engine AL-ENG-2026-9042 from A2 -> Temp Cell D2",
      "engine_number": "AL-ENG-2026-9042",
      "from": "A2",
      "to": "D2"
    },
    {
      "step": 3,
      "phase": "TEMP_RELOCATION",
      "action": "Move Blocker Engine AL-ENG-2026-9043 from A3 -> Temp Cell C8",
      "engine_number": "AL-ENG-2026-9043",
      "from": "A3",
      "to": "C8"
    },
    {
      "step": 4,
      "phase": "TARGET_EXTRACTION",
      "action": "Retrieve Target AL-ENG-2026-9044 from A4 -> Dispatch Bay",
      "engine_number": "AL-ENG-2026-9044",
      "from": "A4",
      "to": "DISPATCH_BAY"
    },
    {
      "step": 5,
      "phase": "RESTORATION",
      "action": "Return AL-ENG-2026-9043 from Temp Cell C8 -> Original Cell A3",
      "engine_number": "AL-ENG-2026-9043",
      "from": "C8",
      "to": "A3"
    },
    {
      "step": 6,
      "phase": "RESTORATION",
      "action": "Return AL-ENG-2026-9042 from Temp Cell D2 -> Original Cell A2",
      "engine_number": "AL-ENG-2026-9042",
      "from": "D2",
      "to": "A2"
    },
    {
      "step": 7,
      "phase": "RESTORATION",
      "action": "Return AL-ENG-2026-9041 from Temp Cell C5 -> Original Cell A1",
      "engine_number": "AL-ENG-2026-9041",
      "from": "C5",
      "to": "A1"
    }
  ]
}
```

### POST `/api/v1/retrieval/upload-excel`
- **Description**: Supervisor uploads dispatch order spreadsheet.

---

## 5. WebSockets Real-Time Stream

### `WS /ws/warehouse-updates`
- **Client Message Subscriptions**:
  - `LOCATION_UPDATE`: Emitted when any storage location changes state.
  - `TASK_ASSIGNED`: Sent to operator when assigned a relocation/placement step.
  - `ALERT_MISMATCH`: Broadcast when barcode mismatch occurs.
