# Arcs Track for HiGlass

> Display connections between non-adjacent regions.

[![HiGlass](https://img.shields.io/badge/higlass-👍-red.svg?colorB=0f5d92)](http://higlass.io)
[![Build Status](https://img.shields.io/travis/higlass/higlass-arcs/master.svg?colorB=0f5d92)](https://travis-ci.org/higlass/higlass-arcs)

![Screenshot of the arcs track](https://user-images.githubusercontent.com/2143629/71704745-0bd15f00-2d91-11ea-99d3-4bad11dec7de.png "An example of the arcs track")

**Note**: This is the source code for the arcs track only! You might want to check out the following repositories as well:

- HiGlass viewer: https://github.com/hms-dbmi/higlass
- HiGlass server: https://github.com/hms-dbmi/higlass-server
- HiGlass docker: https://github.com/hms-dbmi/higlass-docker

## Installation

```
npm install higlass-arcs
```

## Usage

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

## Development

### Installation

```bash
$ git clone https://github.com/higlass/higlass-arcs && higlass-arcs
$ npm install
```

### Commands

**Developmental server**: `npm start`
**Production build**: `npm run build`
