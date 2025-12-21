'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {CLUSTER} = require("zigbee-clusters");
//const {debug, CLUSTER} = require("zigbee-clusters");
// debug(true);

class S60ZBTPF extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    if (this.hasCapability('onoff')) {
      this.registerCapability(
        'onoff',
        CLUSTER.ON_OFF,
        {
          // Handle the device on/off switch to report state back to homey when toggled:
          // a) lame solution with getOpts: actively poll all x milliseconds
          //getOpts: { pollInterval: 15000, getOnOnline: true },
          // b) register reporting attribute so device actively sends changed on/off state to homey
          //report: 'onOff', // unsure what this is good for.
          //reportParser(report) { // debugging reported value
          //  this.log(report);
          //  return report === true;
          //},
          getOpts: {
            getOnOnline: true,
            getOnStart: true,
            pollInterval: 600000 // Get a current value once an hour to be sure
          },
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 1, // Device does not send data when on/off switch is
                              // toggled for often than once a second. This is the
                              // min value from interview.
              maxInterval: 600, // Not 100% sure how this works.
            },
          },
        }
      );
    }

    if (this.hasCapability('measure_voltage')) {
      this.registerCapability(
        'measure_voltage',
        CLUSTER.ELECTRICAL_MEASUREMENT,
        {
          reportParser(value) {
            //this.log(value);
            return value / 100;
          },
          getOpts: {
            getOnOnline: true,
            getOnStart: true,
            pollInterval: 600000 // Get a current value once an hour
          },
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 60, // Don't send data more than once per minute.
              maxInterval: 600,
              minChange: 500, // I hope that's 500 mV
            },
          },
        }
      );
    }

    if (this.hasCapability('measure_power')) {
      this.registerCapability(
        'measure_power',
        CLUSTER.ELECTRICAL_MEASUREMENT,
        {
          reportParser(value) {
            //this.log(value);
            return value;
          },
          getOpts: {
            getOnOnline: true,
            getOnStart: true,
            pollInterval: 600000 // Get a current value once an hour
          },
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 10, // Don't send data more often than every 10 seconds.
              maxInterval: 600,
              minChange: 10, // Send when power changed for more than 10W
            },
          },
        }
      );
    }

    if (this.hasCapability('measure_current')) {
      this.registerCapability(
        'measure_current',
        CLUSTER.ELECTRICAL_MEASUREMENT,
        {
          reportParser(value) {
            //this.log(value);
            return value / 100;
          },
          getOpts: {
            getOnOnline: true,
            getOnStart: true,
            pollInterval: 600000 // Get a current value once an hour
          },
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 10, // Don't send data more often than every 10 seconds.
              maxInterval: 600,
              minChange: 10, // Send when current changed for more than 0.1A
            },
          },
        }
      );
    }

  }
}

module.exports = S60ZBTPF;
