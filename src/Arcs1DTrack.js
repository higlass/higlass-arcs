import { createWorker } from '@flekschas/utils';

import arcsWorkerFn from './arcs-worker';
import VS from './arc.vs';
import FS from './arc.fs';

const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;
const MIN_RESOLUTION = 10;

const scaleGraphics = (graphics, xScale, drawnAtScale) => {
  const tileK =
    (drawnAtScale.domain()[1] - drawnAtScale.domain()[0]) /
    (xScale.domain()[1] - xScale.domain()[0]);
  const newRange = xScale.domain().map(drawnAtScale);

  const posOffset = newRange[0];
  graphics.scale.x = tileK;
  graphics.position.x = -posOffset * tileK;
};

export default function Arcs1DTrack(HGC, ...args) {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"'
    );
  }

  const { PIXI } = HGC.libraries;
  const { scaleLinear, scaleLog } = HGC.libraries.d3Scale;

  class Arcs1DTrackClass extends HGC.tracks.HorizontalLine1DPixiTrack {
    constructor(context, options) {
      super(context, options);
      this.updateOptions();

      this.pLoading = new PIXI.Graphics();
      this.pLoading.position.x = 0;
      this.pLoading.position.y = 0;
      this.pMasked.addChild(this.pLoading);

      this.loadIndicator = new PIXI.Text('Loading...', {
        fontSize: this.labelSize || 10,
        fill: 0x808080,
      });
      this.pLoading.addChild(this.loadIndicator);

      this.arcsWorker = createWorker(arcsWorkerFn);
    }

    updateOptions() {
      this.strokeColor = HGC.utils.colorToHex(
        this.options.strokeColor ? this.options.strokeColor : 'blue'
      );

      this.strokeColorRgbNorm = this.options.strokeColor
        ? HGC.utils
            .colorToRgba(this.options.strokeColor)
            .slice(0, 3)
            .map((x) => Math.min(1, Math.max(0, x / 255)))
        : [0, 0, 0];

      this.strokeWidth = this.options.strokeWidth
        ? this.options.strokeWidth
        : 2;

      this.strokeOpacity = this.options.strokeOpacity
        ? this.options.strokeOpacity
        : 1;

      this.flip = this.options.flip1D === 'yes';

      this.filterSet =
        this.options.filter && this.options.filter.set
          ? this.options.filter.set.reduce((s, include) => {
              s.add(include);
              return s;
            }, new Set())
          : null;

      this.filterField = this.options.filter && this.options.filter.field;

      this.filter =
        this.filterSet && this.filterField
          ? (item) => this.filterSet.has(item.fields[this.filterField])
          : () => true;
    }

    destroy() {
      if (this.arcsWorker) this.arcsWorker.terminate();
    }

    initTile() {}

    renderTile() {}

    maxWidth() {
      let maxWidth = 1;

      for (const tile of Object.values(this.fetchedTiles)) {
        if (tile.tileData && !tile.tileData.error) {
          for (const item of tile.tileData) {
            maxWidth = Math.max(maxWidth, item.fields[2] - item.fields[1]);
          }
        }
      }

      return maxWidth;
    }

    drawCircleAsSvg(item, opacityScale, getStart, getEnd) {
      const x1 = this._xScale(getStart(item));
      const x2 = this._xScale(getEnd(item));
      const distance = Math.abs(x1 - x2);

      const h = (x2 - x1) / 2;
      const d = (x2 - x1) / 2;
      const r = (d * d + h * h) / (2 * h);
      const cx = (x1 + x2) / 2;
      let cy = this.dimensions[1] - h + r;

      let polyStr = `M${x1},${this.position[1] + this.dimensions[1]}`;

      const limitX1 = Math.max(0, x1);
      const limitX2 = Math.min(this.dimensions[0], x2);

      const opacity = opacityScale(h) * this.strokeOpacity;
      const startAngle = Math.acos(
        Math.min(Math.max(-(limitX1 - cx) / r, -1), 1)
      );
      let endAngle = Math.acos(Math.min(Math.max(-(limitX2 - cx) / r, -1), 1));

      if (this.flip) {
        cy = 0;
        endAngle = -Math.PI;
        polyStr += `M${x1},0`;
      }

      const resolution = Math.ceil(
        Math.max(MIN_RESOLUTION, MIN_RESOLUTION * Math.log10(distance))
      );
      const angleScale = scaleLinear()
        .domain([0, resolution - 1])
        .range([startAngle, endAngle]);

      for (let k = 0; k < resolution; k++) {
        const ax = r * Math.cos(angleScale(k));
        const ay = r * Math.sin(angleScale(k));

        const rx = cx - ax;
        const ry = cy - ay;

        polyStr += `L${rx},${ry}`;
      }

      this.polys.push({
        polyStr,
        opacity,
      });
    }

    drawEllipseAsSvg(item, opacityScale, getStart, getEnd, heightScale) {
      const x1 = this._xScale(getStart(item));
      const x2 = this._xScale(getEnd(item));
      const distance = Math.abs(x1 - x2);

      const h = heightScale(item.fields[2] - +item.fields[1]);
      const r = (x2 - x1) / 2;

      const cx = (x1 + x2) / 2;
      let cy = this.dimensions[1];
      const startAngle = 0;
      let endAngle = Math.PI;

      let polyStr = '';
      polyStr += `M${x1},${this.dimensions[1]}`;

      if (this.flip) {
        cy = 0;
        endAngle = -Math.PI;
        polyStr += `M${x1},0`;
      }

      const opacity = opacityScale(h) * this.strokeOpacity;

      const resolution = Math.ceil(
        Math.max(MIN_RESOLUTION, MIN_RESOLUTION * Math.log10(distance))
      );
      const angleScale = scaleLinear()
        .domain([0, resolution - 1])
        .range([startAngle, endAngle]);

      for (let k = 0; k < resolution; k++) {
        const ax = r * Math.cos(angleScale(k));
        const ay = h * Math.sin(angleScale(k));

        const rx = cx - ax;
        const ry = cy - ay;

        polyStr += `L${rx},${ry}`;
      }

      this.polys.push({
        polyStr,
        opacity,
      });
    }

    drawTileAsSvg(tile) {
      const items = tile.tileData.filter(this.filter);

      const maxWidth = this.maxWidth();
      const heightScale = scaleLinear()
        .domain([0, maxWidth])
        .range([this.dimensions[1] / 4, (3 * this.dimensions[1]) / 4]);

      const getStart = !Number.isNaN(+this.options.startField)
        ? (item) => item.chrOffset + +item.fields[+this.options.startField]
        : (item) => item.xStart || item.chrOffset + +item.fields[1];

      const getEnd = !Number.isNaN(+this.options.endField)
        ? (item) => item.chrOffset + +item.fields[+this.options.endField]
        : (item) => item.xEnd || item.chrOffset + +item.fields[2];

      if (items) {
        tile.graphics.clear();
        const opacityScale = scaleLog().domain([1, 1000]).range([1, 0.1]);

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          if (this.options.completelyContained) {
            const x1 = this._xScale(getStart(item));
            const x2 = this._xScale(getEnd(item));

            if (x1 < this._xScale.range()[0] || x2 > this._xScale.range()[1]) {
              // one end of this
              continue;
            }
          }

          if (this.options.arcStyle === 'circle') {
            this.drawCircleAsSvg(item, opacityScale, getStart, getEnd);
          } else {
            this.drawEllipseAsSvg(
              item,
              opacityScale,
              getStart,
              getEnd,
              heightScale
            );
          }
        }
      }
    }

    getBuffers(items) {
      if (!this.arcsWorker) return Promise.resolve([]);

      return new Promise((resolve, reject) => {
        this.arcsWorker.onmessage = (e) => {
          if (e.data.error) reject(e.data.error);
          else resolve(e.data);
        };

        const [trackWidth, trackHeight] = this.dimensions;

        this.arcsWorker.postMessage({
          items,
          filterSet: this.filterSet,
          filterField: this.filterField,
          arcStyle: this.options.arcStyle,
          maxWidth: this.maxWidth(),
          xScaleDomain: this._xScale.domain(),
          xScaleRange: this._xScale.range(),
          trackY: this.position[1],
          trackWidth,
          trackHeight,
          startField: this.options.startField,
          endField: this.options.endField,
          isFlipped: this.flip,
          minResolution: MIN_RESOLUTION,
        });
      });
    }

    updateExistingGraphics() {
      this.updateLoadIndicator();

      this.drawnAtScale = scaleLinear()
        .domain([...this.xScale().domain()])
        .range([...this.xScale().range()]);

      const tiles = Object.values(this.fetchedTiles);

      this.getBuffers(tiles.flatMap((tile) => tile.tileData)).then(
        ({ positions, offsets, indices }) => {
          const uniforms = new PIXI.UniformGroup({
            uColor: [
              ...this.strokeColorRgbNorm.map((c) => c * this.strokeOpacity),
              this.strokeOpacity,
            ],
            uWidth: this.strokeWidth,
            uMiter: 1,
          });

          const shader = PIXI.Shader.from(VS, FS, uniforms);

          const geometry = new PIXI.Geometry();
          const numCoords = 2;
          const numVerticesPerPoint = 2;
          geometry.addAttribute(
            'aPrevPosition',
            positions,
            2, // size
            false, // normalize
            PIXI.TYPES.FLOAT, // type
            FLOAT_BYTES * numCoords, // stride
            0 // offset/start
          );
          geometry.addAttribute(
            'aCurrPosition',
            positions,
            2, // size
            false, // normalize
            PIXI.TYPES.FLOAT, // type
            FLOAT_BYTES * numCoords, // stride
            // note that each point is duplicated, hence we need to skip over the first two
            FLOAT_BYTES * numCoords * numVerticesPerPoint // offset/start
          );
          geometry.addAttribute(
            'aNextPosition',
            positions,
            2, // size
            false, // normalize
            PIXI.TYPES.FLOAT, // type
            FLOAT_BYTES * 2, // stride
            // note that each point is duplicated, hence we need to skip over the first four
            FLOAT_BYTES * numCoords * numVerticesPerPoint * 2 // offset/start
          );
          geometry.addAttribute('aOffset', offsets, 1);
          geometry.addIndex(indices);

          const mesh = new PIXI.Mesh(geometry, shader);

          const newGraphics = new PIXI.Graphics();
          newGraphics.addChild(mesh);

          // eslint-disable-next-line
          this.pMain.x = this.position[0];

          if (this.arcsGraphics) {
            this.pMain.removeChild(this.arcsGraphics);
            this.arcsGraphics.destroy();
          }

          this.pMain.addChild(newGraphics);
          this.arcsGraphics = newGraphics;

          scaleGraphics(this.arcsGraphics, this._xScale, this.drawnAtScale);

          this.draw();
          this.animate();
        }
      );
    }

    rerender(newOptions) {
      this.options = newOptions;
      this.updateOptions();
      this.updateExistingGraphics();
    }

    updateLoadIndicator() {
      const [left, top] = this.position;
      this.pLoading.position.x = left + 6;
      this.pLoading.position.y = top + 6;

      if (this.fetching.size) {
        this.pLoading.addChild(this.loadIndicator);
      } else {
        this.pLoading.removeChild(this.loadIndicator);
      }
    }

    refreshTiles() {
      super.refreshTiles();
      this.updateLoadIndicator();
    }

    getMouseOverHtml() {}

    zoomed(newXScale, newYScale) {
      this.xScale(newXScale);
      this.yScale(newYScale);

      if (this.arcsGraphics) {
        scaleGraphics(this.arcsGraphics, newXScale, this.drawnAtScale);
      }

      this.refreshTiles();
      this.draw();
    }

    /**
     * Export an SVG representation of this track
     *
     * @returns {Array} The two returned DOM nodes are both SVG
     * elements [base,track]. Base is a parent which contains track as a
     * child. Track is clipped with a clipping rectangle contained in base.
     *
     */
    exportSVG() {
      let track = null;
      let base = null;

      [base, track] = super.superSVG();

      base.setAttribute('class', 'exported-arcs-track');
      const output = document.createElement('g');

      track.appendChild(output);
      output.setAttribute(
        'transform',
        `translate(${this.position[0]},${this.position[1]})`
      );

      const strokeColor = this.options.strokeColor
        ? this.options.strokeColor
        : 'blue';
      const strokeWidth = this.options.strokeWidth
        ? this.options.strokeWidth
        : 2;

      this.visibleAndFetchedTiles().forEach((tile) => {
        this.polys = [];

        // call drawTile with storePolyStr = true so that
        // we record path strings to use in the SVG
        this.drawTileAsSvg(tile, true);

        for (const { polyStr, opacity } of this.polys) {
          const g = document.createElement('path');
          g.setAttribute('fill', 'transparent');
          g.setAttribute('stroke', strokeColor);
          g.setAttribute('stroke-width', strokeWidth);
          g.setAttribute('opacity', opacity);

          g.setAttribute('d', polyStr);
          output.appendChild(g);
        }
      });
      return [base, track];
    }
  }

  return new Arcs1DTrackClass(...args);
}

const icon =
  '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="1.5"><path d="M4 2.1L.5 3.5v12l5-2 5 2 5-2v-12l-5 2-3.17-1.268" fill="none" stroke="currentColor"/><path d="M10.5 3.5v12" fill="none" stroke="currentColor" stroke-opacity=".33" stroke-dasharray="1,2,0,0"/><path d="M5.5 13.5V6" fill="none" stroke="currentColor" stroke-opacity=".33" stroke-width=".9969299999999999" stroke-dasharray="1.71,3.43,0,0"/><path d="M9.03 5l.053.003.054.006.054.008.054.012.052.015.052.017.05.02.05.024 4 2 .048.026.048.03.046.03.044.034.042.037.04.04.037.04.036.042.032.045.03.047.028.048.025.05.022.05.02.053.016.053.014.055.01.055.007.055.005.055v.056l-.002.056-.005.055-.008.055-.01.055-.015.054-.017.054-.02.052-.023.05-.026.05-.028.048-.03.046-.035.044-.035.043-.038.04-4 4-.04.037-.04.036-.044.032-.045.03-.046.03-.048.024-.05.023-.05.02-.052.016-.052.015-.053.012-.054.01-.054.005-.055.003H8.97l-.053-.003-.054-.006-.054-.008-.054-.012-.052-.015-.052-.017-.05-.02-.05-.024-4-2-.048-.026-.048-.03-.046-.03-.044-.034-.042-.037-.04-.04-.037-.04-.036-.042-.032-.045-.03-.047-.028-.048-.025-.05-.022-.05-.02-.053-.016-.053-.014-.055-.01-.055-.007-.055L4 10.05v-.056l.002-.056.005-.055.008-.055.01-.055.015-.054.017-.054.02-.052.023-.05.026-.05.028-.048.03-.046.035-.044.035-.043.038-.04 4-4 .04-.037.04-.036.044-.032.045-.03.046-.03.048-.024.05-.023.05-.02.052-.016.052-.015.053-.012.054-.01.054-.005L8.976 5h.054zM5 10l4 2 4-4-4-2-4 4z" fill="currentColor"/><path d="M7.124 0C7.884 0 8.5.616 8.5 1.376v3.748c0 .76-.616 1.376-1.376 1.376H3.876c-.76 0-1.376-.616-1.376-1.376V1.376C2.5.616 3.116 0 3.876 0h3.248zm.56 5.295L5.965 1H5.05L3.375 5.295h.92l.354-.976h1.716l.375.975h.945zm-1.596-1.7l-.592-1.593-.58 1.594h1.172z" fill="currentColor"/></svg>';

Arcs1DTrack.config = {
  type: '1d-arcs',
  datatype: ['bedlike'],
  orientation: '1d-horizontal',
  name: 'Arcs1D',
  thumbnail: new DOMParser().parseFromString(icon, 'text/xml').documentElement,
  availableOptions: [
    'arcStyle',
    'completelyContained',
    'flip1D',
    'labelPosition',
    'labelColor',
    'labelTextOpacity',
    'labelBackgroundOpacity',
    'strokeColor',
    'strokeOpacity',
    'strokeWidth',
    'trackBorderWidth',
    'trackBorderColor',
    'startField',
    'endField',
  ],
  defaultOptions: {
    arcStyle: 'ellipse',
    completelyContained: false,
    flip1D: 'no',
    labelColor: 'black',
    labelPosition: 'hidden',
    strokeColor: 'black',
    strokeOpacity: 1,
    strokeWidth: 1,
    trackBorderWidth: 0,
    trackBorderColor: 'black',
  },
  optionsInfo: {
    arcStyle: {
      name: 'Arc Style',
      inlineOptions: {
        circle: {
          name: 'Circle',
          value: 'circle',
        },
        ellipse: {
          name: 'Ellipse',
          value: 'ellipse',
        },
      },
    },
    completelyContained: {
      name: 'Only whole interactions',
      inlineOptions: {
        yes: {
          name: 'Yes',
          value: true,
        },
        no: {
          name: 'No',
          value: false,
        },
      },
    },
    flip1D: {
      name: 'Flip vertically',
      inlineOptions: {
        yes: {
          name: 'Yes',
          value: 'yes',
        },
        no: {
          name: 'No',
          value: 'no',
        },
      },
    },
  },
};
