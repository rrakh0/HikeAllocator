const runAllocation = () => {

    let hikeData = readDataFromSpreadSheet();
    let allocations = allocate(hikeData);

    calcMetrics(allocations);
    sortItems(allocations);

    displayAllocationsOnSpreadSheet(allocations, hikeData.durationDays);

    Browser.msgBox('Распределение завершено. Результат на вкладке "Распределение"');
};

const readDataFromSpreadSheet = () => {

    let sheet = SpreadsheetApp.getActive().getSheetByName('Предметы');

    let hikeData = {
        participants: [],
        items: []
    };
    let dataType = '';

    for (let row of sheet.getDataRange().getValues()) {

        if (!row[0]) {
            continue;
        }

        if (row[0] == 'Количество дней') {
            hikeData.durationDays = row[1];
            continue;
        }

        if (row[0] == 'Участник') {
            dataType = 'Particpant';
            continue;
        }

        if (row[0] == 'Предмет') {
            dataType = 'Item';
            continue;
        }

        if (dataType == 'Particpant') {
            hikeData.participants.push({
                name: row[0],
                carryingCoefficient: parseFloat(row[1]),
                fixedItems: (row[2] && row[2].split(',')) || []
            });
        }

        if (dataType == 'Item') {
            let item = {
                name: row[0],
                type: row[1],
                consumptionType: row[2],
                carryDays: parseInt(row[3]),
                weight: parseFloat(row[4])
            };

            hikeData.items.push(item);
        }
    }

    return hikeData;
};

const displayAllocationsOnSpreadSheet = (allocations, days) => {

    let sheet = SpreadsheetApp.getActive().getSheetByName('Распределение');
    let index = 1;
    let start = {
        col: 'A',
        row: 2
    };
    let header = [];

    sheet.clear();
    sheet.clearFormats();

    header.push(...[
        'Участник',
        'Снаряжение',
        'Общ. продукт'
    ]);
    for (let i = 0; i < days; i++) header.push('День ' + (i + 1));
    header.push(...[
        'Вес (кг)',
        'Работа (кг*дн)',
        'Дифф'
    ]);

    let range = getRange(sheet, start, 0, header.length - 1);
    range.setValues([header]);
    range.setBorder(true, true, true, true, true, true);
    range.setBackground('#d3d3d3');
    range.setFontFamily('Calibri');
    range.setFontWeight('bold');
    sheet.setColumnWidths(letterToColumn(start.col) + 0, header.length, 100);
    sheet.setColumnWidth(letterToColumn(start.col) + 0, 180);
    sheet.setColumnWidth(letterToColumn(start.col) + 1, 120);
    sheet.setColumnWidth(letterToColumn(start.col) + days + 3, 70);

    let participantsRange = sheet.getRange(`${start.col}${start.row + 1}:${start.col}${start.row + allocations.length}`);
    participantsRange.setBackground('#dddddd');
    participantsRange.setFontWeight('bold');

    for (let a of allocations) {

        let row = [];

        row.push(a.participant.name);
        row.push(getItemsDisplay(a.items.filter(i => i.type == itemType.Equipment)));
        row.push(getItemsDisplay(a.items.filter(i => i.consumptionType == consumptionType.Linear)));

        for (let i = 0; i < days; i++) {
            row.push(getItemsDisplay(a.items.filter(t => isDailyFoodItem(t) && getConsumptionDay(t) == (i + 1))));
        }

        row.push(a.weight);
        row.push(a.actualWork);
        row.push(`${a.diff} (${a.diffPct} %)`);

        let range = getRange(sheet, start, index, row.length - 1);
        range.setValues([row]);
        range.setBorder(true, true, true, true, true, true);
        range.setVerticalAlignment('middle');
        range.setFontFamily('Calibri');
        sheet.setRowHeight(start.row + index, Math.min(31, a.items.length * 21) + 10);

        index++;
    }
};

const getRange = (sheet, start, index, length) => {

    let range = sheet.getRange(`${start.col}${start.row + index}:${addToLetter(start.col, length)}${start.row + index}`);
    return range;
};

const columnToLetter = (column) => {
    var temp, letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
};

const letterToColumn = (letter) => {
    var column = 0, length = letter.length;
    for (var i = 0; i < length; i++) {
        column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return column;
};

const addToLetter = (letter, cols) => {

    return columnToLetter(letterToColumn(letter) + cols);
};