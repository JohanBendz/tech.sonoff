const { Cluster, ZCLDataTypes } = require("zigbee-clusters");

class SonoffSpecificCluster extends Cluster {

    static get ID() {
        return 64529;
    }
    
    static get NAME() {
        return 'SonoffSpecificCluster';
    }
    
    static get ATTRIBUTES() {
        return {
            child_lock: {
                id: 0x0000,
                type: ZCLDataTypes.bool
            },
            tamper: {
                id: 0x2000,
                type: ZCLDataTypes.uint8
            },
            illumination: {
                id: 0x2001,
                type: ZCLDataTypes.uint8
            },
            open_window: {
                id: 0x6000,
                type: ZCLDataTypes.bool
            },
            frost_protection_temperature: {
                id: 0x6002,
                type: ZCLDataTypes.int16
            },
            idle_steps: {
                id: 0x6003,
                type: ZCLDataTypes.uint16
            },
            closing_steps: {
                id: 0x6004,
                type: ZCLDataTypes.uint16
            },
            valve_opening_limit_voltage: {
                id: 0x6005,
                type: ZCLDataTypes.uint16
            },
            valve_closing_limit_voltage: {
                id: 0x6006,
                type: ZCLDataTypes.uint16
            },
            valve_motor_running_voltage: {
                id: 0x6007,
                type: ZCLDataTypes.uint16
            },
            valve_opening_degree: {
                id: 0x600b,
                type: ZCLDataTypes.uint8
            },
            valve_closing_degree: {
                id: 0x600c,
                type: ZCLDataTypes.uint8
            },
        };
    }
}

module.exports = SonoffSpecificCluster;