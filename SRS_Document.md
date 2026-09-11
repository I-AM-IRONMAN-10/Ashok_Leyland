# Software Requirements Specification (SRS)
## Ashok Leyland Enterprise Engine Warehouse Management System (WMS)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional, non-functional, architectural, operational, and user experience requirements for the Enterprise Warehouse Management System (WMS) customized for **Ashok Leyland’s Heavy Engine Manufacturing and Storage Facilities**.

### 1.2 Problem Statement & Business Context
Previously, engine storage at the warehouse suffered from random placement without digital tracking. Forklift operators placed heavy engine assemblies in whichever free space was available. During retrieval, supervisors had to physically search through high-density storage bays. Because engines are placed close together, retrieving an engine at the rear requires moving multiple blocking engines in front of it. These temporary relocations were untracked, causing location mismatches, high forklift operator idle time, delayed dispatch, and risk of material damage.

### 1.3 System Vision & Objectives
The Ashok Leyland WMS provides:
1. **Real-time 2D Cinema-Style Visual Warehouse Map**: Dynamic color-coded grid mapping of every storage cell (A1 to Z50).
2. **Barcode-Based Strict Placement & Pending Confirmation Workflow**: Ensures zero database location drift by requiring wireless scanning of both engine barcode and storage location barcode followed by mandatory operator confirmation.
3. **Intelligent Retrieval & Temporary Relocation Algorithm**: Automated detection of blocking engines and generation of optimized minimal relocation sequences with automatic return-to-slot instructions.
4. **Role-Based Workflows**: Distinct interfaces tailored for Forklift Operators, Warehouse Supervisors, and System Administrators.
5. **Bulk Excel Order Processing**: Processing of multi-engine dispatch orders with visual highlighting and approval gates.
6. **On-Premises High Availability Deployment**: Enterprise deployment on Ashok Leyland's internal network with zero cloud dependencies.

---

## 2. Overall Description

### 2.1 User Classes and Characteristics
1. **Forklift Operator**:
   - Focus: Task execution, wireless barcode scanning, following step-by-step relocation instructions, touch UI interaction.
   - Requirements: Large tap targets, high contrast, minimal clicks, instant confirmation feedback.
2. **Warehouse Supervisor**:
   - Focus: Live monitoring, global search across attributes, Excel dispatch order approval, productivity analytics, audit logging.
   - Requirements: Comprehensive dashboard, real-time map updates, order queue management, heatmaps.
3. **System Administrator**:
   - Focus: Warehouse layout matrix definition (Rows/Columns), user & role governance, barcode scanner configuration, DB backup/restore, audit trail inspection.

### 2.2 Functional Requirements Matrix

| ID | Module | Feature | Requirement Description |
|---|---|---|---|
| FR-01 | Warehouse Map | 2D Cinema Grid | Render A-Z rows and 1-50 columns with real-time status color coding (Occupied, Available, Pending, Blocked, Relocating, Reserved). |
| FR-02 | Warehouse Map | Cell Drawer | Display complete engine metadata (Engine #, Barcode, Model, Batch, Mfg Date, Arrival Date, Status, History) on click. |
| FR-03 | Placement | Barcode Workflow | Validate scanned engine barcode against location barcode. Set location to "Pending" until "Placed Correctly" button is clicked. |
| FR-04 | Placement | Auto Allocation | Recommend nearest available optimal storage location based on engine model and forklift distance. |
| FR-05 | Search | Multi-attribute Search | Support instant search by Engine #, Barcode, Model, Batch #, or Order # with real-time pulse animation on grid. |
| FR-06 | Retrieval | Bulk Excel Processing | Upload `.xlsx`/`.csv` orders containing engine lists, validate existence, and visually highlight requested engines. |
| FR-07 | Retrieval | Intelligent Relocation | Detect blocked engines in front of target; generate minimum-step relocation plan (Move front engines to nearest temp spots, retrieve target, return front engines). |
| FR-08 | Audit & Log | Movement Tracking | Record every engine scan, location change, operator ID, timestamp, and relocation reason in persistent audit logs. |
| FR-09 | Real-Time | WebSockets | Broadcast map updates, state changes, and operator notifications instantaneously to all connected clients. |
| FR-10 | Security | RBAC & JWT | Enforce role-based access control with secure JWT tokens, bcrypt password hashing, and zero external cloud data transfer. |

---

## 3. Non-Functional Requirements

### 3.1 Performance & Latency
- **Grid Map Rendering**: < 100 ms for up to 1,300 cells (A1-Z50).
- **Barcode Scan Processing**: < 200 ms response time for backend verification.
- **Relocation Algorithm Computation**: < 500 ms for blockage depth up to 10 engines.
- **WebSocket Broadcast Latency**: < 50 ms local LAN propagation.

### 3.2 Reliability & Fault Tolerance
- Database transaction isolation to prevent double-allocation of storage cells during concurrent forklift placements.
- Offline scanner queue tolerance: If wireless network drops briefly, scanner caches transaction and syncs upon reconnection.

### 3.3 Security & Compliance
- Deployment restricted entirely to Ashok Leyland internal LAN.
- HTTPS/TLS 1.3 encryption for web client communications.
- Role-based API authorization middleware.
- Full audit logs retained for 7 years for quality and traceability compliance.
