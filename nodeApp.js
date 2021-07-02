let hikeData = require('./examples/04.example.json');
let { allocate, calcMetrics, isDailyFoodItem, getConsumptionDay } = require('./core/allocator.js')();
let { sort } = require('./core/utils.js')();

const runAllocation = () => {
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
            row.push(getItemsDisplay(a.items.filter(t => isDailyFoodItem(t) && (getConsumptionDay(t)) == (i + 1))));
        }

        row.push(a.weight);
        row.push(a.actualWork);
        row.push(`${a.diff} (${a.diffPct} %)`);
    }

    return table;
};

const getItemDisplayName = (item) => {

    let suffix = isDailyFoodItem(item) ? ' ' + getConsumptionDay(item) : '';

    return `${item.name}${suffix} (${item.weight})`;
}

const getItemsDisplay = (items) => {

    sort(items, (i) => i.weight);

    return items.map(i => getItemDisplayName(i)).join('\n');
}

const sortItems = (allocations) => {

    allocations.forEach(a => {
        sort(a.items, (item) => -item.carryDays)
    })
};

runAllocation();
