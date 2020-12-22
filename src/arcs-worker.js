/* eslint-env worker */
/* eslint no-restricted-globals: 1 */

const worker = function worker() {
  const error = (message) => ({ error: new Error(message) });

  const createScale = (transformer = (x) => x) => {
    let domainMin = 1;
    let domainMinTransformed = Math.log10(domainMin);
    let domainMax = 10;
    let domainMaxTransformed = Math.log10(domainMax);
    let domainSize = domainMaxTransformed - domainMinTransformed;

    let rangeMin = 0;
    let rangeStart = 0;
    let rangeMax = 1;
    let rangeEnd = 1;
    let rangeSize = 1;

    const scale = (value) =>
      Math.min(
        rangeMax,
        Math.max(
          rangeMin,
          rangeEnd -
            ((domainMaxTransformed - transformer(value)) / domainSize) *
              rangeSize
        )
      );

    scale.domain = (newDomain) => {
      if (newDomain.length === 0) return [domainMin, domainMax];

      domainMin = newDomain[0];
      domainMinTransformed = transformer(domainMin);

      domainMax = newDomain[1];
      domainMaxTransformed = transformer(domainMax);

      domainSize = domainMaxTransformed - domainMinTransformed || 1;

      return scale;
    };

    scale.range = (newRange) => {
      if (newRange.length === 0) return [rangeStart, rangeEnd];

      rangeStart = newRange[0];
      rangeEnd = newRange[1];
      rangeMin = Math.min(rangeStart, rangeEnd);
      rangeMax = Math.max(rangeStart, rangeEnd);

      rangeSize = rangeEnd - rangeStart;

      return scale;
    };

    return scale;
  };

  const getItemToCirclePoints = ({
    xScaleDomain,
    xScaleRange,
    trackY,
    trackWidth,
    trackHeight,
    startField,
    endField,
    isFlipped = false,
    minResolution = 10,
    minDistance = 2,
  }) => {
    const xScale = createScale().domain(xScaleDomain).range(xScaleRange);

    const getStart = !Number.isNaN(+startField)
      ? (item) => item.chrOffset + +item.fields[+startField]
      : (item) => item.xStart || item.chrOffset + +item.fields[1];

    const getEnd = !Number.isNaN(+endField)
      ? (item) => item.chrOffset + +item.fields[+endField]
      : (item) => item.xEnd || item.chrOffset + +item.fields[2];

    return (item) => {
      const points = [];

      const x1 = xScale(getStart(item));
      const x2 = xScale(getEnd(item));
      const distance = Math.abs(x1 - x2);

      // Points are too close. There's no point in drawing an arc
      if (distance < minDistance) return null;

      const h = (x2 - x1) / 2;
      const d = (x2 - x1) / 2;
      const r = (d * d + h * h) / (2 * h);
      const cx = (x1 + x2) / 2;
      let cy = trackHeight - h + r;

      const limitX1 = Math.max(0, x1);
      const limitX2 = Math.min(trackWidth, x2);

      const startAngle = Math.acos(
        Math.min(Math.max(-(limitX1 - cx) / r, -1), 1)
      );
      let endAngle = Math.acos(Math.min(Math.max(-(limitX2 - cx) / r, -1), 1));

      if (isFlipped) {
        cy = 0;
        endAngle = -Math.PI;
        points.push([x1, 0]);
      } else {
        points.push([x1, trackY + trackHeight]);
      }

      const resolution = Math.ceil(
        Math.max(minResolution, minResolution * Math.log10(distance))
      );

      const angleScale = createScale()
        .domain([0, resolution - 1])
        .range([startAngle, endAngle]);

      for (let k = 0; k < resolution; k++) {
        const ax = r * Math.cos(angleScale(k));
        const ay = r * Math.sin(angleScale(k));

        const rx = cx - ax;
        const ry = cy - ay;

        points.push([rx, ry]);
      }

      return points;
    };
  };

  const getItemToEllipsesPoints = ({
    maxWidth,
    xScaleDomain,
    xScaleRange,
    trackHeight,
    startField,
    endField,
    isFlipped = false,
    minResolution = 10,
    minDistance = 1,
  }) => {
    const heightScale = createScale()
      .domain([0, maxWidth])
      .range([trackHeight / 4, (3 * trackHeight) / 4]);

    const xScale = createScale().domain(xScaleDomain).range(xScaleRange);

    const getStart = !Number.isNaN(+startField)
      ? (item) => item.chrOffset + item.fields[+startField]
      : (item) => item.xStart || item.chrOffset + item.fields[1];

    const getEnd = !Number.isNaN(+endField)
      ? (item) => item.chrOffset + item.fields[+endField]
      : (item) => item.xEnd || item.chrOffset + item.fields[2];

    return (item) => {
      const points = [];

      const x1 = xScale(getStart(item));
      const x2 = xScale(getEnd(item));
      const distance = Math.abs(x1 - x2);

      // Points are too close. There's no point in drawing an arc
      if (distance < minDistance) return null;

      const h = heightScale(item.fields[2] - +item.fields[1]);
      const r = (x2 - x1) / 2;

      const cx = (x1 + x2) / 2;
      let cy = trackHeight;
      const startAngle = 0;
      let endAngle = Math.PI;

      if (isFlipped) {
        cy = 0;
        endAngle = -Math.PI;
        points.push([x1, 0]);
      } else {
        points.push([x1, trackHeight]);
      }

      const resolution = Math.ceil(
        Math.max(minResolution, minResolution * Math.log10(distance))
      );

      const angleScale = createScale()
        .domain([0, resolution - 1])
        .range([startAngle, endAngle]);

      for (let k = 0; k < resolution; k++) {
        const ax = r * Math.cos(angleScale(k));
        const ay = h * Math.sin(angleScale(k));

        const rx = cx - ax;
        const ry = cy - ay;

        points.push([rx, ry]);
      }

      return points;
    };
  };

  const pointsToBuffers = (itemPoints) => {
    const numbers = itemPoints.reduce(
      (sum, points) => {
        // `+2` because we duplicate the start and end point
        // `*2` because we duplicate each point to have a positive and negatuve
        // offset for the triangles
        sum.numTotalPoints += (points.length + 2) * 2;
        sum.numIndices += (points.length - 1) * 6;
        return sum;
      },
      { numTotalPoints: 0, numIndices: 0 }
    );

    // `*2` because each point consists of a x,y coordinate
    const positions = new Float32Array(numbers.numTotalPoints * 2);
    const offsets = new Float32Array(numbers.numTotalPoints);
    const indices = new Uint32Array(numbers.numIndices);

    let k = 0;
    let l = 0;
    let m = 0;
    let numPrevPoints = 0;
    itemPoints.forEach((pointsOnArc) => {
      if (pointsOnArc.length < 2) return;

      // Duplicate first point
      positions[k] = pointsOnArc[0][0];
      positions[k + 1] = pointsOnArc[0][1];
      positions[k + 2] = pointsOnArc[0][0];
      positions[k + 3] = pointsOnArc[0][1];
      k += 4;

      offsets[l] = 1;
      offsets[l + 1] = -1;
      l += 2;

      pointsOnArc.forEach((point) => {
        positions[k] = point[0];
        positions[k + 1] = point[1];
        positions[k + 2] = point[0];
        positions[k + 3] = point[1];
        k += 4;

        offsets[l] = 1;
        offsets[l + 1] = -1;
        l += 2;
      });

      // Duplicate last point
      positions[k] = pointsOnArc[pointsOnArc.length - 1][0];
      positions[k + 1] = pointsOnArc[pointsOnArc.length - 1][1];
      positions[k + 2] = pointsOnArc[pointsOnArc.length - 1][0];
      positions[k + 3] = pointsOnArc[pointsOnArc.length - 1][1];
      k += 4;

      offsets[l] = 1;
      offsets[l + 1] = -1;
      l += 2;

      for (let i = 0; i < pointsOnArc.length - 1; i++) {
        const a = numPrevPoints + i * 2; // `2`  because we duplicated all points
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices[m] = a;
        indices[m + 1] = b;
        indices[m + 2] = c;
        indices[m + 3] = c;
        indices[m + 4] = b;
        indices[m + 5] = d;
        m += 6;
      }
      // Each line adds an additional start and end point, hence, `numPoints + 2`
      // And again, since all points are duplicated, we have `* 2`
      numPrevPoints += (pointsOnArc.length + 2) * 2;
    });

    return { positions, offsets, indices };
  };

  self.onmessage = function onmessage(event) {
    const itemToPoints =
      event.data.arcStyle === 'circle'
        ? getItemToCirclePoints(event.data)
        : getItemToEllipsesPoints(event.data);

    const itemFilter =
      event.data.filterSet && event.data.filterField
        ? (item) =>
            event.data.filterSet.has(item.fields[event.data.filterField])
        : () => true;

    try {
      const itemPoints = event.data.items
        .filter(itemFilter)
        .map(itemToPoints)
        .filter((x) => x);
      console.log('itemPoints', itemPoints.length);
      const buffers = pointsToBuffers(itemPoints);

      self.postMessage(
        {
          positions: buffers.positions,
          offsets: buffers.offsets,
          indices: buffers.indices,
        },
        [
          buffers.positions.buffer,
          buffers.offsets.buffer,
          buffers.indices.buffer,
        ]
      );
    } catch (err) {
      self.postMessage(error(`Failed to compute circle arcs: ${err}`));
    }
  };
};

export default worker;
