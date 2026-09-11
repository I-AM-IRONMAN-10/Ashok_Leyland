// Grid Navigation & Shortest Path Calculator for Ashok Leyland WMS

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COLS = 12;

export function parseLocation(locCode) {
  if (!locCode || typeof locCode !== 'string' || locCode.length < 2) return null;
  const rowChar = locCode[0].toUpperCase();
  const rowIndex = ROWS.indexOf(rowChar);
  if (rowIndex === -1) return null;
  const col = parseInt(locCode.slice(1), 10);
  if (isNaN(col) || col < 1 || col > COLS) return null;
  return { rowIndex, col, row: rowChar };
}

export function formatLocation(rowIndex, col) {
  return `${ROWS[rowIndex]}${col}`;
}

export function calculateGridPath(startLoc, endLoc) {
  const start = parseLocation(startLoc);
  const end = parseLocation(endLoc);
  if (!start || !end) return [];

  const pathCells = [];

  // 1. Move from start col out to main access aisle (Col 1)
  if (start.col > 1) {
    let curC = start.col;
    while (curC > 1) {
      pathCells.push(formatLocation(start.rowIndex, curC));
      curC--;
    }
  }

  // 2. Move vertically along Col 1 aisle from start.rowIndex to end.rowIndex
  const rowStep = end.rowIndex >= start.rowIndex ? 1 : -1;
  let curR = start.rowIndex;
  while (true) {
    const cellLoc = formatLocation(curR, 1);
    if (pathCells.length === 0 || pathCells[pathCells.length - 1] !== cellLoc) {
      pathCells.push(cellLoc);
    }
    if (curR === end.rowIndex) break;
    curR += rowStep;
  }

  // 3. Move horizontally along target row from Col 1 to end.col
  if (end.col > 1) {
    for (let c = 2; c <= end.col; c++) {
      pathCells.push(formatLocation(end.rowIndex, c));
    }
  }

  // Format steps with directions & icons
  return pathCells.map((loc, idx) => {
    const parsed = parseLocation(loc);
    let direction = 'START';
    let icon = '🏁';

    if (idx > 0) {
      const prev = parseLocation(pathCells[idx - 1]);
      if (parsed.rowIndex > prev.rowIndex) {
        direction = 'DOWN';
        icon = '⬇️';
      } else if (parsed.rowIndex < prev.rowIndex) {
        direction = 'UP';
        icon = '⬆️';
      } else if (parsed.col > prev.col) {
        direction = 'RIGHT';
        icon = '➡️';
      } else if (parsed.col < prev.col) {
        direction = 'LEFT';
        icon = '⬅️';
      }
    }

    if (idx === pathCells.length - 1) {
      icon = '🎯';
    }

    return {
      step: idx + 1,
      location_code: loc,
      row: parsed.row,
      col: parsed.col,
      direction,
      icon,
      isStart: idx === 0,
      isEnd: idx === pathCells.length - 1
    };
  });
}

export function calculateInboundStoragePath(targetLocCode, intakeGate = 'A1') {
  const parsed = parseLocation(targetLocCode);
  if (!parsed) return null;

  const path = calculateGridPath(intakeGate, targetLocCode);
  const distanceMeters = Math.max(0, (path.length - 1) * 3);

  const instructions = [
    `🏁 Enter Storage Room via Intake Gate 1 (${intakeGate})`,
    `⬇️ Proceed down Main Access Aisle (Column 1) to Row ${parsed.row}`,
    `➡️ Turn Right into Row ${parsed.row} rack corridor up to Column ${parsed.col}`,
    `🅿️ Safely place heavy engine into Storage Rack Cell ${targetLocCode}`
  ];

  return {
    type: 'INBOUND',
    title: `Storage Intake Path to Cell ${targetLocCode}`,
    targetLocation: targetLocCode,
    intakeGate,
    distanceMeters,
    totalSteps: path.length,
    path,
    instructions
  };
}

export function calculateNearestRetrievalPath(targetLocCode, gridData = [], dispatchGate = 'A1') {
  const parsed = parseLocation(targetLocCode);
  if (!parsed) return null;

  const row = parsed.row;
  const col = parsed.col;

  // Detect front blockers in same row stack
  const blockers = [];
  for (let c = 1; c < col; c++) {
    const locCode = `${row}${c}`;
    const cell = gridData.find(g => g.location_code === locCode);
    if (cell && (cell.status === 'OCCUPIED' || cell.status === 'PENDING_CONFIRMATION')) {
      blockers.push({
        loc_code: locCode,
        engine_number: cell.engine_number || `TLHM${117680 + c}`,
        barcode: cell.barcode || ` TLHM-${117680 + c}`
      });
    }
  }

  const targetCell = gridData.find(g => g.location_code === targetLocCode) || {};
  const targetEngine = targetCell.engine_number || `TLHM117681`;
  const targetBarcode = targetCell.barcode || ` TLHM-117681`;

  // Shortest outbound navigation path to Dispatch Gate
  const path = calculateGridPath(targetLocCode, dispatchGate);
  const distanceMeters = Math.max(0, (path.length - 1) * 3);

  const instructions = blockers.length > 0 ? [
    `⚠️ ${blockers.length} Blocker Engine(s) detected in Row ${row} in front of Cell ${targetLocCode}`,
    `🔄 Relocate front blocker engine(s) to designated free storage slots`,
    `📍 Pick target engine ${targetEngine} from Rack Cell ${targetLocCode}`,
    `🚚 Transport engine along shortest exit path to Dispatch Gate (${dispatchGate})`
  ] : [
    `📍 Drive forklift to target Rack Cell ${targetLocCode}`,
    `🎯 Pick engine ${targetEngine} from Rack Cell ${targetLocCode}`,
    `➡️ Transport along Row ${row} corridor to Main Access Aisle`,
    `🚚 Deliver engine to Dispatch Gate (${dispatchGate})`
  ];

  return {
    type: 'RETRIEVAL',
    title: `Nearest Retrieval Path for Engine ${targetEngine} (${targetLocCode})`,
    targetLocation: targetLocCode,
    targetEngine,
    targetBarcode,
    dispatchGate,
    distanceMeters,
    totalSteps: path.length,
    blockers,
    requiresRelocation: blockers.length > 0,
    path,
    instructions
  };
}
