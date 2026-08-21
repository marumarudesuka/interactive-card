const power = (name, state = "100") => ({
  state,
  attributes:{ friendly_name:name, device_class:"power", state_class:"measurement", unit_of_measurement:"W" },
});
const energy = (name, stateClass = "total_increasing") => ({
  state:"42",
  attributes:{ friendly_name:name, device_class:"energy", state_class:stateClass, unit_of_measurement:"kWh" },
});

export const ecoMainRecommendationFixture = { states:{
  "sensor.main_all_power_rt":power("EcoMain Main Power", "1800"),
  "sensor.main_all_energy_fwd_total":energy("EcoMain Total Energy"),
  "sensor.today_energy":energy("Today's Energy", "measurement"),
  "sensor.main_ch1_power_rt":power("EcoMain Channel 1", "500"),
  "sensor.main_ch2_power_rt":power("EcoMain Channel 2", "300"),
  "sensor.main_ch3_power_rt":power("EcoMain Channel 3", "unavailable"),
  "sensor.energy_cost_today":{
    state:"3.42",
    attributes:{ friendly_name:"Energy Cost Today", device_class:"monetary", unit_of_measurement:"€" },
  },
  "sensor.solar_power":power("Solar Power", "900"),
} };

export const genericRecommendationFixture = { states:{
  "sensor.shelly_kitchen_power":power("Shelly Kitchen Power", "420"),
  "sensor.esphome_garage_power":power("ESPHome Garage Power", "210"),
  "sensor.esphome_total_energy":energy("ESPHome Total Energy"),
  "sensor.template_today_energy":energy("Template Today Energy", "measurement"),
} };

export const mixedRecommendationFixture = { states:{
  ...ecoMainRecommendationFixture.states,
  "sensor.shelly_office_power":power("Shelly Office Power", "160"),
  "sensor.esphome_ev_power":power("ESPHome EV Power", "3200"),
} };

export const noCircuitRecommendationFixture = { states:{
  "sensor.home_main_power":power("Home Main Power", "1500"),
  "sensor.home_total_energy":energy("Home Total Energy"),
} };

export const similarPowerRecommendationFixture = { states:{
  "sensor.kitchen_power_1":power("Kitchen Power 1", "100"),
  "sensor.kitchen_power_2":power("Kitchen Power 2", "110"),
  "sensor.kitchen_power_3":power("Kitchen Power 3", "unavailable"),
  "sensor.garage_power":power("Garage Power", "250"),
} };
