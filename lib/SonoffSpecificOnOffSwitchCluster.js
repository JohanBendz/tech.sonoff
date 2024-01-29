const { OnOffSwitchCluster, ZCLDataTypes } = require('zigbee-clusters');

class SonoffSpecificOnOffSwitchCluster extends OnOffSwitchCluster {

  static get ATTRIBUTES() {
    return {
        ...super.ATTRIBUTES,
        switchType: {
            id: 0,
            type: ZCLDataTypes.enum8({
                toggle: 0, // toggle (0) - breaker behavior
                momentary: 1 // momentary (1) - breaker behavior
            })
        }
    };
  }
}

module.exports = SonoffSpecificOnOffSwitchCluster;