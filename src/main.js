const logger = {
  verbose: true, // enable for debug logs

  init() {
    this.console = document.getElementById('console');
  },
  info(msg) {
    this.log('[+]', `${msg}`, 'info');
  },
  error(msg) {
    this.log('[-]', `${msg}`, 'error');
  },
  debug(msg) {
    if (this.verbose) this.log('[*]', `${msg}`, 'debug');
  },
  log(prefix, msg, type = 'info') {
    if (!this.console) return;

    let line = document.createElement('div');
    if (type === 'error') {
      line.className = 'log-error';
    } else if (type === 'info') {
      line.className = 'log-info';
    } else {
      line.className = 'log-info';
      line.style.opacity = '0.75';
    }
    line.textContent = `${prefix} ${String(msg)}`;
    this.console.appendChild(line);

    // Keep internal scroll at bottom without moving parent window scroll position
    const prevWindowY = window.pageYOffset || document.documentElement.scrollTop || 0;
    this.console.scrollTop = this.console.scrollHeight;
    if ((window.pageYOffset || document.documentElement.scrollTop || 0) !== prevWindowY) {
      window.scrollTo(0, prevWindowY);
    }
  },
};

window.onerror = function (message, source, line, column, error) {
  let msg = message;

  if (error && error.stack) {
    msg += `\n${error.stack}`;
  } else {
    msg += `\n@${source}:${line}:${column}`;
  }

  logger.error(msg);
  return true;
};

window.onunhandledrejection = function (event) {
  const err = event.reason;

  let msg = err && err.message ? err.message : String(err);

  if (err && err.stack) {
    msg += `\n${err.stack}`;
  }

  logger.error(msg);
};

function load_script(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
}

async function load_file(src) {
  const res = await fetch(src);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${src}`);
  }

  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function main() {
  if (window._exploitRunning) return;
  window._exploitRunning = true;

  try {
    await load_script('src/misc.js');

    version.init();

    switch (version.console) {
      case 4:
        await load_script('src/ps4/impl.js');
        break;
      case 5:
        await load_script('src/ps5/impl.js');
        break;
      default:
        throw new Error(`Unsupported console ${version.console}`);
    }

    await load_script('src/userland.js');
    await userland_main();

    await load_script('src/kernel.js');
    await kernel_main();
  } catch (err) {
    window._exploitRunning = false;
    throw err;
  }
}

logger.init();
window.runExploit = main;
window.logger = logger;
