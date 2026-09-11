# Intelligent Algorithms & AI Optimizations Spec
## Ashok Leyland Enterprise Warehouse Management System (WMS)

---

## 1. Multi-Deep Blocked Engine Detection & Temporary Relocation Solver

### 1.1 Problem Formulation
In high-density engine storage arrays, engines are packed in multi-deep rows or columns (e.g. depth of 4 or 6 engines along an access aisle). When an engine $E_{target}$ located at depth position $d$ (where $d > 1$) is requested for retrieval, all engines $E_1, E_2, \dots, E_{d-1}$ occupying positions in front of $E_{target}$ block access.

Retrieving $E_{target}$ requires a strict, atomic 3-phase execution sequence:
1. **Phase 1 (Relocate Blockers)**: Move blocking engines $E_1 \dots E_{d-1}$ out to nearest available temporary storage locations $T_1 \dots T_{d-1}$.
2. **Phase 2 (Target Extraction)**: Extract $E_{target}$ and move to Dispatch Bay $D_0$.
3. **Phase 3 (Restoration)**: Return blocking engines $E_{d-1} \dots E_1$ back to their original slots (LIFO order to maintain zero footprint shift) or to optimal permanent slots.

### 1.2 Algorithmic Formulation (Greedy Minimal-Travel Distance)

Let $W$ be the warehouse grid graph where each location $L(r, c) \in W$ has coordinates $(x_L, y_L)$ and current state $S(L)$.

#### Algorithm 1: ComputeRelocationPlan($E_{target}$)
```python
def compute_relocation_plan(target_engine, grid_matrix, dispatch_bay_coords):
    target_loc = target_engine.current_location
    row = target_loc.row
    col = target_loc.col
    
    # Step 1: Detect front blocking engines in aisle direction (e.g., col 1 to col-1)
    blocking_locations = []
    for c in range(1, col):
        loc = grid_matrix[row][c]
        if loc.status == 'OCCUPIED':
            blocking_locations.append(loc)
            
    if not blocking_locations:
        # Target is directly accessible
        return {
            "requires_relocation": False,
            "relocation_steps": [],
            "retrieval_step": f"Extract {target_engine.engine_number} directly from {target_loc.code} to Dispatch Bay"
        }
        
    # Step 2: Find nearest free temporary cells for each blocker
    # Prioritize cells with minimal total Manhattan Distance: d(L1, L2) = |x1 - x2| + |y1 - y2|
    free_temp_cells = get_all_available_locations(grid_matrix, exclude_reserved=True)
    
    relocation_steps = []
    reserved_temps = []
    
    # Process blockers front-to-back (LIFO for restoration)
    for blocker_loc in blocking_locations:
        blocker_engine = blocker_loc.current_engine
        
        # Sort available temp cells by Manhattan distance to blocker_loc
        best_temp = min(
            [c for c in free_temp_cells if c not in reserved_temps],
            key=lambda cell: abs(cell.row_idx - blocker_loc.row_idx) + abs(cell.col - blocker_loc.col)
        )
        
        reserved_temps.append(best_temp)
        relocation_steps.append({
            "phase": "TEMP_RELOCATION",
            "sequence": len(relocation_steps) + 1,
            "engine_number": blocker_engine.engine_number,
            "barcode": blocker_engine.barcode,
            "from_location": blocker_loc.code,
            "to_location": best_temp.code,
            "action_text": f"Move Blocker {blocker_engine.engine_number} from {blocker_loc.code} to Temp Cell {best_temp.code}"
        })
        
    # Target Retrieval Step
    relocation_steps.append({
        "phase": "TARGET_EXTRACTION",
        "sequence": len(relocation_steps) + 1,
        "engine_number": target_engine.engine_number,
        "barcode": target_engine.barcode,
        "from_location": target_loc.code,
        "to_location": "DISPATCH_BAY",
        "action_text": f"RETRIEVE TARGET {target_engine.engine_number} from {target_loc.code} -> Dispatch Bay"
    })
    
    # Restoration Steps (Reverse order)
    for step in reversed([s for s in relocation_steps if s["phase"] == "TEMP_RELOCATION"]):
        relocation_steps.append({
            "phase": "RESTORATION",
            "sequence": len(relocation_steps) + 1,
            "engine_number": step["engine_number"],
            "barcode": step["barcode"],
            "from_location": step["to_location"],
            "to_location": step["from_location"],
            "action_text": f"Return {step['engine_number']} from Temp Cell {step['to_location']} back to Original Cell {step['from_location']}"
        })
        
    return {
        "requires_relocation": True,
        "blocker_count": len(blocking_locations),
        "total_steps": len(relocation_steps),
        "relocation_steps": relocation_steps
    }
```

---

## 2. Nearest Storage Location Allocation Algorithm

When an inbound engine arrives:
1. Identify model type (e.g. 6-Cylinder Heavy vs 4-Cylinder Medium).
2. Filter available storage cells that match floor weight load limits.
3. Compute nearest distance to Inbound Receiving Bay:
   $$\min_{L \in \text{Available}} \left( |x_L - x_{\text{inbound}}| + |y_L - y_{\text{inbound}}| \right)$$
4. Assign location status to `PENDING_CONFIRMATION` until operator scans barcode and clicks "Placed Correctly".

---

## 3. Dynamic Barcode Verification & Fault Prevention

```
[ Operator Scans Engine Barcode ] 
               |
               v
[ System Checks Target Assigned Location ]
               |
               v
[ Operator Scans Location Barcode ]
               |
        +------+------+
        | Match?      |
       YES            NO
        |              |
        v              v
[ System Enables ]   [ Display Red Warning Banner ]
["Placed        "]   [ "Location Mismatch! Scanned: X, Expected: Y" ]
["Correctly" Btn ]   [ Block Database Update ]
```

---

## 4. AI-Powered Optimizations

1. **Velocity-Based Slotting (ABC Analysis)**:
   - High-demand engine models (Fast-movers - A Category) automatically routed to front accessible rows (Rows A-C).
   - Low-demand engine models (Slow-movers - C Category) placed in deep storage cells (Rows F-H).
2. **Heatmap & Congestion Analytics**:
   - Analyzes forklift travel paths to prevent aisle congestion during peak dispatch hours.
