const onEdit = (e) => {
    if (e.range.getA1Notation() == 'B2') {
      switch (e.value) {
        case 'Распределить': {
          runAllocation();
          break;
        }
        case 'Добавить участника': {
          addRowToTable('Участник', ['Новый участник', 1, '']);
          break;
        }
        case 'Добавить снаряжение': {
          addRowToTable('Снаряжение', ['Новое снаряжение', getDurationDays(), '']);
          break;
        }
        case 'Добавить еду': {
          addRowToTable('Еда', ['Новая еда', 0, '', consumptionType.Fixed]);
          break;
        }
      }
      e.range.clearContent();
    }
  };
  
  const runAllocation = () => {
  
    let hikeData = readHikeData();
    let allocations = allocate(hikeData);
  
    calcMetrics(allocations);
    sortItems(allocations);
  
    displayAllocations(allocations, hikeData.durationDays);
  
    Browser.msgBox('Распределение завершено. Результат на вкладке "Распределение"');
  };
  
  const readHikeData = () => {
  
    let participants = readTableFromSpreadSheet('Участник').map(row => ({
      name: row[0],
      carryingCoefficient: parseFloat(row[1]),
      fixedItems: (row[2] && row[2].split(',')) || []
    }));
    let itemsEquipment = readTableFromSpreadSheet('Снаряжение').map(row => ({
      name: row[0],
      type: itemType.Equipment,
      consumptionType: consumptionType.Fixed,
      carryDays: parseInt(row[1]),
      weight: parseFloat(row[2])
    }));
    let itemsFood = readTableFromSpreadSheet('Еда').map(row => ({
      name: row[0],
      type: itemType.Food,
      consumptionType: row[3],
      carryDays: parseInt(row[1]),
      weight: parseFloat(row[2])
    }));
  
    return {
      durationDays: getDurationDays(),
      participants: participants,
      items: itemsEquipment.concat(itemsFood)
    };
  };
  
  const readTableFromSpreadSheet = (tableName) => {
  
    let sheet = SpreadsheetApp.getActive().getSheetByName('Предметы');
    let isTargetTable = false;
    let data = [];
  
    for (let row of sheet.getDataRange().getValues()) {
      let value = row[0];
  
      if (!value && isTargetTable) {
        return data;
      }
  
      if (value == tableName) {
        isTargetTable = true;
        continue;
      }
  
      if (isTargetTable) {
        data.push(row);
      }
    }
  
    return data;
  };
  
  const addRowToTable = (tableName, values) => {
  
    let sheet = SpreadsheetApp.getActive().getSheetByName('Предметы');
    let isTargetTable = false;
    let index = 0;
  
    for (let row of sheet.getDataRange().getValues()) {
      let value = row[0];
  
      if (!value && isTargetTable) {
        let sourceRange = sheet.getRange(`A${index + 0}:${addToLetter('A', values.length - 1)}${index + 0}`);
        let targetRange = sheet.getRange(`A${index + 1}:${addToLetter('A', values.length - 1)}${index + 1}`);
  
        sheet.insertRowsAfter(index + 1, 1);
        sourceRange.copyTo(targetRange);
  
        targetRange.setValues([values]);
  
        return;
      }
  
      index++;
  
      if (!value) {
        continue;
      }
  
      if (value == tableName) {
        isTargetTable = true;
        continue;
      }
    }
  };
  
  const getDurationDays = () => {
  
    let sheet = SpreadsheetApp.getActive().getSheetByName('Предметы');
  
    return parseInt(sheet.getRange(5, 2).getValue());
  };
  
  const displayAllocations = (allocations, days) => {
  
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