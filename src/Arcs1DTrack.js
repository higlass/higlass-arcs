import { scaleLinear, scaleLog } from 'd3-scale';

const Arcs1DTrack = (HGC, ...args) => {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"',
    );
  }

  class Arcs1DTrackClass extends HGC.tracks.HorizontalLine1DPixiTrack {
    initTile(tile) {
      // console.log('initializing tile:', tile);
    }

    renderTile(tile) {

    }

    maxWidth() {
      let maxWidth = 0;

      for (const tile of Object.values(this.fetchedTiles)) {
        for (const item of tile.tileData) {
          maxWidth = Math.max(
            maxWidth,
            item.fields[2] - item.fields[1],
          );
        }
      }

      return maxWidth;
    }

    drawCircle(graphics, item, opacityScale) {
      const x1 = this._xScale(item.chrOffset + item.fields[1]);
      const x2 = this._xScale(item.chrOffset + item.fields[2]);

      // const h = Math.min(this.dimensions[1], (x2 - x1) / 2);
      const h = (x2 - x1) / 2;
      // const h = this.dimensions[1];
      const d = (x2 - x1) / 2;
      const r = ((d * d) + (h * h)) / (2 * h);
      const cx = (x1 + x2) / 2;
      let cy = this.dimensions[1] - h + r;

      // tile.graphics.beginFill(0xff0000);
      graphics.moveTo(x1, this.position[1] + this.dimensions[1]);

      const limitX1 = Math.max(0, x1);
      const limitX2 = Math.min(this.dimensions[0], x2);


      const opacity = opacityScale(h);
      // const opacity = 1;
      // console.log('opacity', opacity);
      graphics.lineStyle(this.strokeWidth, this.strokeColor, opacity);
      const startAngle = Math.acos(Math.min(Math.max(-(limitX1 - cx) / r, -1), 1));
      let endAngle = Math.acos(Math.min(Math.max(-(limitX2 - cx) / r, -1), 1));
      // const startAngle = 0;
      // const endAngle = 2 * Math.PI;

      if (this.flip) {
        cy = 0;
        endAngle = -Math.PI;
        graphics.moveTo(x1, 0);
      }

      const resolution = 10;
      const angleScale = scaleLinear().domain([0, resolution - 1])
        .range([startAngle, endAngle]);

      // console.log('r:', r);
      for (let k = 0; k < resolution; k++) {
        const ax = r * Math.cos(angleScale(k));
        const ay = r * Math.sin(angleScale(k));
        // console.log('as', angleScale(i), ax, ay);

        const rx = cx - ax;
        const ry = cy - ay;

        // console.log('rx:', rx, 'ry', ry);
        graphics.lineTo(rx, ry);
      }
    }

    drawEllipse(graphics, item, heightScale, opacityScale) {
      const x1 = this._xScale(item.chrOffset + item.fields[1]);
      const x2 = this._xScale(item.chrOffset + item.fields[2]);

      const h = heightScale(item.fields[2] - item.fields[1]);
      const r = (x2 - x1) / 2;

      const cx = (x1 + x2) / 2;
      let cy = this.dimensions[1];
      const startAngle = 0;
      let endAngle = Math.PI;

      graphics.moveTo(x1, this.dimensions[1]);

      if (this.flip) {
        cy = 0;
        endAngle = -Math.PI;
        graphics.moveTo(x1, 0);
      }

      const opacity = opacityScale(h);
      graphics.lineStyle(this.strokeWidth, this.strokeColor, opacity);

      const resolution = 10;
      const angleScale = scaleLinear().domain([0, resolution - 1])
        .range([startAngle, endAngle]);

      for (let k = 0; k < resolution; k++) {
        const ax = r * Math.cos(angleScale(k));
        const ay = h * Math.sin(angleScale(k));

        const rx = cx - ax;
        const ry = cy - ay;

        graphics.lineTo(rx, ry);
      }
    }

    drawTile(tile) {
      // const tilePos = tile.tileData.tilePos[0];
      const items = tile.tileData;

      const maxWidth = this.maxWidth();
      const heightScale = scaleLinear()
        .domain([0, maxWidth])
        .range([this.dimensions[1] / 4, 3 * this.dimensions[1] / 4]);

      this.strokeColor = HGC.utils.colorToHex(
        this.options.strokeColor ? this.options.strokeColor : 'blue',
      );
      this.strokeWidth = this.options.strokeWidth ? this.options.strokeWidth : 2;

      this.flip = false;
      if (this.options.flip1D) {
        this.flip = this.options.flip1D === 'yes';
      }
      if (items) {
        tile.graphics.clear();
        // console.log('items.length', items.length);
        // console.log('length:', items.length);
        const opacityScale = scaleLog().domain([1, 1000]).range([1, 0.1]);

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (this.options.arcStyle === 'circle') {
            this.drawCircle(tile.graphics, item, opacityScale);
          } else {
            this.drawEllipse(tile.graphics, item, heightScale, opacityScale);
          }
          // tile.graphics.arc(cx, cy, r, startAngle, endAngle);

          // tile.graphics.drawRect(x1, this.position[0], 10, 10);
        }
      }
    }

    getMouseOverHtml() {

    }

    zoomed(newXScale, newYScale) {
      this.xScale(newXScale);
      this.yScale(newYScale);

      this.refreshTiles();
      this.draw();
    }
  }

  return new Arcs1DTrackClass(...args);
};

const icon = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="1.5"><path d="M4 2.1L.5 3.5v12l5-2 5 2 5-2v-12l-5 2-3.17-1.268" fill="none" stroke="currentColor"/><path d="M10.5 3.5v12" fill="none" stroke="currentColor" stroke-opacity=".33" stroke-dasharray="1,2,0,0"/><path d="M5.5 13.5V6" fill="none" stroke="currentColor" stroke-opacity=".33" stroke-width=".9969299999999999" stroke-dasharray="1.71,3.43,0,0"/><path d="M9.03 5l.053.003.054.006.054.008.054.012.052.015.052.017.05.02.05.024 4 2 .048.026.048.03.046.03.044.034.042.037.04.04.037.04.036.042.032.045.03.047.028.048.025.05.022.05.02.053.016.053.014.055.01.055.007.055.005.055v.056l-.002.056-.005.055-.008.055-.01.055-.015.054-.017.054-.02.052-.023.05-.026.05-.028.048-.03.046-.035.044-.035.043-.038.04-4 4-.04.037-.04.036-.044.032-.045.03-.046.03-.048.024-.05.023-.05.02-.052.016-.052.015-.053.012-.054.01-.054.005-.055.003H8.97l-.053-.003-.054-.006-.054-.008-.054-.012-.052-.015-.052-.017-.05-.02-.05-.024-4-2-.048-.026-.048-.03-.046-.03-.044-.034-.042-.037-.04-.04-.037-.04-.036-.042-.032-.045-.03-.047-.028-.048-.025-.05-.022-.05-.02-.053-.016-.053-.014-.055-.01-.055-.007-.055L4 10.05v-.056l.002-.056.005-.055.008-.055.01-.055.015-.054.017-.054.02-.052.023-.05.026-.05.028-.048.03-.046.035-.044.035-.043.038-.04 4-4 .04-.037.04-.036.044-.032.045-.03.046-.03.048-.024.05-.023.05-.02.052-.016.052-.015.053-.012.054-.01.054-.005L8.976 5h.054zM5 10l4 2 4-4-4-2-4 4z" fill="currentColor"/><path d="M7.124 0C7.884 0 8.5.616 8.5 1.376v3.748c0 .76-.616 1.376-1.376 1.376H3.876c-.76 0-1.376-.616-1.376-1.376V1.376C2.5.616 3.116 0 3.876 0h3.248zm.56 5.295L5.965 1H5.05L3.375 5.295h.92l.354-.976h1.716l.375.975h.945zm-1.596-1.7l-.592-1.593-.58 1.594h1.172z" fill="currentColor"/></svg>';


Arcs1DTrack.config = {
  type: '1d-arcs',
  datatype: ['arcs', 'bedlike'],
  orientation: '1d',
  name: 'Arcs1D',
  thumbnail: new DOMParser().parseFromString(icon, 'text/xml').documentElement,
  availableOptions: [
    'arcStyle',
    'flip1D',
    'labelPosition',
    'labelColor',
    'labelTextOpacity',
    'labelBackgroundOpacity',
    'strokeColor',
    'strokeWidth',
    'trackBorderWidth',
    'trackBorderColor',
  ],
  defaultOptions: {
    arcStyle: 'ellipse',
    flip1D: 'no',
    labelColor: 'black',
    labelPosition: 'hidden',
    strokeColor: 'black',
    strokeWidth: 1,
    trackBorderWidth: 0,
    trackBorderColor: 'black',
  },
};

export default Arcs1DTrack;
