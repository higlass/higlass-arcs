# Arcs Track for HiGlass

> Display connections between non-adjacent regions as arcs

[![HiGlass](https://img.shields.io/badge/higlass-👍-red.svg?colorB=0f5d92)](http://higlass.io)
[![Build Status](https://img.shields.io/travis/higlass/higlass-arcs/master.svg?colorB=0f5d92)](https://travis-ci.org/higlass/higlass-arcs)

![Screenshot of the arcs track](https://user-images.githubusercontent.com/2143629/71704745-0bd15f00-2d91-11ea-99d3-4bad11dec7de.png 'An example of the arcs track')

The WebGL implementation is inspired by [Matt Deslauriers' wonderful blog post on drawing lines](https://mattdesl.svbtle.com/drawing-lines-is-hard).

**Note**: This is the source code for the arcs track only! You might want to check out the following repositories as well:

- HiGlass viewer: https://github.com/higlass/higlass
- HiGlass server: https://github.com/higlass/higlass-server
- HiGlass docker: https://github.com/higlass/higlass-docker

## Installation

```
npm install higlass-arcs
```

## Usage

The live script can be found at:

- https://unpkg.com/higlass-arcs/dist/higlass-arcs.min.js

1. Make sure you load this track prior to `hglib.js`. For example:

```
<script src="higlass-arcs.js"></script>
<script src="hglib.js"></script>
<script>
  ...
</script>
```

2. Now, configure the track in your view config and be happy! Cheers 🎉

```
{
  ...
  {
    server: 'http://localhost:8001/api/v1',
    tilesetUid: 'my-aggregated-bedfile.beddb',
    uid: 'some-uid',
    type: '1d-arcs',
    options: {
      labelColor: 'red',
      labelPosition: 'hidden',
      trackBorderWidth: 0,
      trackBorderColor: 'black',
      name: 'Arcs for me and you!',
    },
  },
  ...
}
```

Take a look at [`src/index.html`](src/index.html) for an example.

## Custom Options

#### startField

By default, a segments x1 start value is used as the start position. You can customize this behavior by specifying another column. Useful when drawing arcs from bedpe data.

#### endField

By default, a segments x1 end value is used as the end position. You can customize this behavior by specifying another column. Useful when drawing arcs from bedpe data.

#### filter

An object with the following properties to filter segments.

**Properties:**

- `set`: a list of values that will allow segments to be included, i.e., rendered
- `field`: an integer defining the segment field column number that should be used to check against the `set`

In other words, this is how the filtering is basically implemented:

```javascript
segments.filter((segment) =>
  options.filter.set.includes(segment.fields[options.filter.field])
);
```

## Development

### Installation

```bash
$ git clone https://github.com/higlass/higlass-arcs && higlass-arcs
$ npm install
```

### Commands

**Developmental server**: `npm start`
**Production build**: `npm run build`
**Deploy demo**: `npm run deploy`
