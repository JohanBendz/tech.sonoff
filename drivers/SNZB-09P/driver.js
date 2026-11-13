'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SonoffSNZB09PDriver extends ZigBeeDriver {
  async onInit() {
    this.homey.flow.getActionCard('SNZB-09P_play_sound')
      .registerRunListener(args => args.device.playSound(args));
  }
}

module.exports = SonoffSNZB09PDriver;
