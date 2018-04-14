const config = {
  type: 'geo-json',
  datatype: ['geo-json'],
  orientation: '2d',
  name: 'GeoJSON',
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

export default config;
