let directionsService = new google.maps.DirectionsService;
let zipCodesFlat = [10453,10457,10460,10458,10467,10468,10451,10452,10456,10454,10455,10459,10474,10463,10471,10466,10469,10470,10475,10461,10462,10464,10465,10472,10473,11212,11213,11216,11233,11238,11209,11214,11228,11204,11218,11219,11230,11234,11236,11239,11223,11224,11229,11235,11201,11205,11215,11217,11231,11203,11210,11225,11226,11207,11208,11211,11222,11220,11232,11206,11221,11237,10026,10027,10030,10037,10039,10001,10011,10018,10019,10020,10036,10029,10035,10010,10016,10017,10022,10012,10013,10014,10004,10005,10006,10007,10038,10280,10002,10003,10009,10021,10028,10044,10065,10075,10128,10023,10024,10025,10031,10032,10033,10034,10040,11361,11362,11363,11364,11354,11355,11356,11357,11358,11359,11360,11365,11366,11367,11412,11423,11432,11433,11434,11435,11436,11101,11102,11103,11104,11105,11106,11374,11375,11379,11385,11691,11692,11693,11694,11695,11697,11004,11005,11411,11413,11422,11426,11427,11428,11429,11414,11415,11416,11417,11418,11419,11420,11421,11368,11369,11370,11372,11373,11377,11378,10302,10303,10310,10306,10307,10308,10309,10312,10301,10304,10305,10314];
const API_BASE = "";
// let zipCodesFlat = [10453,10457,10460,10458,10467];

document.addEventListener('DOMContentLoaded', () => {
  let $driveTarget = $('#fv-input-drive'),
    $transitTarget = $('#fv-input-transit'),
    $drivingMax = $('#fv-driving-max'),
    $transitMax = $('#fv-transit-max'),
    $drivingTime = $('#fv-driving-time'),
    $transitTime = $('#fv-transit-time'),
    $form = $('#fv-form'),
    $outputDrivingLabel = $('#fv-output-driving'),
    $outputTransitLabel = $('#fv-output-transit');
    $driveStatus = $('#driving-status'),
    $transitStatus = $('#transit-status'),
    $rentStatus = $('#rent-status')
    $formattedOutput = $('#formatted-output'),
    $formOutDriving = $('#formatted-output-driving'),
    $formOutTransit = $('#formatted-output-transit');

  let driveAutocomplete = new google.maps.places.Autocomplete($driveTarget[0]);
  driveAutocomplete.addListener('place_changed', () => {
    let place = driveAutocomplete.getPlace();
    data.params.DRIVING.destination = place.formatted_address;
  });
  let transitAutocomplete = new google.maps.places.Autocomplete($transitTarget[0]);
  transitAutocomplete.addListener('place_changed', () => {
    let place = transitAutocomplete.getPlace();
    data.params.TRANSIT.destination = place.formatted_address;
  });
  let formattedZips = zipCodesFlat.map((x) => {
    return {
      code: x,
      TRANSIT: null,
      DRIVING: null,
      rent: {
        min: null,
        max: null,
        mean: null
      }
    }
  });
  $form.submit((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (data.params.DRIVING.destination) {
      if (data.params.TRANSIT.destination) {
        methods.query();
      } else {
        alert("Please select transit destination");
      }
    } else {
      alert("Please select driving destination");
    }
    // methods.query();
  });
  let data = {
    status: {
      DRIVING: {
        resolved: 0,
        total: formattedZips.length
      },
      TRANSIT: {
        resolved: 0,
        total: 0
      },
      rent: {
        resolved: 0,
        total: 0
      }
    },
    outputZips: [],
    params: {
      DRIVING: {
        max: 1800, /// gmaps directions does time in seconds
        destination: "",
        time: null
      },
      TRANSIT: {
        max: 1800,
        destination: "",
        time: null
      }
    },
    loading: false
  };
  let methods = {
    stateReset: function () {
      data.status.DRIVING = {resolved: 0, total: formattedZips.length};
      data.status.TRANSIT = {resolved: 0, total: 0};
      data.status.rent = {resolved: 0, total: 0};
      data.outputZips = [];
    },
    query: function () {
      methods.stateReset();
      data.params.DRIVING.max = parseInt($drivingMax.val(), 10);
      data.params.TRANSIT.max = parseInt($transitMax.val(), 10);

      let transitTime = new Date();
      transitTime.setDate(transitTime.getDate() + 1); /// to avoid time past error
      if ($transitTime.val()) {
        transitTime.setHours($transitTime.val().split(":")[0]); /// time format is "HH:MM"
        transitTime.setMinutes($transitTime.val().split(":")[1]);
      }
      data.params.TRANSIT.time = transitTime;

      let drivingTime = new Date();
      drivingTime.setDate(drivingTime.getDate() + 1); /// to avoid time past error
      if ($drivingTime.val()) {
        drivingTime.setHours($drivingTime.val().split(":")[0]); /// time format is "HH:MM"
        drivingTime.setMinutes($drivingTime.val().split(":")[1]);
      }
      data.params.DRIVING.time = drivingTime;

      $outputDrivingLabel.text(`${data.params.DRIVING.max / 60} minute drive to ${data.params.DRIVING.destination} at ${drivingTime.toLocaleString()}`);
      $outputTransitLabel.text(`${data.params.TRANSIT.max / 60} minute public transit to ${data.params.TRANSIT.destination} at ${transitTime.toLocaleString()}`);

      methods.getDrivingDirections(formattedZips).then((drivingZips) => {
        methods.formatOutput(drivingZips, $formOutDriving);
        data.status.TRANSIT.total = drivingZips.length;
        return methods.getTransitDirections(drivingZips);
      }).then((transitZips) => {
        methods.formatOutput(transitZips, $formOutTransit);
        data.status.rent.total = transitZips.length;
        return methods.getPrices(transitZips);
      }).then((pricesZips) => {
        /// TODO get walkscore
        data.outputZips = pricesZips.splice();
        methods.formatOutput(pricesZips, $formattedOutput);
      })
      .catch((error) => {
        console.warn(error);
        alert(`There was an unexpected error. ${error}`);
      })
      .finally(() => {
        /// show/hide divs
      });
    },
    formatOutput: function (zips, jqDiv) {
      jqDiv.empty();
      zips.forEach((zip) => {
        jqDiv.append(`<li>Zip: <a href="https://www.google.com/maps?q=${zip.code}" target="_blank">${zip.code}</a>. Driving: ${zip.DRIVING}. Transit: ${zip.TRANSIT}. Rent (min-avg-max): ${zip.rent.min}-${zip.rent.mean}-${zip.rent.max}</li>`)
      });
    },
    getPrices: function (zips) {
      let promises = [];
      zips.forEach((zip) => {
        promises.push(new Promise((res, rej) => {
          $.ajax({
            url: `${API_BASE}/craigslist?zip=${zip.code}`,
            method: 'get',
            success: (data) => {
              zip.rent = data;
              res(zip);
            },
            error: (err) => {
              rej(err);
            },
            complete: () => {
              data.status.rent.resolved++;
              $rentStatus.text(`${data.status.rent.resolved} of ${data.status.rent.total}`);
            }
          });
        }));
      });
      return Promise.all(promises);
    },
    getDrivingDirections: function (zips) {
      return methods.directionsAbstraction(zips, 'DRIVING');
    },
    getTransitDirections: function (zips) {
      return methods.directionsAbstraction(zips, 'TRANSIT');
    },
    directionsAbstraction: function (zips, which) { /// zips = {code, TRANSIT, DRIVING}, which === "DRIVING"|"TRANSIT"
      return new Promise((res, rej) => {
        let promises = [];
        let index = 0;
        let outputZips = [];
        let findFastestRoute = (routes) => {
          let minDur = Number.MAX_SAFE_INTEGER;
          let minRoute = {};
          routes.forEach((route) => {
            if (route.legs[0].duration.value < minDur) {
              minDur = route.legs[0].duration.value;
              minRoute = route.legs[0].duration;
            }
          });
          return minRoute;
        };
        data.status[which].resolved = 0;
        let i = setInterval(() => {
          promises.push(new Promise((resolve, reject) => {
            let internalIndex = index;
            let options = {
              origin: `${zips[internalIndex].code}`,
              destination: data.params[which].destination,
              travelMode: which,
              provideRouteAlternatives: true,
              drivingOptions: {
                departureTime: data.params[which].time
              },
              transitOptions: {
                departureTime: data.params[which].time
              }
            };
            directionsService.route(options, (response, status) => {
              if (status === 'OK') { //// response.routes[{legs[{duration.text, duration.value}]}]
                let duration = findFastestRoute(response.routes);
                if (duration.value <= data.params[which].max) { /// it's good: update values and copy
                  zips[internalIndex][which] = duration.text;
                  outputZips.push(zips[internalIndex]);
                } else {
                  ///do nothing
                }
              } else {
                /// handle error gracefully
              }
              /// if-else-finally
              data.status[which].resolved++;
              if (which === "DRIVING") {
                $driveStatus.text(`${data.status[which].resolved} of ${data.status[which].total}`);
              } else {
                $transitStatus.text(`${data.status[which].resolved} of ${data.status[which].total}`);
              }
              if (data.status[which].resolved >= zips.length) { /// we've finished them all, so return
                res(outputZips);
              }
            });
          }));
          index++;
          if (index >= zips.length) { /// we've started them all, so stop sending
            clearInterval(i);
          }
        }, 250);
      });
    }
  };
});
