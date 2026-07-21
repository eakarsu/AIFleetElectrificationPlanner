'use strict';

function finite(value, name, errors, { min = 0, required = true } = {}) {
  const number = Number(value);
  if ((!Number.isFinite(number) || number < min) && required) errors.push(`${name} must be a number >= ${min}`);
  return number;
}

function evaluateElectrificationPlan(input = {}) {
  const errors = [];
  const vehicles = Array.isArray(input.vehicles) ? input.vehicles : [];
  const routes = Array.isArray(input.routes) ? input.routes : [];
  const sites = Array.isArray(input.sites) ? input.sites : [];
  const tariffs = Array.isArray(input.tariffs) ? input.tariffs : [];
  if (!vehicles.length) errors.push('vehicles is required');
  if (!routes.length) errors.push('routes is required');
  if (!sites.length) errors.push('sites is required');
  if (!tariffs.length) errors.push('tariffs is required');

  const vehicleById = new Map();
  for (const vehicle of vehicles) {
    if (!vehicle.id || vehicleById.has(String(vehicle.id))) errors.push('vehicle ids must be unique and non-empty');
    const usableKwh = finite(vehicle.batteryKwh, `vehicle ${vehicle.id} batteryKwh`, errors, { min: 1 }) *
      (finite(vehicle.usableFraction ?? 0.85, `vehicle ${vehicle.id} usableFraction`, errors, { min: 0.1 }) || 0);
    const kwhPerKm = finite(vehicle.kwhPerKm, `vehicle ${vehicle.id} kwhPerKm`, errors, { min: 0.01 });
    vehicleById.set(String(vehicle.id), { ...vehicle, usableKwh, kwhPerKm });
  }

  const routeResults = routes.map((route) => {
    const vehicle = vehicleById.get(String(route.vehicleId));
    if (!vehicle) errors.push(`route ${route.id || '?'} references an unknown vehicle`);
    const distanceKm = finite(route.distanceKm, `route ${route.id || '?'} distanceKm`, errors, { min: 0.1 });
    const reserveFraction = finite(route.reserveFraction ?? 0.2, `route ${route.id || '?'} reserveFraction`, errors, { min: 0 });
    const energyKwh = vehicle ? distanceKm * vehicle.kwhPerKm : 0;
    const availableKwh = vehicle ? vehicle.usableKwh * (1 - reserveFraction) : 0;
    return { routeId: route.id, vehicleId: route.vehicleId, distanceKm, energyKwh, availableKwh, feasible: energyKwh <= availableKwh };
  });

  const dailyEnergyKwh = routeResults.reduce((sum, route) => sum + route.energyKwh, 0);
  const chargerCapacityKwh = sites.reduce((sum, site) => {
    const chargers = finite(site.chargerCount, `site ${site.id || '?'} chargerCount`, errors, { min: 1 });
    const powerKw = finite(site.chargerPowerKw, `site ${site.id || '?'} chargerPowerKw`, errors, { min: 1 });
    const hours = finite(site.availableHours, `site ${site.id || '?'} availableHours`, errors, { min: 0.25 });
    return sum + chargers * powerKw * hours * 0.9;
  }, 0);
  const weightedTariff = tariffs.reduce((sum, tariff) => sum + finite(tariff.pricePerKwh, 'tariff pricePerKwh', errors, { min: 0 }), 0) / Math.max(tariffs.length, 1);
  const gridKgPerKwh = finite(input.gridKgCo2PerKwh ?? 0.4, 'gridKgCo2PerKwh', errors, { min: 0 });
  const baselineKg = finite(input.baselineKgCo2PerDay ?? 0, 'baselineKgCo2PerDay', errors, { min: 0 });
  const annualEnergyCost = dailyEnergyKwh * weightedTariff * 365;
  const annualEmissionsKg = dailyEnergyKwh * gridKgPerKwh * 365;

  return {
    errors,
    result: {
      routeResults,
      dutyCycleCoverage: routes.length ? routeResults.filter((route) => route.feasible).length / routes.length : 0,
      dailyEnergyKwh,
      chargerCapacityKwh,
      chargerUtilization: chargerCapacityKwh ? dailyEnergyKwh / chargerCapacityKwh : null,
      annualEnergyCost,
      annualEmissionsKg,
      annualEmissionsReductionKg: baselineKg * 365 - annualEmissionsKg,
      sensitivity: {
        tariffPlus20Pct: annualEnergyCost * 1.2,
        coldWeatherEnergyPlus25Pct: dailyEnergyKwh * 1.25,
        capacityPassesColdWeather: chargerCapacityKwh >= dailyEnergyKwh * 1.25
      },
      decision: errors.length ? 'invalid' : routeResults.every((route) => route.feasible) && chargerCapacityKwh >= dailyEnergyKwh ? 'reviewable' : 'revise'
    },
    assumptions: ['90% charging efficiency', 'daily routes repeat 365 days', 'tariffs are averaged unless a scheduling adapter supplies intervals'],
    uncertainty: { requiresTelematicsCoverage: true, requiresSiteEngineeringReview: true, modelUsedForDecision: false }
  };
}

module.exports = { evaluateElectrificationPlan };
