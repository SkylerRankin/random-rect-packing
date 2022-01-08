## random-rect-packing

Exploring some options for generating a set of non-overlapping randomly placed blocks that fully fill a rectangular space. Similar to rectangle packing problem, but want a fully filled space and want to procedurally set the rectangle sizes. This is planned for use in a constraint propagation problem where the problem space is better divided into touching sections, but should be divided in an organic way.

Some ideal constraints on the generation:
- Be able to control the minimum and maximum block dimensions.
- Seeded random generation.
- Uniform distribution of block sizes.
---
## Usage
Open `index.html` in a browser, generation will automatically start.

See `script.js` to switch between algorithms and tweak values.

---
## Approach #1 : Column by Column

This method works by working maintaining a set of points that are potential starting points for rectangles. Each iteration, the left-most and top-most point is chosen as the upper left hand corner of the next rectangle.

Algorithm Outline
- Maintain a set of points `s`, and initialize it with the point `(0, 0)`.
- While `s` is not empty:
    - Find the point `p` in `s` that has lowest `x` coordinate and lowest `y` coordinate, with a precedence of `x` over `y` for breaking ties.
    - Let `p` be the top left corner of a new rectangle. Check the available space in the positive `y` direction, starting at `p`.
    - Create the new rectangle with corner at `p` and with a random size constrained by the available space and edge of the map.
    - Add the corners of this new rectangle to `s`.
    - Remove all points `p` in `s` that are on already created rectangles.

### Analysis
Benefits of this method:
- Low memory footprint: The set of potential corners is relatively small and only scales with some dimension of the total space since the algorithm works in columns.
- Decently fast: There is little searching for collisions that is needed since blocks can always extend in the positive x direction without fear of collision.
- Size constraints are pretty consistently enforced.

Downsides of this method:
- Highly non-uniform at with large difference between min and max block sizes (see below).
- Notable one-block thick streaks in almost all configurations.
- Unlikely to get long vertical blocks, mostly horizontal.

### Results

There result is visually uniform and follows the size constraints in the majority of cases.

`mapSize=(100, 50), minBlockSize=3, maxBlockSize=6`
![](/res/col1.png)

The fault in this method becomes clear with a large gap between minimum and maximum block sizes. In those situations, it becomes less and less likely that there will be room for a large block, causing more blocks to be wide and narrow in order to fit into the left over space from the larger blocks in the previous column.

`mapSize=(100, 50), minBlockSize=2, maxBlockSize=20`
![](/res/col2.png)

---
## Approach #2 : Expand from Point

This method works by simply selecting a cell in the grid at random and expanding a rectangle out from that point into the available surrounding space.

Algorithm Outline
- Maintain a set `s` of points that have not yet been used in a rectangle.
- While `s` is not empty:
    - Select a random point `p` from `s`.
    - Find the available space around `p`.
    - Create a rectangle centered around `p` with random size but fitting in the available space.
    - Remove all points in the created rectangle from `s`.

### Analysis
Benefits of this method:
- Highly uniform distribution.
- Conforms to size constraints in most cases.
- Consistent result with any block constraint configuration.

Downsides of this method:
- Memory burden to maintain list of remaining cells to fill. Grows linearly with the size of the map.
- Slowed down by need to fully search areas when expanding rectangles. This speed is linear to the maximum block size.
- Minimum block size not always possible to abide by since blocks are not aware of the small gaps they create when expanding.

### Results
`mapSize=(100, 50), minBlockSize=3, maxBlockSize=6`
![](/res/grow.png)

`mapSize=(100, 50), minBlockSize=3, maxBlockSize=20`
![](/res/grow2.png)

---
## Algorithms/Code Used
- [CCapture](https://github.com/spite/ccapture.js/) to capture the canvas animation as a `webm` file.
- Mullberry32 as a 32 bit PRNG.
- [Fisher-Yates](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle) for an efficient array shuffle.
- [HSL to RGB](https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB_alternative) conversion.