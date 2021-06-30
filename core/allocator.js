let { sum, copy, deepCopy, sort } = require('./utils.js')();

(module.exports = function () {

    const allocate = ({ participants, items }) => {

        prepareData({ participants, items });

        let allocations = [];

        participants.forEach(p => {
            allocations.push({
                participant: copy(p),
                items: items.filter(i => p.fixedItems?.includes(i.name))
            });

            items = items.filter(i => !p.fixedItems?.includes(i.name));
        });

        return allocateInternal(allocations, items, items.length - 1);
    };

    const allocateInternal = (allocations, items, index) => {

        if (index == 0) {

            let minEquipCount = getMinEquipmentCount(allocations);
            let allocation = allocations.filter(a => getEquipmentCount(a.items) == minEquipCount)[0];

            allocation.items.push(copy(items[0]));
        } else {
            let prevAllocations = allocateInternal(allocations, items, index - 1);
            let totalDiffMin = Infinity;
            let totalDiffCur = Infinity;

            for (let i = 0; i < prevAllocations.length; i++) {

                let newAllocations = deepCopy(prevAllocations);

                newAllocations[i].items.push(copy(items[index]));
                totalDiffCur = calcTotalDiff(newAllocations);

                let equipCount = getEquipmentCount(newAllocations[i].items);
                let minEquipCount = getMinEquipmentCount(newAllocations);

                if (totalDiffCur < totalDiffMin && (equipCount - minEquipCount) < 2) { // TODO: calc 2 based on number of participants and equipments
                    allocations = newAllocations;
                    totalDiffMin = totalDiffCur;
                }
            }
        }

        return allocations;
    };

    const prepareData = ({ participants, items }) => {

        items.forEach(item => item.work = calcWork(item));
        sort(items, (item) => item.work);
        calcExpectedWork(participants, items);
    };

    const calcWork = (item) => {
        switch (item.consumptionType) {
            case 'Fixed': {
                return item.weight * item.carryDays;
            }
            case 'FixedNextDay': {
                return item.weight * item.carryDays;
            }
            case 'Linear': {
                return item.weight * (item.carryDays + 1) / 2;
            }
        }
        throw new Error(`${item.consumptionType} is not supported`);
    };

    const calcExpectedWork = (participants, items) => {

        let totalWork = sum(items, (item) => item.work);
        let totalCoef = sum(participants, (p) => p.carryingCoefficient);
        let x = totalWork / totalCoef;

        for (let p of participants) {
            p.expectedWork = (x * p.carryingCoefficient);
        }
    };

    const calcTotalDiff = (allocations) => {

        return sum(allocations, a => Math.pow(a.participant.expectedWork - sum(a.items, i => i.work), 2));
    };

    const calcMetrics = (allocations) => {

        allocations.forEach(a => {
            a.actualWork = sum(a.items, i => i.work).toFixed(1);
            a.diffPct = (100 * (a.participant.expectedWork - a.actualWork) / a.participant.expectedWork).toFixed(2);
            a.diff = (a.participant.expectedWork - a.actualWork).toFixed(1);
            a.weight = sum(a.items, i => i.weight).toFixed(1);
        })
    };

    const getEquipmentCount = (items) => {

        return items.filter(i => i.type == itemType.Equipment).length;
    };

    const getMinEquipmentCount = (allocations) => {

        return Math.min(...allocations.map(a => getEquipmentCount(a.items)));
    }

    const isDailyFoodItem = (item) => {

        return item.type == itemType.Food && [consumptionType.Fixed, consumptionType.FixedNextDay].includes(item.consumptionType);
    }

    const getConsumptionDay = (item) => {

        return item.consumptionType == consumptionType.FixedNextDay
            ? item.carryDays + 1
            : item.carryDays;
    }

    const itemType = {
        Equipment: 'Equipment',
        Food: 'Food'
    }

    const consumptionType = {
        Fixed: 'Fixed',
        FixedNextDay: 'FixedNextDay',
        Linear: 'Linear'
    }

    return {
        allocate,
        isDailyFoodItem,
        getConsumptionDay,
        calcMetrics
    };
})();
