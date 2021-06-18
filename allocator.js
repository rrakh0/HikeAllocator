let example = require('./examples/05.example.json');
let { sum, copy, deepCopy, sort } = require('./utils.js')();

const allocate = (hikeData) => {

    let items = deepCopy(hikeData.items || []);
    let participants = deepCopy(hikeData.participants || [])

    items.forEach(item => item.work = calcWork(item));
    sort(items, (item) => item.work);
    calcExpectedWork(participants, items)

    return allocateInternal(participants, items, items.length - 1);
};

const allocateInternal = (participants, items, index) => {
    let allocations = [];

    if (index == 0) {
        allocations = participants.map(p => ({
            participant: copy(p),
            items: []
        }));

        allocations[0].items.push(copy(items[0]));
    } else {
        let prevAllocations = allocateInternal(participants, items, index - 1);
        let totalDiffMin = Infinity;
        let totalDiffCur = Infinity;

        for (let i = 0; i < prevAllocations.length; i++) {

            let newAllocations = deepCopy(prevAllocations);

            newAllocations[i].items.push(copy(items[index]));
            totalDiffCur = calcTotalDiff(newAllocations);

            let equipCount = getEquipmentCount(newAllocations[i].items);
            let minEquipCount = Math.min(...newAllocations.map(a => getEquipmentCount(a.items)));

            if (totalDiffCur < totalDiffMin && (equipCount - minEquipCount) < 2) {
                allocations = newAllocations;
                totalDiffMin = totalDiffCur;
            }
        }
    }

    return allocations;
};

const calcExpectedWork = (participants, items) => {

    let totalWork = sum(items, (item) => item.work);
    let totalCoef = sum(participants, (p) => p.carryingCoefficient);
    let x = totalWork / totalCoef;

    for (let p of participants) {
        p.expectedWork = (x * p.carryingCoefficient);
    }
};

const calcWork = (item) => {
    switch (item.consumptionType) {
        case 'Fixed': {
            return item.weight * item.durationDays;
        }
        case 'Linear': {
            return item.weight * (item.durationDays + 1) / 2;
        }
    }
    throw new Error(`${item.consumptionType} is not supported`);
};

const calcTotalDiff = (allocations) => {

    let result = 0;

    for (let alloc of allocations) {
        result += Math.pow(alloc.participant.expectedWork - sum(alloc.items, i => i.work), 2);
    }

    return result;
};

const calcMetrics = (allocations) => {

    for (let alloc of allocations) {
        alloc.actualWork = sum(alloc.items, i => i.work).toFixed(1);
        alloc.diffPct = (100 * (alloc.participant.expectedWork - alloc.actualWork) / alloc.participant.expectedWork).toFixed(2);
        alloc.diff = (alloc.participant.expectedWork - alloc.actualWork).toFixed(1);
        alloc.weight = sum(alloc.items, i => i.weight).toFixed(1);

        
    }
};

const sortItems = (allocations) => {

    for (let alloc of allocations) {
        sort(alloc.items, (item) => -item.durationDays)
    }
};

const getEquipmentCount = (items) => {
    return items.filter(i => i.type == 'Equipment').length;
}

const run = () => {
    let allocations = allocate(example);

    calcMetrics(allocations);
    sortItems(allocations);

    allocations.map(a => ({
        name: a.participant.name,
        items: JSON.stringify(a.items.map(i => i.key)),
        expectedWork: a.participant.expectedWork.toFixed(1),
        actualWork: a.actualWork,
        diff: `${a.diff} (${a.diffPct} %)`,
        weight: a.weight,
    })).forEach(a => console.table(a));
};

run();
