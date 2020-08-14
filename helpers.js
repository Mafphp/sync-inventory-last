function generateCode4CharAZ(element) {
    if (!element) return 'AAAA';
    const listAZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
    let found = false;
    for (const item of listAZ) {
      for (const item2 of listAZ) {
        for (const item3 of listAZ) {
          for (const item4 of listAZ) {
            const current = item + item2 + item3 + item4;
            if (found)
              return current;
            if(element === current)
              found = true;
          }
        }
      }
    }
    return ('AAAA');
}

module.exports = {
  generateCode4CharAZ,
};
