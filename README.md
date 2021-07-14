# Live weather webthing

Webthings.io live weather server. Data provided from the excellent weather service met.no
The service supports Norway, Sweden, Finland and Denmark.

## Requirements

Node.js version 14 or newer

## Installation

Clone this repository and install the necessary dependencies using

```
npm install
```

## Running

To get a forecast for your location you need to provide the coordinates as environment variables to when running the server

Example:

```
LATITUDE=59.9426 LONGITUDE=10.7184 node server.js

```
