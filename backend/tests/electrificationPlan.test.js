'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const{evaluateElectrificationPlan}=require('../src/domain/electrificationPlan');
const valid={vehicles:[{id:'v1',batteryKwh:100,usableFraction:.9,kwhPerKm:.5}],routes:[{id:'r1',vehicleId:'v1',distanceKm:100,reserveFraction:.2}],sites:[{id:'s1',chargerCount:2,chargerPowerKw:50,availableHours:4}],tariffs:[{pricePerKwh:.2}],gridKgCo2PerKwh:.3,baselineKgCo2PerDay:100};
test('computes deterministic coverage/capacity/cost sensitivity',()=>{const x=evaluateElectrificationPlan(valid);assert.deepEqual(x.errors,[]);assert.equal(x.result.dutyCycleCoverage,1);assert.equal(x.result.decision,'reviewable');assert.equal(x.result.sensitivity.tariffPlus20Pct,x.result.annualEnergyCost*1.2)});
test('rejects unknown vehicle references',()=>{const x=evaluateElectrificationPlan({...valid,routes:[{id:'r',vehicleId:'missing',distanceKm:2}]});assert.ok(x.errors.some(e=>e.includes('unknown vehicle')))});
test('marks range shortfall for revision',()=>{const x=evaluateElectrificationPlan({...valid,routes:[{id:'r',vehicleId:'v1',distanceKm:500,reserveFraction:.2}]});assert.equal(x.result.decision,'revise')});
