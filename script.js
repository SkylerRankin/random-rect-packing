const width = 1000;
const height = 500;
const mapWidth = 100;
const mapHeight = 50;
const cellWidth = width / mapWidth;
const cellHeight = height / mapHeight;
const delayBetweenDrawCalls = 5;
const maxSteps = 100000;
const maxBlockSize = 20;
const minBlockSize = 3;
const seed = 3;
const rng = mulberry32(seed);
const captureVideo = false;
const algs = {};

let context;
let map;
let currentId = 0;

let capturer = new CCapture({framerate: 30, format: 'webm'});

window.onload = () => {
    const canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    context.fillStyle = "#FFF";
    context.fillRect(0, 0, width, height);

    map = [];
    for (let x = 0; x < mapWidth; x++) {
        map.push(new Array(mapHeight).fill(null, 0, mapHeight - 1));
    }
    if (captureVideo) capturer.start();

    // algs.topLeftCorner();
    algs.growFromPoints();
}

/**
 * Top Left Corner Approach
 * 
 * Maintain a list of potential starting points for rectangles.
 * Each round, choose the corner that is has lowest x value and highest
 * y value, with a priority of x over y for tie breaking. The actual
 * choices don't matter, just choose the direction of progress.
 * 
 * From that selected position, make a random rectangle in the available space.
 * Then add all the corners from that added rectangle to the list. The corners
 * can be removed from the list if the corner is on an already completed
 * rectangle.
 * 
 * Downsides:
 * - With larger max block sizes, there is a clear left to right gradient of size and shape.
 * 
 */
 algs.topLeftCorner = () => {
    
    let currentSteps;
    let startingPoints = [];

    const initialize = () => {
        startingPoints = [{x: 0, y: 0}];
        currentSteps = 0;
    }
    
    const runStep = () => {
        currentSteps++;
    
        const startingPoint = getStartingPoint();
        if (!startingPoint) {
            if (captureVideo) {
                capturer.stop();
                capturer.save();
            }
            return;
        }
        const {availableWidth, availableHeight} = getAvailableCells(startingPoint);
    
        // console.log(`Starting point = (${startingPoint.x}, ${startingPoint.y}), available space = (${availableWidth}, ${availableHeight})`);
    
        if (availableWidth < minBlockSize || availableHeight < minBlockSize) {
            console.warn(`Available space is less than min block sizes: available=(${availableWidth}, ${availableHeight}), min=${minBlockSize}`);
        }
    
        const blockWidth = randomRange(Math.min(minBlockSize, availableWidth), Math.min(maxBlockSize, availableWidth));
        const blockHeight = randomRange(Math.min(minBlockSize, availableHeight), Math.min(maxBlockSize, availableHeight));
    
        setRectangle(startingPoint.x, startingPoint.y, blockWidth, blockHeight);
        
        startingPoints.push(
            // Top Right Corner
            {x: startingPoint.x + blockWidth, y: startingPoint.y},
            // Bottom Left Corner
            {x: startingPoint.x, y: startingPoint.y + blockHeight},
            // Bottom Right Corner
            {x: startingPoint.x + blockWidth, y: startingPoint.y + blockHeight},
        );
    
        filterStartingPoints();
    
        if (currentSteps < maxSteps) {
            setTimeout(runStep, delayBetweenDrawCalls);
        } else if (captureVideo) {
            capturer.stop();
            capturer.save();
        }
    }
    
    const filterStartingPoints = () => {
        startingPoints = startingPoints.filter(point => {
            if (point.x === mapWidth || point.y === mapHeight) return false;
            if (map[point.x][point.y] !== null && map[point.x][point.y] !== undefined) return false;
            return true;
        });
    }
    
    const getStartingPoint = () => {
        let currentPoint = null;
        startingPoints.forEach(point => {
            if (currentPoint === null) {
                currentPoint = point;
            } else if (currentPoint.x > point.x) {
                currentPoint = point;
            } else if (currentPoint.x === point.x && currentPoint.y > point.y) {
                currentPoint = point;
            }
        });
        return currentPoint;
    }
    
    const getAvailableCells = (startingPoint) => {
        // X direction
        const x = mapWidth - startingPoint.x;
    
        // Y Direction
        let endY = -1;
        for (let y = startingPoint.y; y < mapHeight; y++) {
            // Check one cell ahead
            if (y + 1 === mapHeight || (map[startingPoint.x][y + 1] !== null &&  map[startingPoint.x][y + 1] !== undefined)) {
                endY = y;
                break;
            }
        }
        let y = endY - startingPoint.y + 1;
    
        return {availableWidth: x, availableHeight: y};
    }

    initialize();
    runStep();
}

/**
 * Grow from Points Approach
 * 
 * Choose a random cell and grow a rectangle out from it.
 * The bounds of how far to extend are constraint by the max
 * rect size as well as not overlapping neighboring rectangles.
 * 
 * When expanding rect and checking for available space, can check
 * horizontally first then vertically, or vice versa. Was considering choosing
 * which approach to use dynamically based on which had the larger area, but seems
 * to be similar result either way when justing choosing one or the other every time.
 * 
 * Downsides:
 * - Hard/impossible to enforce a minimum block size.
 * 
 */
algs.growFromPoints = () => {

    let unassignedCells = [];
    let currentSteps;

    const initialize = () => {
        for (let x = 0; x < mapWidth; x++) {
            for (let y = 0; y < mapHeight; y++) {
                unassignedCells.push({x, y});
            }
        }
        shuffle(unassignedCells);
        currentSteps = 0;
    }

    const runStep = () => {
        currentSteps++;
        const cell = unassignedCells[0];
        const {x, y, w, h} = growRect(cell);
        setRectangle(x, y, w, h);
        updateAssignedCells(x, y, w, h);

        if (unassignedCells.length > 0 && currentSteps < maxSteps) {
            setTimeout(runStep, delayBetweenDrawCalls);
        } else if (captureVideo) {
            capturer.stop();
            capturer.save();
        }
    }

    const growRect = cell => {
        const available = getAvailableCells(cell.x, cell.y);

        const availableWidth = available.xNegative + 1 + available.xPositive;
        const availableHeight = available.yNegative + 1 + available.yPositive;

        const desiredWidth = randomRange(Math.min(availableWidth, minBlockSize), Math.min(availableWidth, maxBlockSize));
        const desiredHeight = randomRange(Math.min(availableHeight, minBlockSize), Math.min(availableHeight, maxBlockSize));

        const center = {
            x: cell.x - available.xNegative + Math.floor((available.xNegative + 1 + available.xPositive) / 2),
            y: cell.y - available.yNegative + Math.floor((available.yNegative + 1 + available.yPositive) / 2),
        };

        // Place block in center of available space.
        const xCorner = center.x - Math.floor(desiredWidth / 2);
        const yCorner = center.y - Math.floor(desiredHeight / 2);

        return {
            x: xCorner,
            y: yCorner,
            w: desiredWidth,
            h: desiredHeight
        };

    }

    const updateAssignedCells = (x, y, w, h) => {
        let cellsInRect = new Set();
        for (let cellX = x; cellX < x + w; cellX++) {
            for (let cellY = y; cellY < y + h; cellY++) {
                cellsInRect.add(`${cellX},${cellY}`);
            }
        }

        unassignedCells = unassignedCells.filter(v => !cellsInRect.has(`${v.x},${v.y}`));
    }

    const getAvailableCells = (cellX, cellY) => {
        let availablePass1 = {
            xPositive: -1,
            xNegative: -1,
            yPositive: -1,
            yNegative: -1
        };
        let availablePass2 = {
            xPositive: -1,
            xNegative: -1,
            yPositive: -1,
            yNegative: -1
        };

        // Extend vertically, then horizontally.
        
        availablePass1.yPositive = getAvailableCellsInDirection(cellY, cellX, cellX, maxBlockSize, 'y', 1);
        availablePass1.yNegative = getAvailableCellsInDirection(cellY, cellX, cellX, maxBlockSize, 'y', -1);
        availablePass1.xPositive = getAvailableCellsInDirection(cellX, cellY - availablePass1.yNegative, cellY + availablePass1.yPositive, maxBlockSize, 'x', 1);
        availablePass1.xNegative = getAvailableCellsInDirection(cellX, cellY - availablePass1.yNegative, cellY + availablePass1.yPositive, maxBlockSize, 'x', -1);
        const area1 = (availablePass1.xNegative + 1 + availablePass1.xPositive) * (availablePass1.yNegative + 1 + availablePass1.yPositive);

        // Extend horizontally, then vertically.
        
        availablePass2.xPositive = getAvailableCellsInDirection(cellX, cellY, cellY, maxBlockSize, 'x', 1);
        availablePass2.xNegative = getAvailableCellsInDirection(cellX, cellY, cellY, maxBlockSize, 'x', -1);
        availablePass2.yPositive = getAvailableCellsInDirection(cellY, cellX - availablePass2.xNegative, cellX + availablePass2.xPositive, maxBlockSize, 'y', 1);
        availablePass2.yNegative = getAvailableCellsInDirection(cellY, cellX - availablePass2.xNegative, cellX + availablePass2.xPositive, maxBlockSize, 'y', -1);
        const area2 = (availablePass2.xNegative + 1 + availablePass2.xPositive) * (availablePass2.yNegative + 1 + availablePass2.yPositive);

        return area1 > area2 ? availablePass1 : availablePass2;

        // return availablePass1;
    }

    const getAvailableCellsInDirection = (startingValue, minBounds, maxBounds, maxExtension, axis, direction) => {
        let value = startingValue;

        let blocked = false;
        while (!blocked) {
            // Check if next row/column would be in bounds.
            if (value + direction < 0 || (axis === 'x' && value + direction >= mapWidth) || (axis === 'y' && value + direction >= mapHeight)) {
                break;
            }

            // Check if entire row/column can be extended one more block.
            for (let i = minBounds; i <= maxBounds; i++) {
                let nextCell = axis === 'x' ? map[value + direction][i] : map[i][value + direction];
                if (nextCell !== null && nextCell !== undefined) {
                    blocked = true;
                    break;
                }
            }

            if (!blocked) {
                // Extend to next row/columnn.
                value += direction;

                // Value has been extended to max extension. No need for more searching.
                if (Math.abs(startingValue - value) === maxExtension) break;
            }
            
        }

        return Math.abs(startingValue - value);
    }

    const shuffle = a => {
        let index = a.length;
        while (index > 0) {
            let randomIndex = randomRange(0, index);
            index--;
            let temp = a[randomIndex];
            a[randomIndex] = a[index];
            a[index] = temp;
        }
    }

    initialize();
    runStep();
}

const setRectangle = (x, y, w, h) => {
    const id = currentId;
    currentId++;
    for (let rectX = x; rectX < x + w; rectX++) {
        for (let rectY = y; rectY < y + h; rectY++) {
            map[rectX][rectY] = id;
        }
    }
    
    context.fillStyle = getRandomColor();
    context.fillRect(x * cellWidth, y * cellHeight, w * cellWidth, h * cellHeight);
    if (capturer) {
        capturer.capture(canvas);
    }
}

const drawDebugPlot = () => {
    context.fillStyle = "#000";
    for (let x = 0; x < mapWidth; x++) {
        for (let y = 0; y < mapHeight; y++) {
            context.fillRect(x * cellWidth, y * cellHeight, 3, 3);
        }
    }
}

const getRandomColor = () => {
    const hue = randomRange(0, 360);
    return hslToHex(hue, 40, 55);
}

const hslToHex = (h, s, l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

const randomRange = (min, max) => {
    let v = rng();
    return Math.round((max - min) * v) + min;
}

function mulberry32(seed) {
    return function() {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}