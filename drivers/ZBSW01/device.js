'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class ZBSW01 extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.enableDebug();
        debug(true);
        this.printNode();

        this.registerCapability('onoff', CLUSTER.ON_OFF);

    }

    onDeleted(){
		this.log("1 Gang Wall Switch removed")
	}

}

module.exports = ZBSW01;