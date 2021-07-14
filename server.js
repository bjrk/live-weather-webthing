const {
  SingleThing,
  Property,
  Thing,
  Value,
  WebThingServer,
} = require("webthing");
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");

class YRNowcastSensor extends Thing {
  constructor(lon, lat) {
    super(
      uuidv4(),
      "YR Nowcast Weather",
      ["TemperatureSensor"],
      "A web connected YR Nowcast Weather sensor"
    );
    this.lon = parseFloat(lon);
    this.lat = parseFloat(lat);
    this.temperature = new Value(0.0);
    this.raining = new Value(false);
    this.willRain = new Value(false);
    this.addProperty(
      new Property(this, "temperature", this.temperature, {
        "@type": "TemperatureProperty",
        title: "Temperature",
        type: "number",
        description: "The current temperature in celsius",
        readOnly: true,
      })
    );
    this.addProperty(
      new Property(this, "raining", this.raining, {
        "@type": "BooleanProperty",
        title: "Raining",
        type: "boolean",
        description: "is it currently raining",
        readOnly: true,
      })
    );
    this.addProperty(
      new Property(this, "willRain", this.raining, {
        "@type": "BooleanProperty",
        title: "Will rain",
        type: "boolean",
        description: "will it start to rain within the next hour",
        readOnly: true,
      })
    );

    setInterval(this.update.bind(this), 1000);
  }
  async update() {
    let observation = this.lastFetch;
    if (!this.lastTime || Date.now() - this.lastTime > 10 * 60 * 1000) {
      observation = await this.getWeatherData();
      this.lastFetch = observation;
      this.lastTime = Date.now();
    }

    const first = observation.timeseries[0].data.instant.details;
    const latest =
      observation.timeseries
        .slice()
        .reverse()
        .find(({ time }) => {
          return new Date(time).getTime() < Date.now();
        }) || {};
    const current = { ...first, ...latest.data.instant.details };
    const latestIndex = observation.timeseries.indexOf(latest);
    const willRain = observation.timeseries
      .slice(latestIndex, latestIndex + 3)
      .map((e) => console.log(e) || e)
      .some(
        (seriesEntry) => seriesEntry.data.instant.details.precipitation_rate > 0
      );
    this.temperature.notifyOfExternalUpdate(current.air_temperature);
    this.raining.notifyOfExternalUpdate(current.precipitation_rate > 0);
    this.willRain.notifyOfExternalUpdate(willRain);
  }
  async getWeatherData() {
    try {
      const response = await fetch(
        `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=${this.lat.toFixed(
          4
        )}&lon=${this.lon.toFixed(4)}`,
        {
          headers: {
            "User-Agent":
              "YrNowcastWebting/0.1 github.com/bjrk/yr-now-webthing",
          },
        }
      );
      const data = await response.json();
      return data.properties;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}
function runServer() {
  const lon = process.env.LONGITUDE;
  const lat = process.env.LATITUDE;
  if (!lon || !lat) {
    console.log("requires environment variables LONGITUDE & LATITUDE to run");
    process.exit();
  }
  const weatherSensor = new YRNowcastSensor(lon, lat);

  const server = new WebThingServer(new SingleThing(weatherSensor), 8888);

  process.on("SIGINT", () => {
    server
      .stop()
      .then(() => process.exit())
      .catch(() => process.exit());
  });

  server.start().catch(console.error);
}

runServer();
