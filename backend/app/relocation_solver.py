"""
Ashok Leyland Intelligent Relocation & Pathfinding Engine
Determines the minimal set of blocking engines, finds nearest available temporary slots,
calculates 2D grid pathing for storage intake and engine retrieval, and generates step-by-step instructions.
"""

ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"]
COLS = 12

def parse_location(loc_code: str):
    """Parse location code like 'A7' or 'D12' into row_index (0-7) and col (1-12)."""
    if not loc_code or len(loc_code) < 2:
        return None, None
    row_char = loc_code[0].upper()
    if row_char not in ROWS:
        return None, None
    try:
        col = int(loc_code[1:])
        if col < 1 or col > COLS:
            return None, None
        return ROWS.index(row_char), col
    except ValueError:
        return None, None

def format_location(row_idx: int, col: int) -> str:
    """Format row_idx (0-7) and col (1-12) back to 'A7'."""
    return f"{ROWS[row_idx]}{col}"

def calculate_grid_path(start_loc: str, end_loc: str) -> list:
    """
    Calculates cell-by-cell 2D aisle navigation path between start_loc and end_loc.
    Navigation rules:
    - Move vertically along Column 1 main access aisle to reach target row.
    - Turn into target row corridor and move horizontally to target column.
    """
    r1, c1 = parse_location(start_loc)
    r2, c2 = parse_location(end_loc)
    
    if r1 is None or r2 is None:
        return []

    path_cells = []
    
    # 1. Travel from (r1, c1) out to aisle (col 1) if not already at col 1
    if c1 > 1:
        step_c = c1
        while step_c > 1:
            loc = format_location(r1, step_c)
            path_cells.append(loc)
            step_c -= 1
    
    # 2. Travel vertically along col 1 from r1 to r2
    row_step = 1 if r2 >= r1 else -1
    cur_r = r1
    while True:
        loc = format_location(cur_r, 1)
        if not path_cells or path_cells[-1] != loc:
            path_cells.append(loc)
        if cur_r == r2:
            break
        cur_r += row_step

    # 3. Travel horizontally along row r2 from col 1 to c2
    if c2 > 1:
        for c in range(2, c2 + 1):
            loc = format_location(r2, c)
            path_cells.append(loc)

    # Attach turn directions and metadata
    formatted_path = []
    for i, loc in enumerate(path_cells):
        r_i, c_i = parse_location(loc)
        direction = "START"
        if i > 0:
            prev_r, prev_c = parse_location(path_cells[i-1])
            if r_i > prev_r:
                direction = "DOWN"
            elif r_i < prev_r:
                direction = "UP"
            elif c_i > prev_c:
                direction = "RIGHT"
            elif c_i < prev_c:
                direction = "LEFT"

        formatted_path.append({
            "step": i + 1,
            "location_code": loc,
            "row": ROWS[r_i],
            "col": c_i,
            "direction": direction,
            "is_start": i == 0,
            "is_end": i == len(path_cells) - 1
        })

    return formatted_path

def calculate_inbound_path(target_loc_code: str, intake_gate: str = "A1") -> dict:
    """
    Calculates the exact path where engines are taken into the storage room from Gate 1 to target storage rack cell.
    """
    path_steps = calculate_grid_path(intake_gate, target_loc_code)
    r_idx, c_val = parse_location(target_loc_code)
    
    if r_idx is None:
        return {"error": f"Invalid target location {target_loc_code}"}

    distance_meters = max(0, (len(path_steps) - 1) * 3)
    
    instructions = [
        f"🏁 Enter Storage Room via Intake Gate 1 ({intake_gate})",
        f"⬇️ Proceed along Main Aisle (Column 1) to Row {ROWS[r_idx]}",
        f"➡️ Turn Right into Row {ROWS[r_idx]} corridor up to Column {c_val}",
        f"🅿️ Safely place heavy engine into Storage Cell {target_loc_code}"
    ]

    return {
        "type": "INBOUND_STORAGE",
        "intake_gate": intake_gate,
        "target_location": target_loc_code,
        "total_distance_meters": distance_meters,
        "total_path_steps": len(path_steps),
        "path_cells": path_steps,
        "turn_instructions": instructions
    }

def generate_relocation_sequence(target_input: str, grid_data: dict, dispatch_bay: str = "DISPATCH_BAY_NORTH") -> dict:
    """
    Given a target location code (e.g., 'A7') or engine code/barcode (e.g. 'TLHM117681'),
    calculate the nearest retrieval path, detect front blockers, calculate temp relocation slots,
    and return full pathing instructions.
    """
    if not target_input:
        return {"error": "Missing target input"}

    clean_target = target_input.strip().upper()
    actual_loc_code = None

    # Check if target_input is directly a location code (e.g., 'A7')
    r_check, c_check = parse_location(clean_target)
    if r_check is not None:
        actual_loc_code = clean_target
    else:
        # Search grid_data for matching engine_number or barcode
        for loc, cell in grid_data.items():
            cell_eng = (cell.get("engine_number") or "").strip().upper()
            cell_bc = (cell.get("barcode") or "").strip().upper()
            if clean_target == cell_eng or clean_target == cell_bc or clean_target == cell_bc.replace("-", ""):
                actual_loc_code = loc
                break

    if not actual_loc_code:
        return {"error": f"Target '{target_input}' not found in storage grid"}

    target_loc_code = actual_loc_code
    r_idx, target_col = parse_location(target_loc_code)
    row = ROWS[r_idx]

    # Find blocking locations in front (cols 1 to target_col - 1)
    blockers = []
    for c in range(1, target_col):
        loc_code = f"{row}{c}"
        if loc_code in grid_data:
            cell = grid_data[loc_code]
            if cell.get("status") in ["OCCUPIED", "PENDING_CONFIRMATION", "RESERVED"]:
                bc = (cell.get("barcode") or f"TLHM-{117680 + c}").strip()
                blockers.append({
                    "loc_code": loc_code,
                    "engine_number": cell.get("engine_number", f"TLHM{117680 + c}"),
                    "barcode": bc
                })

    target_cell = grid_data.get(target_loc_code, {})
    target_engine_num = target_cell.get("engine_number", "TLHM117681")
    target_barcode = (target_cell.get("barcode") or "TLHM-117681").strip()

    # Grid outbound navigation path from target cell back to main exit (A1)
    outbound_grid_path = calculate_grid_path(target_loc_code, "A1")
    retrieval_distance_meters = max(0, (len(outbound_grid_path) - 1) * 3)

    if not blockers:
        return {
            "target_loc": target_loc_code,
            "target_engine": target_engine_num,
            "target_barcode": target_barcode,
            "requires_relocation": False,
            "total_steps": 1,
            "retrieval_distance_meters": retrieval_distance_meters,
            "grid_path": outbound_grid_path,
            "turn_instructions": [
                f"📍 Locate target engine {target_engine_num} at Rack {target_loc_code}",
                f"➡️ Move engine along Row {row} to Main Access Aisle",
                f"⬆️ Drive along Main Access Aisle to Dispatch Bay Gate 1 (A1)",
                f"✅ Complete handover at Dispatch Bay"
            ],
            "sequence": [
                {
                    "step_number": 1,
                    "phase": "TARGET_EXTRACTION",
                    "action_title": f"Retrieve Engine {target_engine_num} from {target_loc_code} -> Dispatch Bay",
                    "engine_number": target_engine_num,
                    "barcode": target_barcode,
                    "from_location": target_loc_code,
                    "to_location": dispatch_bay,
                    "status": "PENDING"
                }
            ]
        }

    # Find nearest available row for temp relocations
    all_rows = ["A", "B", "C", "D", "E", "F", "G", "H"]
    best_row = None
    min_dist = float('inf')
    
    for r in all_rows:
        if r != row:
            # Check availability
            avail_count = sum(1 for c in range(1, 13) if grid_data.get(f"{r}{c}", {}).get("status", "AVAILABLE") == "AVAILABLE")
            if avail_count >= len(blockers):
                dist = abs(ord(r) - ord(row))
                if dist < min_dist:
                    min_dist = dist
                    best_row = r
                    
    if not best_row:
        best_row = "B" if row != "B" else "C"

    # Find actual available column slots in best_row
    avail_cols = [c for c in range(1, 13) if grid_data.get(f"{best_row}{c}", {}).get("status", "AVAILABLE") == "AVAILABLE"]

    sequence = []
    step_num = 1

    # Phase 1: Relocate blocking engines
    for idx, blocker in enumerate(blockers):
        temp_col = avail_cols[idx] if idx < len(avail_cols) else (12 - idx)
        temp_loc = f"{best_row}{temp_col}"
        
        sequence.append({
            "step_number": step_num,
            "phase": "PERMANENT_RELOCATION",
            "action_title": f"Move Blocker {blocker['engine_number']} from {blocker['loc_code']} -> Slot {temp_loc}",
            "engine_number": blocker['engine_number'],
            "barcode": blocker['barcode'],
            "from_location": blocker['loc_code'],
            "to_location": temp_loc,
            "status": "PENDING",
            "is_relocation": True
        })
        step_num += 1

    # Phase 2: Target Extraction
    sequence.append({
        "step_number": step_num,
        "phase": "TARGET_EXTRACTION",
        "action_title": f"Retrieve Target Engine {target_engine_num} from {target_loc_code} -> Dispatch Bay",
        "engine_number": target_engine_num,
        "barcode": target_barcode,
        "from_location": target_loc_code,
        "to_location": dispatch_bay,
        "status": "PENDING",
        "is_target": True
    })

    return {
        "target_loc": target_loc_code,
        "target_engine": target_engine_num,
        "target_barcode": target_barcode,
        "requires_relocation": True,
        "blocker_count": len(blockers),
        "total_steps": len(sequence),
        "retrieval_distance_meters": retrieval_distance_meters,
        "grid_path": outbound_grid_path,
        "turn_instructions": [
            f"⚠️ {len(blockers)} Blocker Engine(s) detected in Row {row} in front of target {target_loc_code}",
            f"🔄 Relocate front blocker(s) to designated free slot(s) in Row {best_row}",
            f"📍 Extract target engine {target_engine_num} from Rack {target_loc_code}",
            f"🚚 Transport engine along nearest exit path to Dispatch Bay"
        ],
        "sequence": sequence
    }

