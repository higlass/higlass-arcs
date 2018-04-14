import register from 'higlass-register';

import GeoJsonTrack from './GeoJsonTrack';
import config from './config';

register({
  name: 'GeoJsonTrack',
  track: GeoJsonTrack,
  config,
});
