import { geoMercator } from 'd3-geo';

const GeoJsonTrack = (HGC, ...args) => {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"',
    );
  }

  class GeoJsonTrackClass extends HGC.tracks.Annotations2dTrack {
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

      switch (this.options.projection) {
        case 'mercator':
        default:
          this.projection = geoMercator();
          break;
      }

      this.updateProjection();
    }

    /* --------------------------- Getter / Setter ---------------------------- */

    prepAnnotation(graphics, uid, startX, startY, width, height, td) {
      return {
        graphics,
        uid,
        annotation: {
          x: startX,
          y: startY,
          width,
          height,
          geometry: td.geometry,
        },
        dataPos: [td.xStart, td.xEnd, td.yStart, td.yEnd],
        importance: td.importance,
        info: td.properties,
      };
    }

    drawAnnotation({
      graphics, uid, annotation, dataPos, importance, info,
    }) {
      if (
        annotation.width < this.options.polygonMinBoundingSize
        || annotation.height < this.options.polygonMinBoundingSize
      ) {
        annotation.geometry.type = 'rect';
      }

      if (this.options.minSquareSize) {
        if (
          annotation.width < this.options.minSquareSize
          || annotation.height < this.options.minSquareSize
        ) {
          const half = this.options.minSquareSize / 2;
          annotation.x -= half;
          annotation.y -= half;
          annotation.width = this.options.minSquareSize;
          annotation.height = this.options.minSquareSize;
        }
      }

      switch (annotation.geometry.type) {
        case 'Polygon':
          this.drawPolygon(graphics, annotation.geometry.coordinates);
          break;

        default:
          this.drawRect(
            graphics,
            annotation.x,
            annotation.y,
            annotation.width,
            annotation.height,
          );
          break;
      }

      this.publish('annotationDrawn', {
        trackUuids: this.uuid,
        annotationUuid: uid,
        viewPos: [
          annotation.x, annotation.y, annotation.width, annotation.height,
        ],
        dataPos,
        importance,
        info,
      });

      this.drawnAnnotations[uid] = annotation;
    }

    /**
     * Draw a classic rectangle onto the given graphics object.
     * @param   {object}  graphics  PIXI graphics object to be drawn on.
     * @param   {number}  x  Top view coord to start drawing from.
     * @param   {number}  y  Left view coord to start drawing from.
     * @param   {number}  width  Width of the rectangle.
     * @param   {number}  height  Height of the rectangle.
     */
    drawRect(graphics, x, y, width, height) {
      graphics.drawRect(x, y, width, height);
    }

    /**
     * Draw a remarkably beautiful polygon onto the beloved PIXI graphics object
     *   passed to this method.
     * @param   {object}  graphics  PIXI graphics object to be drawn on.
     * @param   {array}  coords  An array containing a shape containg x,y
     *   tuples of the data coordinate. Check GeoJSON for the correct format.
     */
    drawPolygon(graphics, coords) {
      const pxCoords = coords.map(shape => shape
        .reduce((path, coord) => path.concat(this.projection(coord)), []));

      // Draw first polygon normally with fill
      graphics.drawPolygon(pxCoords.shift());

      // Remove all other polygons from the first filled polygon
      pxCoords.forEach((shape) => {
        graphics.drawPolygon(shape);
        graphics.addHole(shape);
      });

      // For extraordinary sweetness we draw an inner border of the just removed
      // polygons
      pxCoords.forEach((shape) => {
        graphics.endFill();
        graphics.drawPolygon(shape);
      });

      // And setup filling again for other beautiful polygons to be drawn
      this.setFill(graphics);
    }

    /**
     * Update the X,Y translator function. This is needed to adjust the scale
     *   and translation after pan&zoom. Currently only supported for geometric
     *   scales.
     */
    updateProjection() {
      this.projection
        .scale((this._xScale(180) - this._xScale(-180)) / 2 / Math.PI)
        .translate([this._xScale(0), this._yScale(0)]);
    }

    zoomed(newXScale, newYScale) {
      this.xScale(newXScale);
      this.yScale(newYScale);

      this.updateProjection();
      this.refreshTiles();
      this.draw();
    }
  }

  return new GeoJsonTrackClass(...args);
};

const icon = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="1.5"><path d="M4 2.1L.5 3.5v12l5-2 5 2 5-2v-12l-5 2-3.17-1.268" fill="none" stroke="currentColor"/><path d="M10.5 3.5v12" fill="none" stroke="currentColor" stroke-opacity=".33" stroke-dasharray="1,2,0,0"/><path d="M5.5 13.5V6" fill="none" stroke="currentColor" stroke-opacity=".33" stroke-width=".9969299999999999" stroke-dasharray="1.71,3.43,0,0"/><path d="M9.03 5l.053.003.054.006.054.008.054.012.052.015.052.017.05.02.05.024 4 2 .048.026.048.03.046.03.044.034.042.037.04.04.037.04.036.042.032.045.03.047.028.048.025.05.022.05.02.053.016.053.014.055.01.055.007.055.005.055v.056l-.002.056-.005.055-.008.055-.01.055-.015.054-.017.054-.02.052-.023.05-.026.05-.028.048-.03.046-.035.044-.035.043-.038.04-4 4-.04.037-.04.036-.044.032-.045.03-.046.03-.048.024-.05.023-.05.02-.052.016-.052.015-.053.012-.054.01-.054.005-.055.003H8.97l-.053-.003-.054-.006-.054-.008-.054-.012-.052-.015-.052-.017-.05-.02-.05-.024-4-2-.048-.026-.048-.03-.046-.03-.044-.034-.042-.037-.04-.04-.037-.04-.036-.042-.032-.045-.03-.047-.028-.048-.025-.05-.022-.05-.02-.053-.016-.053-.014-.055-.01-.055-.007-.055L4 10.05v-.056l.002-.056.005-.055.008-.055.01-.055.015-.054.017-.054.02-.052.023-.05.026-.05.028-.048.03-.046.035-.044.035-.043.038-.04 4-4 .04-.037.04-.036.044-.032.045-.03.046-.03.048-.024.05-.023.05-.02.052-.016.052-.015.053-.012.054-.01.054-.005L8.976 5h.054zM5 10l4 2 4-4-4-2-4 4z" fill="currentColor"/><path d="M7.124 0C7.884 0 8.5.616 8.5 1.376v3.748c0 .76-.616 1.376-1.376 1.376H3.876c-.76 0-1.376-.616-1.376-1.376V1.376C2.5.616 3.116 0 3.876 0h3.248zm.56 5.295L5.965 1H5.05L3.375 5.295h.92l.354-.976h1.716l.375.975h.945zm-1.596-1.7l-.592-1.593-.58 1.594h1.172z" fill="currentColor"/></svg>';

GeoJsonTrack.config = {
  type: 'geo-json',
  datatype: ['geo-json'],
  orientation: '2d',
  name: 'GeoJSON',
  thumbnail: new DOMParser().parseFromString(icon, 'text/xml').documentElement,
  availableOptions: [
    'projecton',
    'labelPosition',
    'labelColor',
    'labelTextOpacity',
    'labelBackgroundOpacity',
    'trackBorderWidth',
    'trackBorderColor',
    'rectangleDomainFillColor',
    'rectangleDomainStrokeColor',
    'rectangleDomainOpacity',
    'rectanlgeMinSize',
    'polygonMinBoundingSize',
  ],
  defaultOptions: {
    projecton: 'mercator',
    labelColor: 'black',
    labelPosition: 'hidden',
    trackBorderWidth: 0,
    trackBorderColor: 'black',
    rectangleDomainFillColor: 'grey',
    rectangleDomainStrokeColor: 'black',
    rectangleDomainOpacity: 0.6,
    rectanlgeMinSize: 1,
    polygonMinBoundingSize: 4,
  },
};

export default GeoJsonTrack;
