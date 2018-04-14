import register from 'higlass-register';

import GeoJsonTrack from './GeoJsonTrack';

register({
  name: 'GeoJsonTrack',
  track: GeoJsonTrack,
  config: GeoJsonTrack.config,
});
