import register from 'higlass-register';

import Arcs1DTrack from './Arcs1DTrack';

console.log('config:', Arcs1DTrack.config);

register({
  name: 'Arcs1DTrack',
  track: Arcs1DTrack,
  config: Arcs1DTrack.config,
});
