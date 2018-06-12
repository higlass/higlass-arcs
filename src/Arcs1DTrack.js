const Arcs1DTrack = (HGC, ...args) => {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"',
    );
  }

  class Arcs1DTrackClass extends HGC.tracks.HorizontalLine1DPixiTrack {
    constructor(
      scene, trackConfig, dataConfig, handleTilesetInfoReceived, animate,
    ) {
      super(
        scene,
        dataConfig,
        handleTilesetInfoReceived,
        trackConfig.options,
        animate,
      );
    }

    initTile(tile) {
      console.log('initializing tile:', tile);
    }

    renderTile(tile) {
      console.log('rendering tile', tile);
    }

    draw() {
      for (const tile of this.visibleAndFetchedTiles()) {
        tile.graphics.clear();
        const tilePos = tile.tileData.tilePos[0];
        const items = tile.tileData[tilePos];
        console.log('items:', items);

        for (let i = 0; i < 3; i++) {
          const item = items[i];
          const x1 = this._xScale(item.xStart);
          const x2 = this._xScale(item.xEnd);

          tile.graphics.beginFill(0xff0000);
          tile.graphics.lineStyle(1, 0xff0000, 1);

          tile.graphics.moveTo(x1, this.position[1] + this.dimensions[1]);

          const h = Math.min(this.dimensions[1], (x2 - x1) / 2);
          const d = (x2 - x1) / 2;
          const r = ((d * d) + (h * h)) / (2 * h);
          const cx = (x1 + x2) / 2;
          const cy = this.position[1];
          const startAngle = Math.acos((x1 - cx) / r);
          const endAngle = Math.acos((x2 - cx) / r);

          console.log('this.position[1]:', this.position[1]);
          console.log('cx:', cx, 'cy', cy);
          console.log('startAngle:', startAngle);
          console.log('endAngle:', endAngle);

          console.log('h:', h, 'r:', r, 'd:', d);
          console.log('x1', x1, 'x2', x2, x2 - x1);
          /*
          tile.graphics.arcTo((x1 + x2) / 2, this.position[1],
            x2, this.position[1] + this.dimensions[1], r);
          */
          tile.graphics.arc(cx, cy, r, startAngle, endAngle);

          // tile.graphics.drawRect(x1, this.position[0], 10, 10);
        }

        this.renderTile(tile);
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
  datatype: ['arcs'],
  orientation: '2d',
  name: 'Arcs1D',
  thumbnail: new DOMParser().parseFromString(icon, 'text/xml').documentElement,
  availableOptions: [
    'labelPosition',
    'labelColor',
    'labelTextOpacity',
    'labelBackgroundOpacity',
    'trackBorderWidth',
    'trackBorderColor',
  ],
  defaultOptions: {
    labelColor: 'black',
    labelPosition: 'hidden',
    trackBorderWidth: 0,
    trackBorderColor: 'black',
  },
};

export default Arcs1DTrack;
