let hikeData = require('./examples/02.example.json');
let { sum, copy, deepCopy, sort } = require('./utils.js')();

const allocate = ({ participants, items }) => {

    prepareData({ participants, items });

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

const sortItems = (allocations) => {

    allocations.forEach(a => {
        sort(a.items, (item) => -item.carryDays)
    })
};

const getEquipmentCount = (items) => {

    return items.filter(i => i.type == 'Equipment').length;
};

const getItemDisplayName = (item) => {

    let suffix = isDailyFoodItem(item) ? ' ' + (item.consumptionDay ?? item.carryDays) : '';

    return `${item.name}${suffix}(${item.weight})`;
}

const getItemsDisplay = (items) => {

    return items.map(i => getItemDisplayName(i)).join('; ');
}

const isDailyFoodItem = (item) => {

    return item.type == 'Food' && item.consumptionType == 'Fixed';
}

const convertToTable = (allocations, days) => {

    let table = {};

    table['Header'] = ['Снаряж', 'Общ. продукт'];
    let header = table['Header'];

    for (let i = 0; i < days; i++) header.push('День ' + (i + 1));
    header.push('Вес');
    header.push('Работа');
    header.push('Дифф');

    for (let a of allocations) {

        table[a.participant.name] = [];
        let row = table[a.participant.name];

        row.push(getItemsDisplay(a.items.filter(i => i.type == 'Equipment')));
        row.push(getItemsDisplay(a.items.filter(i => i.consumptionType == 'Linear')));

        for (let i = 0; i < days; i++) {
            row.push(getItemsDisplay(a.items.filter(t => isDailyFoodItem(t) && (t.consumptionDay || t.carryDays) == (i + 1))));
        }

        row.push(a.weight);
        row.push(a.actualWork);
        row.push(`${a.diff} (${a.diffPct} %)`);
    }

    return table;
};

const run = () => {
    let allocations = allocate(hikeData);

    calcMetrics(allocations);
    sortItems(allocations);

    allocations.map(a => ({
        name: a.participant.name,
        items: JSON.stringify(a.items.map(i => getItemDisplayName(i))),
        expectedWork: a.participant.expectedWork.toFixed(1),
        actualWork: a.actualWork,
        diff: `${a.diff} (${a.diffPct} %)`,
        weight: a.weight,
    })).forEach(a => console.table(a));

    console.table(convertToTable(allocations, hikeData.durationDays));
};

run();
