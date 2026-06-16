const readline = require('readline');

// Minimal dependency-free checkbox prompt: arrows move, space toggles, enter confirms.
function checkbox(message, items) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('checkbox prompt requires an interactive TTY'));
      return;
    }

    const state = items.map(item => ({ ...item, checked: false }));
    let cursor = 0;
    let rendered = 0;

    function render() {
      if (rendered > 0) {
        readline.moveCursor(process.stdout, 0, -rendered);
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);
      }
      const lines = [message];
      state.forEach((item, i) => {
        const box = item.checked ? '[x]' : '[ ]';
        const pointer = i === cursor ? '>' : ' ';
        lines.push(`${pointer} ${box} ${item.label}`);
      });
      lines.push('(space: toggle, a: toggle all, enter: confirm, ctrl+c: cancel)');
      process.stdout.write(lines.join('\n') + '\n');
      rendered = lines.length;
    }

    readline.emitKeypressEvents(process.stdin);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();

    function cleanup() {
      process.stdin.setRawMode(wasRaw);
      process.stdin.removeListener('keypress', onKeypress);
      process.stdin.pause();
    }

    function onKeypress(str, key) {
      if (key.name === 'up') {
        cursor = (cursor - 1 + state.length) % state.length;
        render();
      } else if (key.name === 'down') {
        cursor = (cursor + 1) % state.length;
        render();
      } else if (str === ' ') {
        state[cursor].checked = !state[cursor].checked;
        render();
      } else if (str === 'a') {
        const allChecked = state.every(item => item.checked);
        state.forEach(item => { item.checked = !allChecked; });
        render();
      } else if (key.name === 'return') {
        cleanup();
        process.stdout.write('\n');
        resolve(state.filter(item => item.checked).map(item => item.value));
      } else if (key.name === 'c' && key.ctrl) {
        cleanup();
        process.stdout.write('\n');
        reject(new Error('cancelled'));
      }
    }

    process.stdin.on('keypress', onKeypress);
    render();
  });
}

module.exports = { checkbox };
