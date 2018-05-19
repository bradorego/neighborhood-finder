<template>
  <div id="app">
    <h1>{{ msg }}</h1>
    <button id="btn" class="" v-on:click="query">Get Directions</button>
    <ion-spinner v-if="loading"></ion-spinner>
    <pre v-text="gData" v-if="!loading && gData.exists"></pre>
  </div>
</template>

<script>
import axios from 'axios';

let directionsService = new google.maps.DirectionsService;
let zipCodesFlat = [10453,10457,10460,10458,10467,10468,10451,10452,10456,10454,10455,10459,10474,10463,10471,10466,10469,10470,10475,10461,10462,10464,10465,10472,10473,11212,11213,11216,11233,11238,11209,11214,11228,11204,11218,11219,11230,11234,11236,11239,11223,11224,11229,11235,11201,11205,11215,11217,11231,11203,11210,11225,11226,11207,11208,11211,11222,11220,11232,11206,11221,11237,10026,10027,10030,10037,10039,10001,10011,10018,10019,10020,10036,10029,10035,10010,10016,10017,10022,10012,10013,10014,10004,10005,10006,10007,10038,10280,10002,10003,10009,10021,10028,10044,10065,10075,10128,10023,10024,10025,10031,10032,10033,10034,10040,11361,11362,11363,11364,11354,11355,11356,11357,11358,11359,11360,11365,11366,11367,11412,11423,11432,11433,11434,11435,11436,11101,11102,11103,11104,11105,11106,11374,11375,11379,11385,11691,11692,11693,11694,11695,11697,11004,11005,11411,11413,11422,11426,11427,11428,11429,11414,11415,11416,11417,11418,11419,11420,11421,11368,11369,11370,11372,11373,11377,11378,10302,10303,10310,10306,10307,10308,10309,10312,10301,10304,10305,10314];
const API_BASE = "http://localhost:3000";

export default {
  name: 'app',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
      nowNoon: new Date(),
      gData: {
        exists: false,
        drivingDuration: false,
        transitDuration: false,
        walkscore: {},
        rent: {
          min: false,
          mean: false,
          max: false
        }
      },
      outputZips: [],
      params: {
        drive: {
          max: 3600, /// gmaps directions does time in seconds
          destination: "LGA Terminal 3"
        },
        transit: {
          max: 3600,
          destination: "LGA Terminal 3"
        }
      },
      loading: false
    }
  },
  methods: {
    query: function () {
      this.loading = true;
      this.nowNoon = new Date(); /// probably overkill but 🤷‍♀️
      this.nowNoon.setHours(12);
      this.validZips = zipCodesFlat.slice(); /// make a copy of zips on each new query
      this.gData.exists = false;
      this.outputZips = [];
      this.getDrivingDirections(this.validZips)
        .then((drivingZips) => {
          console.log(drivingZips);
        })
        .catch((error) => {
          console.warn(error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    queryAsync: function () {
      this.loading = true;
      this.gData.exists = false;
      Promise.all([
        this.getPrices(),
        this.getDrivingDirections(),
        this.getTransitDirections()
      ]).then((data) => { /// data == [prices<Array>, drivingDuration<Array>, transitDuration<Array>]
        this.gData.rent = data[0];
        this.gData.drivingDuration = data[1];
        this.gData.transitDuration = data[2];
        this.gData.exists = true;
      }).catch((error) => {
        console.warn(error);
      }).finally(() => {
        this.loading = false;
      });
    },
    getPrices: function (zipCodes) {
      return axios
        .get(`${API_BASE}/craigslist?zip=11216`)
        .then(response => {
          // this.gData.rent = response.data;
          return response.data
        })
        .catch(error => error);
    },
    getDrivingDirections: function (zips) {
      let promises = [];
      zips.forEach((zipCode, zipIndex) => {
        promises.push(new Promise((resolve, reject) => {
          directionsService.route({
            origin: `${zipCode}`,
            destination: this.params.drive.destination,
            travelMode: 'DRIVING',
            drivingOptions: {
              departureTime: this.nowNoon
            }
          }, (response, status) => {
            if (status === 'OK') { //// response.routes[{legs[{duration.text, duration.value}]}]
              let duration = response.routes[0].legs[0].duration; /// we should probably do some error checking here
              if (duration.value > this.params.drive.max) { /// if too long, axe the zipcode
                zips = zips.splice(zipIndex);
              } else {
                resolve({zip: zipCode, drivingDuration: duration.text});
              }
            } else {
              reject({status: status, error: response});
            }
          });
        }));
      });
      return Promise.all(promises);
    },
    getTransitDirections: function (zips) {
      let promises = [];
      zips.forEach((zipCode, zipIndex) => {
        promises.push(new Promise((resolve, reject) => {
          directionsService.route({
            origin: zipCode,
            destination: this.params.transit.destination,
            travelMode: 'TRANSIT',
            drivingOptions: {
              departureTime: this.nowNoon
            }
          }, (response, status) => {
            if (status === 'OK') { //// response.routes[{legs[{duration.text, duration.value}]}]
              let duration = response.routes[0].legs[0].duration; /// we should probably do some error checking here
              if (duration.value > this.params.drive.max) { /// if too long, axe the zipcode
                zips = zips.splice(zipIndex);
              } else {
                resolve({zip: zipCode, transitDuration: duration.text});
              }
            } else {
              reject({status: status, error: response});
            }
          });
        }));
      });
      return Promise.all(promises);
    }
  }
}
</script>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
